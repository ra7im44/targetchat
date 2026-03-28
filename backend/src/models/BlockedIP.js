module.exports = (sequelize, DataTypes) => {
    const BlockedIP = sequelize.define('BlockedIP', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isIP: true
            }
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: true
        },
        blockedBy: {
            type: DataTypes.INTEGER, // User ID reference
            allowNull: true
        }
    }, {
        tableName: 'blocked_ips',
        timestamps: true,
        underscored: true
    });

    return BlockedIP;
};
