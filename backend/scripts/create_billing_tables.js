const { Sequelize } = require('sequelize');
require('dotenv').config({ path: __dirname + '/../.env' });

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: console.log
    }
);

async function createBillingTables() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database\n');

        // 1. Create subscription_plans table
        console.log('Creating subscription_plans table...');
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        stripe_price_id_monthly VARCHAR(255),
        stripe_price_id_yearly VARCHAR(255),
        price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_yearly DECIMAL(10,2),
        features JSON,
        max_chats INT DEFAULT -1 COMMENT '-1 means unlimited',
        max_messages_per_month INT DEFAULT -1 COMMENT '-1 means unlimited',
        trial_days INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('✅ subscription_plans table created\n');

        // 2. Create subscriptions table
        console.log('Creating subscriptions table...');
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id VARCHAR(36) NOT NULL,
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        status ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid') DEFAULT 'active',
        current_period_start DATETIME,
        current_period_end DATETIME,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        canceled_at DATETIME,
        trial_start DATETIME,
        trial_end DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
        INDEX idx_user (user_id),
        INDEX idx_status (status),
        INDEX idx_stripe_sub (stripe_subscription_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('✅ subscriptions table created\n');

        // 3. Create invoices table
        console.log('Creating invoices table...');
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        subscription_id VARCHAR(36),
        stripe_invoice_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status ENUM('draft', 'open', 'paid', 'void', 'uncollectible') DEFAULT 'open',
        invoice_pdf VARCHAR(500),
        hosted_invoice_url VARCHAR(500),
        paid_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_stripe_invoice (stripe_invoice_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('✅ invoices table created\n');

        // 4. Create billing_events table
        console.log('Creating billing_events table...');
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS billing_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        stripe_event_id VARCHAR(255) UNIQUE,
        user_id INT,
        payload JSON,
        processed BOOLEAN DEFAULT FALSE,
        processed_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_event_type (event_type),
        INDEX idx_stripe_event (stripe_event_id),
        INDEX idx_processed (processed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('✅ billing_events table created\n');

        // Verify all tables
        console.log('Verifying tables...');
        const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'subscription%' OR SHOW TABLES LIKE 'invoices' OR SHOW TABLES LIKE 'billing_events';
    `);

        console.log('\n✅ All billing tables created successfully!');
        console.log('\nCreated tables:');
        console.log('  - subscription_plans');
        console.log('  - subscriptions');
        console.log('  - invoices');
        console.log('  - billing_events');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

createBillingTables();
