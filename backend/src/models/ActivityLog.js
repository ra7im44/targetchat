module.exports = (sequelize, DataTypes) => {
    const ActivityLog = sequelize.define('ActivityLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
        action: {
            type: DataTypes.STRING,
            allowNull: false
        },
        entityType: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'entity_type'
        },
        entityId: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'entity_id'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'ip_address'
        }
    }, {
        tableName: 'activity_logs',
        timestamps: true,
        underscored: true
    });

    return ActivityLog;
};
