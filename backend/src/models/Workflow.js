module.exports = (sequelize, DataTypes) => {
    const Workflow = sequelize.define('Workflow', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true, // Allow null for system workflows or existing ones
            references: {
                model: 'users',
                key: 'id'
            },
            field: 'user_id'
        },
        workspaceId: {
            type: DataTypes.INTEGER,
            allowNull: true, // Allow null for personal workflows
            references: {
                model: 'workspaces',
                key: 'id'
            },
            field: 'workspace_id'
        },
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_public'
        },
        webhookUrl: {
            type: DataTypes.STRING(500),
            allowNull: false,
            field: 'webhook_url'
        },
        icon: {
            type: DataTypes.STRING(10)
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'workflows',
        underscored: true,
        timestamps: true
    });

    return Workflow;
};
