const { Chat, Message } = require('./src/models');

async function checkChats() {
    try {
        const chats = await Chat.findAll({
            include: [{ model: Message, as: 'messages' }]
        });
        console.log('Total Chats:', chats.length);
        chats.forEach(c => {
            console.log(`Chat ID: ${c.id}, Title: ${c.title}, WidgetId: ${c.widgetId}, IsHuman: ${c.isHumanHandled}, Messages: ${c.messages.length}`);
            c.messages.forEach(m => console.log(` - [${m.sender}] ${m.text}`));
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

checkChats();
