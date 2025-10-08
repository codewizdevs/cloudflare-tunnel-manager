const axios = require('axios');
const dataStore = require('./dataStore');

class HealthCheck {
    constructor() {
        this.intervals = new Map();
        this.stats = new Map();
    }

    startHealthCheck(tunnel, restartCallback) {
        if (!tunnel.healthCheck?.enabled) return;

        const interval = tunnel.healthCheck.interval || 30;
        const url = tunnel.healthCheck.url || '/';
        const fullUrl = `http://localhost:${tunnel.port}${url}`;

        console.log(`Starting health check for ${tunnel.name}: ${fullUrl} every ${interval}s`);

        const intervalId = setInterval(async () => {
            try {
                const response = await axios.get(fullUrl, {
                    timeout: 5000,
                    headers: {
                        'Host': tunnel.hostname
                    }
                });

                const isHealthy = response.status >= 200 && response.status < 500;
                
                // Update health status
                tunnel.stats.lastHealthCheck = new Date().toISOString();
                tunnel.stats.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
                dataStore.saveTunnel(tunnel);

                if (!isHealthy && tunnel.autoRestart) {
                    console.log(`Health check failed for ${tunnel.name}, auto-restarting...`);
                    await restartCallback(tunnel.id);
                }
            } catch (error) {
                console.error(`Health check failed for ${tunnel.name}:`, error.message);
                tunnel.stats.lastHealthCheck = new Date().toISOString();
                tunnel.stats.healthStatus = 'unhealthy';
                dataStore.saveTunnel(tunnel);

                if (tunnel.autoRestart && tunnel.status === 'running') {
                    console.log(`Service unreachable for ${tunnel.name}, auto-restarting...`);
                    await restartCallback(tunnel.id);
                }
            }
        }, interval * 1000);

        this.intervals.set(tunnel.id, intervalId);
    }

    stopHealthCheck(tunnelId) {
        const intervalId = this.intervals.get(tunnelId);
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(tunnelId);
            console.log(`Stopped health check for tunnel ${tunnelId}`);
        }
    }

    stopAll() {
        for (const [tunnelId, intervalId] of this.intervals) {
            clearInterval(intervalId);
        }
        this.intervals.clear();
    }
}

module.exports = new HealthCheck();

