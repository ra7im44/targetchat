const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const Invoice = sequelize.define('Invoice', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        subscriptionId: {
            type: DataTypes.UUID,
            field: 'subscription_id'
        },
        stripeInvoiceId: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'stripe_invoice_id'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'USD'
        },
        status: {
            type: DataTypes.ENUM('draft', 'open', 'paid', 'void', 'uncollectible'),
            defaultValue: 'open'
        },
        invoicePdf: {
            type: DataTypes.STRING(500),
            field: 'invoice_pdf'
        },
        hostedInvoiceUrl: {
            type: DataTypes.STRING(500),
            field: 'hosted_invoice_url'
        },
        paidAt: {
            type: DataTypes.DATE,
            field: 'paid_at'
        }
    }, {
        tableName: 'invoices',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Instance methods
    Invoice.prototype.isPaid = function () {
        return this.status === 'paid';
    };

    Invoice.prototype.isOpen = function () {
        return this.status === 'open';
    };

    Invoice.prototype.getFormattedAmount = function () {
        return `${this.currency} ${parseFloat(this.amount).toFixed(2)}`;
    };

    return Invoice;
};
