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
            // HORIZONTAL SCALING: the socket.io Redis adapter is now wired
            // (backend/src/utils/socketRedis.js, verified cross-worker in
            // testing), so cluster mode is SAFE for real-time delivery as long
            // as SOCKETIO_REDIS_ADAPTER is enabled (default in production) and
            // REDIS_HOST/PORT/PASSWORD point at a reachable Redis.
            // Enable with e.g. PM2_INSTANCES=2 (or 'max').
            //
            // STILL PER-PROCESS by design (acceptable, documented):
            //  - express-rate-limit counters: per-worker (effective limit is
            //    N× the configured value — tighten if you raise instances)
            //  - webhookTracker stats: per-worker (admin dashboards undercount)
            //  - ipBlocker cache: per-worker but DB-refreshed (correct, just
            //    N× DB reads)
            //
            // Behind a load balancer with multiple app CONTAINERS, enable
            // sticky sessions (ip_hash / WL-Proxy-Affinity) for polling
            // transports; websocket-only clients do not need them.
            instances: parseInt(process.env.PM2_INSTANCES || '1', 10),
            exec_mode: parseInt(process.env.PM2_INSTANCES || '1', 10) > 1 ? 'cluster' : 'fork',
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
