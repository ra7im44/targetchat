module.exports = (sequelize, DataTypes) => {
    const UserPreference = sequelize.define('UserPreference', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        language: {
            type: DataTypes.STRING(10),
            defaultValue: 'en'
        },
        timezone: {
            type: DataTypes.STRING(50),
            defaultValue: 'UTC'
        },
        dateFormat: {
            type: DataTypes.STRING(20),
            defaultValue: 'MM/DD/YYYY',
            field: 'date_format'
        },
        timeFormat: {
            type: DataTypes.STRING(5),
            defaultValue: '12h',
            field: 'time_format'
        },
        theme: {
            type: DataTypes.ENUM('system', 'light', 'dark'),
            defaultValue: 'system'
        },
        accentColor: {
            type: DataTypes.STRING(7),
            defaultValue: '#3B82F6',
            field: 'accent_color'
        },
        fontSize: {
            type: DataTypes.ENUM('small', 'medium', 'large'),
            defaultValue: 'medium',
            field: 'font_size'
        }
    }, {
        tableName: 'user_preferences',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return UserPreference;
};
