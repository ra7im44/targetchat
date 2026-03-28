const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatEvent = sequelize.define('ChatEvent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    chatId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'chats',
            key: 'id'
        },
        field: 'chat_id'
    },
    eventType: {
        type: DataTypes.ENUM(
            'chat_started',
            'lead_created',
            'routed_to_workflow',
            'routed_to_human',
            'human_joined',
            'human_left',
            'workflow_toggled',
            'chat_resolved',
            'chat_abandoned'
        ),
        allowNull: false,
        field: 'event_type'
    },
    eventData: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'event_data'
    },
    triggeredBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'triggered_by'
    }
}, {
    tableName: 'chat_events',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['chat_id', 'event_type']
        },
        {
            fields: ['event_type']
        },
        {
            fields: ['created_at']
        }
    ]
});

module.exports = ChatEvent;
