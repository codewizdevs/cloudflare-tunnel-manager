const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
const TUNNELS_FILE = path.join(DATA_DIR, 'tunnels.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

class DataStore {
    constructor() {
        this.credentials = {};
        this.tunnels = [];
        this.settings = {};
    }

    init() {
        // Create data directory if it doesn't exist
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        // Load credentials
        if (fs.existsSync(CREDENTIALS_FILE)) {
            try {
                const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
                this.credentials = JSON.parse(data);
            } catch (error) {
                console.error('Error loading credentials:', error);
                this.credentials = {};
            }
        }

        // Load tunnels
        if (fs.existsSync(TUNNELS_FILE)) {
            try {
                const data = fs.readFileSync(TUNNELS_FILE, 'utf8');
                this.tunnels = JSON.parse(data);
            } catch (error) {
                console.error('Error loading tunnels:', error);
                this.tunnels = [];
            }
        }

        // Load settings
        if (fs.existsSync(SETTINGS_FILE)) {
            try {
                const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
                this.settings = JSON.parse(data);
            } catch (error) {
                console.error('Error loading settings:', error);
                this.settings = {};
            }
        }
    }

    // Credentials management
    getCredentials() {
        return this.credentials;
    }

    saveCredentials(credentials) {
        // Merge credentials, but allow null values to clear old credentials
        Object.keys(credentials).forEach(key => {
            if (credentials[key] === null) {
                delete this.credentials[key];
            } else {
                this.credentials[key] = credentials[key];
            }
        });
        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(this.credentials, null, 2));
        return this.credentials;
    }

    // Tunnel management
    getTunnels() {
        return this.tunnels;
    }

    getTunnel(id) {
        return this.tunnels.find(t => t.id === id);
    }

    saveTunnel(tunnel) {
        const index = this.tunnels.findIndex(t => t.id === tunnel.id);
        if (index !== -1) {
            this.tunnels[index] = tunnel;
        } else {
            this.tunnels.push(tunnel);
        }
        this._saveTunnels();
        return tunnel;
    }

    deleteTunnel(id) {
        this.tunnels = this.tunnels.filter(t => t.id !== id);
        this._saveTunnels();
    }

    _saveTunnels() {
        fs.writeFileSync(TUNNELS_FILE, JSON.stringify(this.tunnels, null, 2));
    }

    // Settings management
    getSettings() {
        return this.settings;
    }

    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
        return this.settings;
    }
}

module.exports = new DataStore();

