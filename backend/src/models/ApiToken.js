module.exports = (sequelize, DataTypes) => {
    const ApiToken = sequelize.define('ApiToken', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tokenHash: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            field: 'token_hash'
        },
        tokenPrefix: {
            type: DataTypes.STRING(30), // Increased to 30 to hold "tc_live_..."
            allowNull: false,
            field: 'token_prefix'
        },
        permissions: {
            type: DataTypes.JSON, // ['read', 'write', 'admin']
            allowNull: true,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expires_at'
        },
        lastUsedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_used_at'
        }
    }, {
        tableName: 'api_tokens',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ApiToken;
};
