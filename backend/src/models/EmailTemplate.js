module.exports = (sequelize, DataTypes) => {
    const EmailTemplate = sequelize.define('EmailTemplate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Human-readable template name'
        },
        slug: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Unique identifier for programmatic use (e.g., "welcome", "password-reset")'
        },
        category: {
            type: DataTypes.ENUM('auth', 'billing', 'workflow', 'system', 'admin'),
            allowNull: false,
            comment: 'Template category for organization'
        },
        subject: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Email subject line (supports {{variables}})'
        },
        htmlBody: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'html_body',
            comment: 'HTML email body (supports {{variables}})'
        },
        textBody: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'text_body',
            comment: 'Plain text fallback (optional)'
        },
        variables: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
            comment: 'Array of available placeholders, e.g., ["username", "otp", "link"]'
        },
        language: {
            type: DataTypes.STRING(5),
            allowNull: false,
            defaultValue: 'en',
            comment: 'Template language code (en, ar, etc.)'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active',
            comment: 'Whether this template is active and can be used'
        }
    }, {
        tableName: 'email_templates',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['slug'] },
            { fields: ['category'] },
            { fields: ['is_active'] }
        ]
    });

    return EmailTemplate;
};

