module.exports = (sequelize, DataTypes) => {
    const EmailLog = sequelize.define('EmailLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        templateId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'template_id',
            references: {
                model: 'email_templates',
                key: 'id'
            },
            onDelete: 'SET NULL',
            comment: 'Reference to the template used (nullable if template deleted)'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'SET NULL',
            comment: 'Reference to the user if applicable'
        },
        recipientEmail: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'recipient_email',
            comment: 'Email address of the recipient'
        },
        subject: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Actual subject sent (after variable substitution)'
        },
        status: {
            type: DataTypes.ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'),
            allowNull: false,
            defaultValue: 'queued',
            comment: 'Current delivery status'
        },
        providerMessageId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'provider_message_id',
            comment: 'Message ID from email provider (SendGrid, SES, etc.)'
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'error_message',
            comment: 'Error details if status is "failed"'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Additional data: variables used, user_id, priority, etc.'
        },
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'sent_at',
            comment: 'When the email was sent to the provider'
        },
        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'delivered_at',
            comment: 'When the email was delivered (from webhook)'
        },
        openedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'opened_at',
            comment: 'When the email was first opened (from webhook)'
        }
    }, {
        tableName: 'email_logs',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { fields: ['recipient_email'] },
            { fields: ['status'] },
            { fields: ['created_at'] },
            { fields: ['template_id'] }
        ]
    });

    return EmailLog;
};
