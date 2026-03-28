require('dotenv').config();
const { User } = require('./src/models');

async function checkUsers() {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'isVerified', 'role', 'lastIp', 'registrationIp']
        });
        console.log('--- User Status Report ---');
        console.table(users.map(u => u.toJSON()));
        process.exit(0);
    } catch (err) {
        console.error('Error checking users:', err);
        process.exit(1);
    }
}

checkUsers();
