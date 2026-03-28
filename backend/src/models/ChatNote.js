const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatNote = sequelize.define('ChatNote', {
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
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'user_id'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'chat_notes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ChatNote;
