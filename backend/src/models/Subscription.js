const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const Subscription = sequelize.define('Subscription', {
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
        planId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'plan_id'
        },
        stripeSubscriptionId: {
            type: DataTypes.STRING(255),
            field: 'stripe_subscription_id'
        },
        stripeCustomerId: {
            type: DataTypes.STRING(255),
            field: 'stripe_customer_id'
        },
        gateway: {
            type: DataTypes.ENUM('stripe', 'paypal'),
            defaultValue: 'stripe'
        },
        paypalSubscriptionId: {
            type: DataTypes.STRING(255),
            field: 'paypal_subscription_id'
        },
        status: {
            type: DataTypes.ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'),
            defaultValue: 'active'
        },
        currentPeriodStart: {
            type: DataTypes.DATE,
            field: 'current_period_start'
        },
        currentPeriodEnd: {
            type: DataTypes.DATE,
            field: 'current_period_end'
        },
        cancelAtPeriodEnd: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'cancel_at_period_end'
        },
        canceledAt: {
            type: DataTypes.DATE,
            field: 'canceled_at'
        },
        trialStart: {
            type: DataTypes.DATE,
            field: 'trial_start'
        },
        trialEnd: {
            type: DataTypes.DATE,
            field: 'trial_end'
        }
    }, {
        tableName: 'subscriptions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Instance methods
    Subscription.prototype.isActive = function () {
        return this.status === 'active' || this.status === 'trialing';
    };

    Subscription.prototype.isTrialing = function () {
        return this.status === 'trialing';
    };

    Subscription.prototype.isPastDue = function () {
        return this.status === 'past_due';
    };

    Subscription.prototype.isCanceled = function () {
        return this.status === 'canceled';
    };

    Subscription.prototype.daysUntilRenewal = function () {
        if (!this.currentPeriodEnd) return null;
        const now = new Date();
        const end = new Date(this.currentPeriodEnd);
        const diff = end - now;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    Subscription.prototype.daysInTrial = function () {
        if (!this.isTrialing() || !this.trialEnd) return 0;
        const now = new Date();
        const end = new Date(this.trialEnd);
        const diff = end - now;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return Subscription;
};
