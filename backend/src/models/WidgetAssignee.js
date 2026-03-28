const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WidgetAssignee = sequelize.define('WidgetAssignee', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    widgetId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'widget_id'
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
    isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_primary'
    },
    notificationEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'notification_enabled'
    }
}, {
    tableName: 'widget_assignees',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['widget_id', 'user_id']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['widget_id']
        }
    ]
});

module.exports = WidgetAssignee;
