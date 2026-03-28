const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Workspace = sequelize.define('Workspace', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    owner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    plan_type: {
        type: DataTypes.STRING(255),
        defaultValue: 'free'
    },
    max_members: {
        type: DataTypes.INTEGER,
        defaultValue: 5
    }
}, {
    tableName: 'workspaces',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
});

module.exports = Workspace;
