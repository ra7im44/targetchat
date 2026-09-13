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
            // SECURITY/CORRECTNESS: the app keeps per-process state (socket.io
            // rooms, in-memory rate limiting, webhookTracker stats) and has no
            // Redis socket.io adapter. Cluster mode ('max') silently breaks
            // real-time: sockets land on one worker while io.emit() runs on
            // another, so widget/inbox users never receive events. Keep ONE
            // worker until a socket.io-redis-adapter is wired up. Scale
            // vertically (max_memory_restart) or behind multiple app
            // containers with sticky sessions + the adapter.
            instances: 1,
            exec_mode: 'fork',
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
