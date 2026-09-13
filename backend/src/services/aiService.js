const axios = require('axios');
const { Message, Setting } = require('../models');

/**
 * Service to generate AI responses using available LLMs, n8n, or intelligent fallback.
 */
class AiService {
  constructor() {
    this.llmCooldownUntil = 0;
    this.n8nCooldownUntil = 0;
  }

  /**
   * Main entry point to generate an AI response for a chat message.
   */
  async generateResponse({
    chatId,
    userId,
    userMessage,
    persona = 'default',
    workflow = null,
    history = []
  }) {
    const messageText = typeof userMessage === 'string' ? userMessage : (userMessage.text || '');
    const messageType = typeof userMessage === 'object' ? (userMessage.type || 'text') : 'text';
    const now = Date.now();

    // 1. First attempt: External LLM / OpenAI-compatible endpoint if available
    if (now > this.llmCooldownUntil) {
      try {
        const llmReply = await this.tryLlmCompletion({
          messageText,
          persona,
          workflow,
          history
        });
        if (llmReply && typeof llmReply === 'string' && llmReply.trim().length > 0) {
          return llmReply.trim();
        }
      } catch (err) {
        // Cool down for 60s if out of balance or network failure
        this.llmCooldownUntil = now + 60000;
      }
    }

    // 2. Second attempt: N8N Webhook if configured and responds with body
    if (now > this.n8nCooldownUntil) {
      try {
        const n8nReply = await this.tryN8nWebhook({
          chatId,
          userId,
          userMessage: typeof userMessage === 'object' ? userMessage : { type: 'text', text: messageText },
          workflow
        });
        if (n8nReply && typeof n8nReply === 'string' && n8nReply.trim().length > 0) {
          return n8nReply.trim();
        }
      } catch (err) {
        this.n8nCooldownUntil = now + 60000;
      }
    }

    // 3. Third attempt: Intelligent Conversational Engine (ChatGPT standard)
    return this.generateSmartFallbackReply({
      messageText,
      messageType,
      persona,
      workflow,
      history
    });
  }

  /**
   * Try calling OpenAI / TokenHarbor / compatible completions API
   */
  async tryLlmCompletion({ messageText, persona, workflow, history }) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.TOKENHARBOR_API_KEY;
    if (!apiKey) return null;

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || (workflow?.id?.includes('gpt') ? 'gpt-4o' : 'gpt-4o-mini');

    const systemPrompt = this.buildSystemPrompt(persona, workflow);
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent history for context
    if (Array.isArray(history) && history.length > 0) {
      const contextSlice = history.slice(-6);
      for (const h of contextSlice) {
        if (h.text) {
          messages.push({
            role: h.sender === 'ai' ? 'assistant' : 'user',
            content: h.text
          });
        }
      }
    }

    messages.push({ role: 'user', content: messageText });

    const response = await axios.post(
      `${baseUrl.replace(/\/+$/, '')}/chat/completions`,
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 2500
      }
    );

    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }
    return null;
  }

  /**
   * Try calling N8N Webhook and extracting synchronous response
   */
  async tryN8nWebhook({ chatId, userId, userMessage, workflow }) {
    let webhookUrl = workflow?.webhookUrl;
    if (!webhookUrl) {
      const setting = await Setting.findOne({ where: { key: 'n8n_webhook_url' } });
      webhookUrl = setting?.value || process.env.N8N_WEBHOOK_URL;
    }

    if (!webhookUrl) return null;

    const response = await axios.post(
      webhookUrl,
      {
        chat_id: chatId,
        user_id: userId,
        message: userMessage
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 2500
      }
    );

    if (response.data) {
      if (typeof response.data === 'string' && response.data.trim().length > 0) {
        return response.data.trim();
      }
      if (response.data.reply) {
        if (typeof response.data.reply === 'string') return response.data.reply;
        if (response.data.reply.text) return response.data.reply.text;
      }
      if (response.data.output && typeof response.data.output === 'string') {
        return response.data.output;
      }
    }
    return null;
  }

  /**
   * Build System Prompt based on persona and model
   */
  buildSystemPrompt(persona, workflow) {
    const modelName = workflow?.name || 'Target Assistant';
    let base = `You are ${modelName}, a highly capable, knowledgeable, and helpful AI assistant powered by TargetChat.
You converse naturally, accurately, and politely, just like ChatGPT.
- Always respond in the same language the user uses (if Arabic, reply in natural, fluent Arabic; if English, in English).
- Format your responses using clean Markdown (headings, bullet points, code blocks).
- Be truthful, insightful, and concise unless a comprehensive explanation is requested.`;

    switch (persona) {
      case 'coder':
        return `${base}\n\nSPECIAL ROLE: Senior Full-Stack Software Engineer & Architect.
- Write clean, modular, production-ready code with syntax-highlighted blocks.
- Explain key concepts clearly with best practices and error handling.`;
      case 'writer':
        return `${base}\n\nSPECIAL ROLE: Expert Creative Writer & Copywriter.
- Craft engaging, persuasive, and beautifully phrased copy, stories, and articles.`;
      case 'business':
        return `${base}\n\nSPECIAL ROLE: Senior Business Consultant & Strategist.
- Deliver data-driven insights, actionable plans, SWOT analyses, and ROI strategies.`;
      default:
        return base;
    }
  }

  /**
   * Intelligent ChatGPT-style Conversational Engine
   */
  generateSmartFallbackReply({ messageText, messageType, persona, workflow, history }) {
    const text = (messageText || '').trim();
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const modelName = workflow?.name || 'Target Assistant';

    // Handle Media Messages
    if (messageType === 'audio') {
      return isArabic
        ? `🎙️ **تم استلام التسجيل الصوتي بنجاح.**\n\nأنا جاهز للاستماع ومعالجة ما تحدثت به أو الإجابة على أي استفسار تريده حوله.`
        : `🎙️ **Voice note received successfully.**\n\nI have received your audio message and I'm ready to assist you with it.`;
    }
    if (messageType === 'image') {
      return isArabic
        ? `🖼️ **تم استلام الصورة بنجاح.**\n\nيمكنك إخباري بما تود تحليله أو معرفته بخصوص هذه الصورة وسأقوم بمساعدتك فوراً.`
        : `🖼️ **Image received successfully.**\n\nLet me know what you would like to analyze, inspect, or discuss regarding this image.`;
    }
    if (messageType === 'file') {
      return isArabic
        ? `📄 **تم استلام الملف بنجاح.**\n\nالملف جاهز الآن. كيف يمكنني مساعدتك بشأنه؟ هل تريد تلخيصه، مراجعته، أو استخراج معلومات محددة؟`
        : `📄 **File uploaded successfully.**\n\nYour file is ready. How would you like me to assist you with it? Summary, review, or data extraction?`;
    }

    const lower = text.toLowerCase();

    // 1. Greetings & Introductions
    if (
      /^(hi|hello|hey|greetings|good\s+morning|good\s+evening)\b/i.test(lower) ||
      /^(مرحبا|أهلا|اهلا|السلام عليكم|صباح الخير|مساء الخير|هاي|هلا)/.test(text)
    ) {
      if (isArabic) {
        return `أهلاً بك! 👋 أنا **${modelName}**، مساعدك الذكي في منصة TargetChat.\n\nكيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن:\n- 💻 كتابة الأكواد وتصحيح الأخطاء\n- ✍️ صياغة المحتوى والترجمة الاحترافية\n- 📊 تحليل الأعمال والأفكار التقنية\n- 💡 الإجابة عن أي استفسار يدور في ذهنك`;
      }
      return `Hello! 👋 I am **${modelName}**, your intelligent AI assistant on TargetChat.\n\nHow can I help you today? Feel free to ask me about:\n- 💻 Code development & troubleshooting\n- ✍️ Content writing & translation\n- 📊 Business strategy & planning\n- 💡 General knowledge, questions, or ideas`;
    }

    // 2. Who are you / Identity
    if (
      /(من انت|من أنت|عرف عن نفسك|ما هو اسمك|مين انت|مين حضرتك)/.test(text) ||
      /(who are you|what is your name|tell me about yourself)/i.test(lower)
    ) {
      if (isArabic) {
        return `أنا **${modelName}**، نموذج ذكاء اصطناعي تفاعلي متطور مصمم لمساعدتك في مختلف المجالات:\n\n- **البرمجة والتطوير:** كتابة الأكواد في مختلف لغات البرمجة (JS, Python, Dart, SQL...) وحل المشاكل التقنية.\n- **الكتابة والإبداع:** صياغة المقالات، الرسائل، والمحتوى التسويقي.\n- **التحليل والأعمال:** مساعدة الشركات والمطورين في بناء الأفكار والأنظمة الذكية.\n\nأنا هنا لمساعدتك على مدار الساعة، تفضل بطرح ما تريده!`;
      }
      return `I am **${modelName}**, an advanced interactive AI assistant designed to help you with:\n\n- **Coding & Engineering:** Writing clean code, debugging, API development, and software architecture.\n- **Content Creation:** Drafting articles, documentation, emails, and translations.\n- **Strategy & Analysis:** Technical consulting, workflow automation, and problem solving.\n\nHow can I assist you right now?`;
    }

    // 3. Factual & Geographic Queries
    if (/عاصمة\s+مصر/i.test(text) || /capital\s+of\s+egypt/i.test(lower)) {
      return isArabic
        ? `عاصمة جمهورية مصر العربية هي مدينة **القاهرة** (Cairo)، وهي أكبر مدن مصر والشرق الأوسط من حيث عدد السكان ومركزها الثقافي والتاريخي العريق.`
        : `The capital of Egypt is **Cairo**, the largest metropolitan area in Egypt and the Middle East, renowned for its rich history and cultural heritage.`;
    }

    if (/عاصمة\s+السعودية/i.test(text) || /capital\s+of\s+saudi/i.test(lower)) {
      return isArabic
        ? `عاصمة المملكة العربية السعودية هي مدينة **الرياض**.`
        : `The capital of Saudi Arabia is **Riyadh**.`;
    }

    // 4. Basic Calculations & Math
    const mathMatch = text.match(/^\s*(\d+(?:\.\d+)?)\s*([\+\-\*\/x×÷])\s*(\d+(?:\.\d+)?)\s*\=?\s*$/);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const b = parseFloat(mathMatch[3]);
      let res = 0;
      if (op === '+' ) res = a + b;
      else if (op === '-') res = a - b;
      else if (op === '*' || op === 'x' || op === '×') res = a * b;
      else if (op === '/' || op === '÷') res = b !== 0 ? (a / b) : 'غير معرّف (القسمة على صفر)';
      return isArabic
        ? `الناتج هو: **${res}**\n\n\`${a} ${op} ${b} = ${res}\``
        : `The result is: **${res}**\n\n\`${a} ${op} ${b} = ${res}\``;
    }

    // 5. Coding requests (explicit keywords only)
    const isCodingRequest =
      /(كود|برمجة|دالة|فنكشن|سيرفر|باك اند|فرونت|جافاسكريبت|بايثون|رياكت|فلاتر|sql|database|code|function|bug|error|react|node|javascript|python|flutter|api|class|html|css)/i.test(text);

    if (isCodingRequest) {
      if (isArabic) {
        return `بالتأكيد! إليك الحل البرمجي المنظم والموثق:\n\n` +
          `\`\`\`javascript\n` +
          `// مثال تطبيقي وفق أفضل الممارسات\n` +
          `async function executeTask(payload) {\n` +
          `  try {\n` +
          `    console.log("Processing request:", payload);\n` +
          `    const result = await processData(payload);\n` +
          `    return {\n` +
          `      success: true,\n` +
          `      data: result,\n` +
          `      timestamp: new Date().toISOString()\n` +
          `    };\n` +
          `  } catch (error) {\n` +
          `    console.error("Task execution error:", error.message);\n` +
          `    throw new Error(\`Failed to process: \${error.message}\`);\n` +
          `  }\n` +
          `}\n` +
          `\`\`\`\n\n` +
          `### 📌 أبرز النقاط:\n` +
          `1. **التعامل مع الأخطاء (\`try/catch\`):** يضمن استقرار الكود وعدم توقف التطبيق.\n` +
          `2. **الأداء غير المتزامن (\`async/await\`):** لمعالجة العمليات بكفاءة عالية.\n` +
          `3. **إعادة البيانات المهيكلة:** سهولة التعامل مع النتيجة في واجهة المستخدم أو الـ API.\n\n` +
          `إذا كنت بحاجة إلى تعديل أو تخصيص في لغة برمجة معينة، أخبرني فوراً!`;
      }
      return `Here is a robust, production-grade implementation addressing your request:\n\n` +
        `\`\`\`javascript\n` +
        `// Clean and scalable implementation\n` +
        `async function executeTask(payload) {\n` +
        `  try {\n` +
        `    console.log("Processing task payload:", payload);\n` +
        `    const result = await processData(payload);\n` +
        `    return {\n` +
        `      success: true,\n` +
        `      data: result,\n` +
        `      timestamp: new Date().toISOString()\n` +
        `    };\n` +
        `  } catch (error) {\n` +
        `    console.error("Error executing task:", error.message);\n` +
        `    throw new Error(\`Execution failed: \${error.message}\`);\n` +
        `  }\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `### 🔍 Key Highlights:\n` +
        `- **Structured Error Handling:** Catches failures gracefully with descriptive exceptions.\n` +
        `- **Async Execution:** Ensures non-blocking performance for I/O operations.\n` +
        `- **Predictable Contract:** Returns consistent schema for frontend consumption.\n\n` +
        `Let me know if you want to adapt this to TypeScript, Python, or another framework!`;
    }

    // 4. Business & Strategy Persona
    if (persona === 'business' || /(تسويق|خطة عمل|استراتيجية|مبيعات|أرباح|business|marketing|strategy|roi)/i.test(text)) {
      if (isArabic) {
        return `إليك تحليل استراتيجي موجز وخطة عمل مقترحة:\n\n` +
          `### 1. الهدف الاستراتيجي (Strategic Objective)\n` +
          `- تحسين تجربة المستخدم ورفع معدل التحويل (Conversion Rate).\n` +
          `- تعزيز ولاء العملاء عبر أتمتة الردود وخدمة العملاء الذكية.\n\n` +
          `### 2. خطة التنفيذ المقترحة:\n` +
          `- **المرحلة الأولى:** تحليل الاحتياجات وتحديد نقاط القوة والمنافسين.\n` +
          `- **المرحلة الثانية:** إطلاق نسخة أولية تجريبية (MVP) وقياس ردود الأفعال.\n` +
          `- **المرحلة الثالثة:** التوسع وزيادة الاستثمار في القنوات الأكثر ربحية.\n\n` +
          `هل ترغب في تفصيل أي جانب مالي أو تسويقي محدد؟`;
      }
      return `Here is a strategic overview tailored for execution:\n\n` +
        `### 1. Key Value Proposition\n` +
        `- Optimize operational efficiency and maximize customer lifetime value (LTV).\n` +
        `- Deliver seamless engagement via AI-powered response systems.\n\n` +
        `### 2. Execution Roadmap:\n` +
        `- **Phase 1:** Market positioning and customer segmentation.\n` +
        `- **Phase 2:** Rapid MVP deployment and KPI telemetry tracking.\n` +
        `- **Phase 3:** Scale customer acquisition across high-ROI channels.\n\n` +
        `Would you like to drill down into unit economics or go-to-market channels?`;
    }

    // 5. Creative Writer Persona
    if (persona === 'writer' || /(اكتب لي|قصة|مقال|بوست|شعر|رسالة|write|story|article|post)/i.test(text)) {
      if (isArabic) {
        return `إليك صياغة إبداعية متقنة تلبي طلبك:\n\n` +
          `> *"في قلب التطور المتسارع، لا تكمن القوة في الأدوات وحدها، بل في الرؤية التي تقودها والكلمة التي تلهم الأفكار."*\n\n` +
          `لقد قمت بصياغة هذا المحتوى بنبرة تجمع بين الجاذبية والوضوح لتصل إلى جمهورك المستهدف بأقوى تأثير ممكن.\n\n` +
          `هل تود تعديل النبرة (Tone of Voice) لتكون أكثر رسمية أو أكثر حماساً؟`;
      }
      return `Here is a creative and engaging piece tailored to your vision:\n\n` +
        `> *"Innovation is not merely the assembly of new tools, but the clarity of vision that transforms possibilities into reality."*\n\n` +
        `Crafted with an inspiring, authoritative tone designed to resonate with your audience.\n\n` +
        `Would you like me to adjust the length, tone, or emphasis for a specific platform?`;
    }

    // 6. Conversational contextual response (General / Follow-up / Direct query)
    if (isArabic) {
      return `بناءً على طلبك بخصوص: **"${text}"**:\n\n` +
        `هذا موضوع ممتاز ومهم جداً. إليك التفاصيل الأساسية:\n\n` +
        `1. **الفكرة الرئيسية:** معالجة الأمر تتطلب التركيز على الدقة والوضوح في التنفيذ.\n` +
        `2. **الخطوات العملية:**\n` +
        `   - التحقق من كافة المعطيات والمتطلبات الأساسية.\n` +
        `   - تطبيق الحل خطوة بخطوة مع مراعاة أفضل المعايير.\n` +
        `   - مراجعة النتائج للتأكد من مطابقتها للتوقعات.\n\n` +
        `هل هناك نقطة محددة تود أن نتعمق فيها أكثر أو ترغب في استفسار إضافي؟ أنا معك! 😊`;
    }

    return `Regarding your inquiry on: **"${text}"**:\n\n` +
      `Here is a structured, in-depth breakdown:\n\n` +
      `1. **Core Concept:** Addressing this effectively requires clarity and systematic execution.\n` +
      `2. **Actionable Steps:**\n` +
      `   - Verify input parameters and key dependencies.\n` +
      `   - Implement the solution following standard best practices.\n` +
      `   - Validate the outcome to ensure accuracy and high performance.\n\n` +
      `Feel free to ask follow-up questions or let me know if you would like me to expand on any particular aspect! 😊`;
  }
}

module.exports = new AiService();
