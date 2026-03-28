module.exports = (sequelize, DataTypes) => {
    const BillingEvent = sequelize.define('BillingEvent', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        eventType: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'event_type'
        },
        stripeEventId: {
            type: DataTypes.STRING(255),
            unique: true,
            field: 'stripe_event_id'
        },
        userId: {
            type: DataTypes.INTEGER,
            field: 'user_id'
        },
        payload: {
            type: DataTypes.JSON
        },
        processed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        processedAt: {
            type: DataTypes.DATE,
            field: 'processed_at'
        }
    }, {
        tableName: 'billing_events',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    // Instance methods
    BillingEvent.prototype.markAsProcessed = async function () {
        this.processed = true;
        this.processedAt = new Date();
        await this.save();
    };

    // Class methods
    BillingEvent.isEventProcessed = async function (stripeEventId) {
        const event = await this.findOne({
            where: { stripeEventId }
        });
        return event !== null && event.processed;
    };

    return BillingEvent;
};
