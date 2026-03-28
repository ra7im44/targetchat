require('dotenv').config({ path: 'backend/.env' });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'targetchatv1',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'root',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false
    }
);

async function addInvitationTemplate() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        const template = {
            name: 'Workspace Invitation',
            slug: 'workspace-invitation',
            category: 'system',
            subject: 'You have been invited to join {{workspaceName}} on TargetChat',
            htmlBody: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb;">TargetChat</h1>
    </div>
    
    <div style="color: #333; line-height: 1.6;">
        <p>Hello,</p>
        
        <p><strong>{{inviterName}}</strong> has invited you to join the workspace <strong>{{workspaceName}}</strong> as a <strong>{{role}}</strong>.</p>
        
        <p>Click the button below to accept the invitation and join the team:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Accept Invitation</a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="{{link}}" style="color: #2563eb;">{{link}}</a>
        </p>
        
        <p>This invitation will expire in 7 days.</p>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
        <p>&copy; ${new Date().getFullYear()} TargetChat. All rights reserved.</p>
    </div>
</div>
            `,
            textBody: `
Hello,

{{inviterName}} has invited you to join the workspace {{workspaceName}} as a {{role}}.

Click the link below to accept the invitation:
{{link}}

This invitation will expire in 7 days.

TargetChat Team
            `,
            variables: JSON.stringify(['inviterName', 'workspaceName', 'link', 'role']),
            language: 'en',
            isActive: true
        };

        // Check if exists
        const [existing] = await sequelize.query("SELECT id FROM email_templates WHERE slug = 'workspace-invitation'");

        if (existing.length > 0) {
            console.log('⚠️ Template already exists, updating...');
            await sequelize.query(`
                UPDATE email_templates SET 
                name = ?, subject = ?, html_body = ?, text_body = ?, variables = ?
                WHERE slug = 'workspace-invitation'
            `, {
                replacements: [template.name, template.subject, template.htmlBody, template.textBody, template.variables]
            });
        } else {
            console.log('📝 Creating new template...');
            await sequelize.query(`
                INSERT INTO email_templates 
                (name, slug, category, subject, html_body, text_body, variables, language, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, {
                replacements: [
                    template.name, template.slug, template.category, template.subject,
                    template.htmlBody, template.textBody, template.variables,
                    template.language, template.isActive
                ]
            });
        }

        console.log('✅ Invitation template added successfully');
        await sequelize.close();

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

addInvitationTemplate();
