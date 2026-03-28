const { sequelize } = require('./backend/src/config/database');

async function checkChats() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const [results] = await sequelize.query("SELECT id, title, widget_id, status, created_at FROM chats ORDER BY created_at DESC LIMIT 5");
        console.log(JSON.stringify(results, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkChats();
