module.exports = (sequelize, DataTypes) => {
    const EmailPreference = sequelize.define('EmailPreference', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            comment: 'User who owns these preferences'
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Email category: auth, billing, workflow, system, admin, marketing'
        },
        enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether user wants to receive emails from this category'
        }
    }, {
        tableName: 'email_preferences',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'category'],
                name: 'unique_user_category'
            },
            { fields: ['user_id'] }
        ]
    });

    return EmailPreference;
};
