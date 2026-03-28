require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { DataTypes } = require('sequelize');

async function migrate() {
    console.log('🚀 Starting Advanced Billing Migrations...');
    const queryInterface = sequelize.getQueryInterface();

    try {
        // 1. Update subscription_plans table
        console.log('--- Updating subscription_plans ---');
        const planColumns = await queryInterface.describeTable('subscription_plans');

        if (!planColumns.paypal_plan_id_monthly) {
            await queryInterface.addColumn('subscription_plans', 'paypal_plan_id_monthly', {
                type: DataTypes.STRING(255),
                allowNull: true
            });
            console.log('✅ Added paypal_plan_id_monthly');
        }

        if (!planColumns.paypal_plan_id_yearly) {
            await queryInterface.addColumn('subscription_plans', 'paypal_plan_id_yearly', {
                type: DataTypes.STRING(255),
                allowNull: true
            });
            console.log('✅ Added paypal_plan_id_yearly');
        }

        if (!planColumns.max_widgets) {
            await queryInterface.addColumn('subscription_plans', 'max_widgets', {
                type: DataTypes.INTEGER,
                defaultValue: -1
            });
            console.log('✅ Added max_widgets');
        }

        if (!planColumns.max_members) {
            await queryInterface.addColumn('subscription_plans', 'max_members', {
                type: DataTypes.INTEGER,
                defaultValue: 1
            });
            console.log('✅ Added max_members');
        }

        // 2. Update subscriptions table
        console.log('--- Updating subscriptions ---');
        const subColumns = await queryInterface.describeTable('subscriptions');

        if (!subColumns.gateway) {
            await queryInterface.addColumn('subscriptions', 'gateway', {
                type: DataTypes.ENUM('stripe', 'paypal'),
                defaultValue: 'stripe'
            });
            console.log('✅ Added gateway to subscriptions');
        }

        if (!subColumns.paypal_subscription_id) {
            await queryInterface.addColumn('subscriptions', 'paypal_subscription_id', {
                type: DataTypes.STRING(255),
                allowNull: true
            });
            console.log('✅ Added paypal_subscription_id');
        }

        // 3. Create billing_logs table
        console.log('--- Creating billing_logs ---');
        await queryInterface.createTable('billing_logs', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            workspace_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            gateway: {
                type: DataTypes.ENUM('stripe', 'paypal', 'system', 'manual'),
                allowNull: false
            },
            event_type: {
                type: DataTypes.STRING(100),
                allowNull: false
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
            external_id: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            payload: {
                type: DataTypes.JSON,
                allowNull: true
            },
            error: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        });
        console.log('✅ Created billing_logs table');

        console.log('✨ All migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
