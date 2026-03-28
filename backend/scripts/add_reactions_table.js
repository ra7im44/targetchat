require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create database connection
const sequelize = new Sequelize(
    process.env.DB_NAME || 'targetchat',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: console.log
    }
);

async function addReactionsTable() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Create reactions table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        user_id INT NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_reaction (message_id, user_id, emoji),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_message_id (message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log('✅ Reactions table created successfully');

        await sequelize.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addReactionsTable();
