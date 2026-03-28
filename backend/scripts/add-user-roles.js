require('dotenv').config();
const { sequelize } = require('../src/models');

async function addRoleColumns() {
  try {
    console.log('🔌 Connecting to MySQL database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    console.log('📝 Adding role columns to users table...');

    // Add role column (MySQL syntax)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER password;
      `);
      console.log('✅ Added role column');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('⏭️  role column already exists');
      } else {
        throw err;
      }
    }

    // Add is_active column
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN is_active BOOLEAN DEFAULT true AFTER role;
      `);
      console.log('✅ Added is_active column');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('⏭️  is_active column already exists');
      } else {
        throw err;
      }
    }

    // Add last_login column
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN last_login TIMESTAMP NULL AFTER is_active;
      `);
      console.log('✅ Added last_login column');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('⏭️  last_login column already exists');
      } else {
        throw err;
      }
    }

    // Create index for performance
    try {
      await sequelize.query(`
        CREATE INDEX idx_users_role ON users(role);
      `);
      console.log('✅ Created index on role column');
    } catch (err) {
      if (err.message.includes('Duplicate key')) {
        console.log('⏭️  Index already exists');
      } else {
        throw err;
      }
    }

    console.log('✅ Migration completed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during migration:', err.message);
    process.exit(1);
  }
}

addRoleColumns();
