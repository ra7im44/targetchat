const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config(); // Should pick up .env in backend root

const sequelize = new Sequelize(
    process.env.DB_NAME || 'targetchatv1',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: console.log
    }
);

const BlockedIP = sequelize.define('BlockedIP', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'ip_address' // Explicit field name match
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    blockedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'blocked_by'
    }
}, {
    tableName: 'blocked_ips',
    timestamps: true,
    underscored: true
});

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        await BlockedIP.sync({ alter: true });
        console.log('BlockedIP table synced');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
