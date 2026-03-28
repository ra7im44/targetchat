class WebhookTracker {
    constructor() {
        this.logs = [];
        this.maxLogs = 20;
    }

    log(platform, body) {
        const entry = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            timestamp: new Date(),
            platform,
            body
        };

        this.logs.unshift(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }

        console.log(`📩 [WEBHOOK TRACKER] Logged ${platform} event`);
    }

    getLogs() {
        return this.logs;
    }

    clear() {
        this.logs = [];
    }
}

module.exports = new WebhookTracker();
