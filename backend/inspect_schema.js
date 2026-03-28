const { sequelize } = require('./src/config/database');

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        const [results] = await sequelize.query("DESCRIBE chats");
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
