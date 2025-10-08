const dataStore = require('./dataStore');

class Monitoring {
    constructor() {
        this.metrics = new Map();
        this.startTime = new Map();
    }

    recordTunnelStart(tunnelId) {
        this.startTime.set(tunnelId, Date.now());
        
        if (!this.metrics.has(tunnelId)) {
            this.metrics.set(tunnelId, {
                requests: 0,
                bandwidth: 0,
                uptime: 0,
                errors: 0,
                lastRequest: null
            });
        }
    }

    recordTunnelStop(tunnelId) {
        const start = this.startTime.get(tunnelId);
        if (start) {
            const uptime = Date.now() - start;
            const metrics = this.metrics.get(tunnelId);
            if (metrics) {
                metrics.uptime += uptime;
            }
        }
        this.startTime.delete(tunnelId);
    }

    getUptime(tunnelId) {
        let totalUptime = 0;
        const metrics = this.metrics.get(tunnelId);
        
        if (metrics) {
            totalUptime = metrics.uptime;
        }

        const start = this.startTime.get(tunnelId);
        if (start) {
            totalUptime += Date.now() - start;
        }

        return totalUptime;
    }

    getUptimePercentage(tunnelId) {
        const tunnel = dataStore.getTunnel(tunnelId);
        if (!tunnel?.createdAt) return 0;

        const totalTime = Date.now() - new Date(tunnel.createdAt).getTime();
        const uptime = this.getUptime(tunnelId);

        return totalTime > 0 ? (uptime / totalTime) * 100 : 0;
    }

    getMetrics(tunnelId) {
        const metrics = this.metrics.get(tunnelId) || {
            requests: 0,
            bandwidth: 0,
            uptime: 0,
            errors: 0,
            lastRequest: null
        };

        return {
            ...metrics,
            uptime: this.getUptime(tunnelId),
            uptimePercentage: this.getUptimePercentage(tunnelId)
        };
    }

    getAllMetrics() {
        const allMetrics = {};
        for (const [tunnelId] of this.metrics) {
            allMetrics[tunnelId] = this.getMetrics(tunnelId);
        }
        return allMetrics;
    }
}

module.exports = new Monitoring();

