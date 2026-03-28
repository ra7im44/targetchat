const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const Widget = sequelize.define('Widget', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'user_id'
    },
    workspaceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'workspaces',
            key: 'id'
        },
        field: 'workspace_id'
    },
    workflowId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'workflows',
            key: 'id'
        },
        field: 'workflow_id'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'My Website Widget'
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    workflowStatus: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'workflow_status'
    },
    publicKey: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'public_key'
    },
    secretKey: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'secret_key'
    },
    theme: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            primaryColor: '#2563eb',
            position: 'bottom-right',
            logo: null,
            avatar: null
        }
    },
    triggers: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            autoOpen: false,
            autoOpenDelay: 5, // seconds
            showOnPages: ['*']
        }
    },
    settings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            welcomeMessage: 'Hello! How can I help you?',
            placeholder: 'Type your message...',
            showBranding: true
        }
    },
    formFields: {
        type: DataTypes.JSON,
        defaultValue: [],
        field: 'form_fields'
    },
    allowedDomains: {
        type: DataTypes.JSON,
        defaultValue: [],
        field: 'allowed_domains',
        allowNull: true,
        comment: 'List of domains allowed to embed this widget'
    }
}, {
    tableName: 'widgets',
    timestamps: true,
    underscored: true,
    hooks: {
        beforeValidate: (widget) => {
            if (!widget.slug) {
                widget.slug = crypto.randomBytes(4).toString('hex');
            }
            if (!widget.publicKey) {
                widget.publicKey = 'pk_' + crypto.randomBytes(16).toString('hex');
            }
            if (!widget.secretKey) {
                widget.secretKey = 'sk_' + crypto.randomBytes(32).toString('hex');
            }
        }
    }
});

module.exports = Widget;
