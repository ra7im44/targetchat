const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const BillingLog = sequelize.define('BillingLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'user_id'
        },
        workspaceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'workspace_id'
        },
        gateway: {
            type: DataTypes.ENUM('stripe', 'paypal', 'system', 'manual'),
            allowNull: false
        },
        eventType: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'event_type'
        },
        status: {
            type: DataTypes.ENUM('success', 'failed', 'pending', 'refunded'),
            defaultValue: 'success'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        currency: {
            type: DataTypes.STRING(10),
            defaultValue: 'USD'
        },
        externalId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'external_id',
            comment: 'Stripe/PayPal session or subscription ID'
        },
        payload: {
            type: DataTypes.JSON,
            allowNull: true
        },
        error: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        }
    }, {
        tableName: 'billing_logs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return BillingLog;
};
