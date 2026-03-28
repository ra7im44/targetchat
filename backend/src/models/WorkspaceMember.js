const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkspaceMember = sequelize.define('WorkspaceMember', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'workspaces',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    role: {
        type: DataTypes.ENUM('owner', 'manager', 'member'),
        defaultValue: 'member'
    },
    permissions: {
        type: DataTypes.JSON,
        allowNull: true
    },
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'workspace_members',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['workspace_id', 'user_id']
        }
    ]
});

module.exports = WorkspaceMember;
