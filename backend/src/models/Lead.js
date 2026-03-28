const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lead = sequelize.define('Lead', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    widgetId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'widget_id'
    },
    metaId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'meta_id'
    },
    whatsappId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'whatsapp_id'
    },
    ownerUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'owner_user_id'
    },
    // Lead Information
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    company: {
        type: DataTypes.STRING,
        allowNull: true
    },
    customField: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'custom_field'
    },
    // Status & Tracking
    status: {
        type: DataTypes.ENUM('new', 'contacted', 'converted', 'lost'),
        defaultValue: 'new'
    },
    tags: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    customData: {
        type: DataTypes.JSON,
        defaultValue: {},
        field: 'custom_data'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Timestamps
    firstSeen: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'first_seen'
    },
    lastMessage: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_message'
    }
}, {
    tableName: 'leads',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['widget_id', 'owner_user_id']
        },
        {
            fields: ['email']
        },
        {
            fields: ['phone']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_at']
        }
    ]
});

module.exports = Lead;
