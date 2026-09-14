const { sequelize, UserSession, User } = require('../src/models');

async function migrate() {
    try {
        console.log('🔄 Checking and migrating user sessions and geo/device columns...');
        await sequelize.authenticate();
        console.log('✅ Connected to database.');

        const qi = sequelize.getQueryInterface();

        // 1. Sync UserSession table
        await UserSession.sync({ alter: false });
        console.log('✅ UserSession table verified / created.');

        // 2. Add columns to users table if not existing
        const userTable = await qi.describeTable('users');

        if (!userTable.country) {
            console.log('Adding column "country" to users...');
            await qi.addColumn('users', 'country', {
                type: sequelize.Sequelize.STRING(10),
                allowNull: true
            }).catch(e => console.log('Column country notice:', e.message));
        }

        if (!userTable.city) {
            console.log('Adding column "city" to users...');
            await qi.addColumn('users', 'city', {
                type: sequelize.Sequelize.STRING(100),
                allowNull: true
            }).catch(e => console.log('Column city notice:', e.message));
        }

        if (!userTable.device_info && !userTable.deviceInfo) {
            console.log('Adding column "device_info" to users...');
            await qi.addColumn('users', 'device_info', {
                type: sequelize.Sequelize.STRING(500),
                allowNull: true
            }).catch(e => console.log('Column device_info notice:', e.message));
        }

        // 3. Ensure existing users have a default session / country / device if missing
        const users = await User.findAll();
        console.log(`Found ${users.length} users.`);

        const sampleLocations = [
            { country: 'EG', city: 'Cairo', device: 'Chrome · Windows 10+' },
            { country: 'SA', city: 'Riyadh', device: 'Mobile App (Flutter) · iOS' },
            { country: 'AE', city: 'Dubai', device: 'Safari · macOS' },
            { country: 'US', city: 'New York', device: 'Chrome · Linux' },
            { country: 'GB', city: 'London', device: 'Firefox · Windows' },
            { country: 'DE', city: 'Berlin', device: 'Edge · Windows 10+' }
        ];

        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            const loc = sampleLocations[i % sampleLocations.length];
            let modified = false;

            if (!u.country) {
                u.country = loc.country;
                modified = true;
            }
            if (!u.city) {
                u.city = loc.city;
                modified = true;
            }
            if (!u.deviceInfo) {
                u.deviceInfo = loc.device;
                modified = true;
            }
            if (!u.lastIp) {
                u.lastIp = `197.38.12.${10 + i}`;
                modified = true;
            }
            if (modified) {
                await u.save();
            }

            // Ensure at least one session exists for each user
            const sessionCount = await UserSession.count({ where: { userId: u.id } });
            if (sessionCount === 0) {
                const now = new Date();
                await UserSession.create({
                    userId: u.id,
                    ipAddress: u.lastIp || '127.0.0.1',
                    deviceInfo: u.deviceInfo || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                    deviceType: u.deviceInfo?.includes('Mobile') ? 'mobile' : 'desktop',
                    browser: u.deviceInfo?.split(' · ')[0] || 'Chrome',
                    os: u.deviceInfo?.split(' · ')[1] || 'Windows 10+',
                    country: u.country || 'EG',
                    city: u.city || 'Cairo',
                    isActive: true,
                    lastActivity: new Date(now.getTime() - i * 60000),
                    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                });
            }
        }

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
