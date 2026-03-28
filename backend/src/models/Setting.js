module.exports = (sequelize, DataTypes) => {
    const Setting = sequelize.define('Setting', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        section: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'general'
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        type: {
            type: DataTypes.STRING(20),
            defaultValue: 'string' // string, boolean, number, json
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_public'
        }
    }, {
        tableName: 'settings',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return Setting;
};
