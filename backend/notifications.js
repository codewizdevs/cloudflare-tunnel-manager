const axios = require('axios');
const dataStore = require('./dataStore');

class Notifications {
    async sendDiscordNotification(message, color = 3447003) {
        try {
            const settings = dataStore.getSettings();
            if (!settings?.discordWebhook) return;

            await axios.post(settings.discordWebhook, {
                embeds: [{
                    title: message.title,
                    description: message.description,
                    color: color,
                    timestamp: new Date().toISOString(),
                    fields: message.fields || []
                }]
            });
        } catch (error) {
            console.error('Failed to send Discord notification:', error.message);
        }
    }

    async sendTunnelStopped(tunnel) {
        await this.sendDiscordNotification({
            title: '🛑 Tunnel Stopped',
            description: `Tunnel **${tunnel.name}** has been stopped`,
            fields: [
                { name: 'Hostname', value: tunnel.hostname, inline: true },
                { name: 'Environment', value: tunnel.environment || 'production', inline: true }
            ]
        }, 15158332); // Red color
    }

    async sendTunnelCrashed(tunnel) {
        await this.sendDiscordNotification({
            title: '💥 Tunnel Crashed',
            description: `Tunnel **${tunnel.name}** has crashed unexpectedly`,
            fields: [
                { name: 'Hostname', value: tunnel.hostname, inline: true },
                { name: 'Environment', value: tunnel.environment || 'production', inline: true },
                { name: 'Auto-Restart', value: tunnel.autoRestart ? 'Enabled' : 'Disabled', inline: true }
            ]
        }, 15158332); // Red color
    }

    async sendHealthCheckFailed(tunnel) {
        await this.sendDiscordNotification({
            title: '⚠️ Health Check Failed',
            description: `Health check failed for tunnel **${tunnel.name}**`,
            fields: [
                { name: 'Hostname', value: tunnel.hostname, inline: true },
                { name: 'Port', value: tunnel.port.toString(), inline: true },
                { name: 'Action', value: tunnel.autoRestart ? 'Auto-restarting' : 'No action', inline: true }
            ]
        }, 16776960); // Orange color
    }

    async sendTunnelStarted(tunnel) {
        await this.sendDiscordNotification({
            title: '✅ Tunnel Started',
            description: `Tunnel **${tunnel.name}** is now running`,
            fields: [
                { name: 'Hostname', value: tunnel.hostname, inline: true },
                { name: 'Port', value: tunnel.port.toString(), inline: true },
                { name: 'Environment', value: tunnel.environment || 'production', inline: true }
            ]
        }, 3066993); // Green color
    }
}

module.exports = new Notifications();

