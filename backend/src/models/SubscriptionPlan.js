const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        stripePriceIdMonthly: {
            type: DataTypes.STRING(255),
            field: 'stripe_price_id_monthly'
        },
        stripePriceIdYearly: {
            type: DataTypes.STRING(255),
            field: 'stripe_price_id_yearly'
        },
        paypalPlanIdMonthly: {
            type: DataTypes.STRING(255),
            field: 'paypal_plan_id_monthly'
        },
        paypalPlanIdYearly: {
            type: DataTypes.STRING(255),
            field: 'paypal_plan_id_yearly'
        },
        priceMonthly: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'price_monthly'
        },
        priceYearly: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'price_yearly'
        },
        features: {
            type: DataTypes.JSON,
            defaultValue: {}
        },
        maxChats: {
            type: DataTypes.INTEGER,
            defaultValue: -1, // -1 = unlimited
            field: 'max_chats'
        },
        maxMessagesPerMonth: {
            type: DataTypes.INTEGER,
            defaultValue: -1, // -1 = unlimited
            field: 'max_messages_per_month'
        },
        maxWidgets: {
            type: DataTypes.INTEGER,
            defaultValue: -1,
            field: 'max_widgets'
        },
        maxMembers: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            field: 'max_members'
        },
        trialDays: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'trial_days'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'subscription_plans',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Instance methods
    SubscriptionPlan.prototype.getFeatures = function () {
        return this.features || {};
    };

    SubscriptionPlan.prototype.hasFeature = function (featureName) {
        const features = this.getFeatures();
        return features[featureName] === true;
    };

    SubscriptionPlan.prototype.canCreateChat = function (currentChatCount) {
        if (this.maxChats === -1) return true; // unlimited
        return currentChatCount < this.maxChats;
    };

    SubscriptionPlan.prototype.canSendMessage = function (currentMessageCount) {
        if (this.maxMessagesPerMonth === -1) return true;
        return currentMessageCount < this.maxMessagesPerMonth;
    };

    SubscriptionPlan.prototype.canCreateWidget = function (currentWidgetCount) {
        if (this.maxWidgets === -1) return true;
        return currentWidgetCount < this.maxWidgets;
    };

    SubscriptionPlan.prototype.canAddMember = function (currentMemberCount) {
        if (this.maxMembers === -1) return true;
        return currentMemberCount < this.maxMembers;
    };

    return SubscriptionPlan;
};
