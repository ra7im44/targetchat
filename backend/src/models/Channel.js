module.exports = (sequelize, DataTypes) => {
    const Channel = sequelize.define('Channel', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
        type: {
            type: DataTypes.ENUM('whatsapp', 'facebook', 'instagram'),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        externalId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            field: 'external_id'
        },
        accessToken: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'access_token'
        },
        mode: {
            type: DataTypes.ENUM('workflow', 'human'),
            defaultValue: 'workflow'
        },
        workflowUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'workflow_url'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        settings: {
            type: DataTypes.JSON,
            defaultValue: {}
        },
        lastActiveAt: {
            type: DataTypes.DATE,
            field: 'last_active_at'
        }
    }, {
        tableName: 'channels',
        timestamps: true,
        underscored: true
    });

    Channel.associate = (models) => {
        Channel.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return Channel;
};
