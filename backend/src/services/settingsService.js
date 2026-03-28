const { Setting } = require('../models');

class SettingsService {
    constructor() {
        this.cache = new Map();
        this.lastLoad = 0;
        this.TTL = 60 * 1000; // 1 minute cache
    }

    /**
     * Loads all settings from the database and populates the cache.
     */
    async loadAll() {
        try {
            const settings = await Setting.findAll();
            this.cache.clear();
            settings.forEach(s => {
                let value = s.value;
                if (s.type === 'number') value = Number(value);
                if (s.type === 'boolean') value = value === 'true' || value === '1';
                if (s.type === 'json' && value) {
                    try { value = JSON.parse(value); } catch (e) { value = {}; }
                }
                this.cache.set(s.key, value);
            });
            this.lastLoad = Date.now();
        } catch (err) {
            console.error('Failed to load settings from DB:', err.message);
        }
    }

    /**
     * Gets a setting value by key. Loads from DB if cache is expired.
     */
    async get(key, defaultValue = null) {
        if (Date.now() - this.lastLoad > this.TTL) {
            await this.loadAll();
        }
        return this.cache.has(key) ? this.cache.get(key) : (process.env[key] || defaultValue);
    }

    /**
     * Force refresh the cache.
     */
    async refresh() {
        await this.loadAll();
    }

    /**
     * Sets or updates a setting in the database.
     */
    async set(key, value, options = {}) {
        const { section = 'general', type = 'string', description = '', isPublic = false } = options;

        let stringValue = value;
        if (type === 'json') stringValue = JSON.stringify(value);
        if (type === 'boolean' || type === 'number') stringValue = String(value);

        await Setting.upsert({
            key,
            value: stringValue,
            section,
            type,
            description,
            isPublic
        });

        await this.refresh();
    }
}

module.exports = new SettingsService();
