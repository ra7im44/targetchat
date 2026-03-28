const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkspaceInvitation = sequelize.define('WorkspaceInvitation', {
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
    email: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('manager', 'member'),
        defaultValue: 'member'
    },
    token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    invited_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    accepted_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'workspace_invitations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
});

module.exports = WorkspaceInvitation;
