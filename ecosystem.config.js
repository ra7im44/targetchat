module.exports = {
    apps: [
        {
            name: 'targetchat-backend',
            cwd: './backend',
            script: 'npm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            instances: 'max',
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        },
        {
            name: 'targetchat-frontend',
            cwd: './frontend',
            script: 'npm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
