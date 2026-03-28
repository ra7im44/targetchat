module.exports = (sequelize, DataTypes) => {
    const Coupon = sequelize.define('Coupon', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            set(value) {
                this.setDataValue('code', value.toUpperCase());
            }
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        },
        discountType: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            defaultValue: 'percentage'
        },
        discountValue: {
            type: DataTypes.FLOAT, // e.g., 20 for 20% or 10 for $10
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING, // e.g., 'USD' - only relevant for fixed type
            defaultValue: 'USD'
        },
        maxRedemptions: {
            type: DataTypes.INTEGER,
            allowNull: true // null = unlimited
        },
        timesRedeemed: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'coupons',
        timestamps: true,
        underscored: true
    });

    return Coupon;
};
