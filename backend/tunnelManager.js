const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const dataStore = require('./dataStore');
const cloudflareApi = require('./cloudflareApi');
const healthCheck = require('./healthCheck');
const monitoring = require('./monitoring');
const notifications = require('./notifications');

const execAsync = promisify(exec);
const TUNNEL_PROCESSES = new Map();
const TUNNEL_LOGS = new Map();

class TunnelManager {
    constructor() {
        this.configDir = path.join(__dirname, '..', 'tunnel-configs');
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    // Initialize and check existing tunnel processes
    async init() {
        console.log('Checking for existing tunnel processes...');
        const tunnels = dataStore.getTunnels();
        
        for (const tunnel of tunnels) {
            if (tunnel.pid) {
                const isRunning = await this.isProcessRunning(tunnel.pid);
                if (isRunning) {
                    console.log(`Found running tunnel: ${tunnel.name} (PID: ${tunnel.pid})`);
                    tunnel.status = 'running';
                    // Note: We don't restore to TUNNEL_PROCESSES map because we don't have the process handle
                    // The tunnel is running but we can't control it from this session
                } else {
                    console.log(`Tunnel ${tunnel.name} was marked running but process ${tunnel.pid} not found`);
                    tunnel.status = 'stopped';
                    tunnel.pid = null;
                }
                dataStore.saveTunnel(tunnel);
            }
        }
        
        // Auto-start tunnels marked for startup
        console.log('Checking for auto-startup tunnels...');
        for (const tunnel of tunnels) {
            if (tunnel.autoStartup && tunnel.status !== 'running') {
                try {
                    console.log(`Auto-starting tunnel: ${tunnel.name}`);
                    await this.startTunnel(tunnel.id);
                } catch (error) {
                    console.error(`Failed to auto-start tunnel ${tunnel.name}:`, error.message);
                }
            }
        }
        
        console.log('Tunnel initialization complete');
    }

    async isProcessRunning(pid) {
        try {
            // On Linux, check if process exists by sending signal 0
            await execAsync(`kill -0 ${pid} 2>/dev/null`);
            return true;
        } catch (error) {
            return false;
        }
    }

    async createTunnel(data) {
        const { name, zoneId, port, hostname } = data;
        const id = this.generateId();

        // Validate required fields
        if (!name || !zoneId || !port || !hostname) {
            throw new Error('Missing required fields: name, zoneId, port, and hostname are all required');
        }

        // Validate hostname format (must be a full domain)
        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainPattern.test(hostname)) {
            throw new Error('Invalid hostname format. Must be a valid domain (e.g., app.example.com)');
        }

        if (!hostname.includes('.')) {
            throw new Error('Hostname must be a full domain (e.g., app.example.com), not just a subdomain');
        }

        try {
            // Create tunnel in Cloudflare
            const cfTunnel = await cloudflareApi.createTunnel(name);
            console.log('Cloudflare tunnel created:', cfTunnel.id);
            
            // The tunnel_secret is attached to cfTunnel from the API
            const tunnelSecret = cfTunnel.tunnel_secret;
            if (!tunnelSecret) {
                throw new Error('No tunnel secret returned from Cloudflare API');
            }
            console.log('Using tunnel secret for credentials');

            // Create DNS record (hostname is now required)
            await cloudflareApi.createDNSRecord(zoneId, cfTunnel.id, hostname);
            console.log('DNS record created for:', hostname);

            // Create tunnel configuration
            const tunnel = {
                id,
                name,
                zoneId,
                port,
                hostname,
                cloudflareId: cfTunnel.id,
                tunnelSecret: tunnelSecret, // Store the secret
                status: 'stopped',
                environment: data.environment || 'production',
                healthCheck: data.healthCheck || { enabled: false, interval: 30, url: '/' },
                autoRestart: data.autoRestart !== undefined ? data.autoRestart : true,
                autoStartup: data.autoStartup !== undefined ? data.autoStartup : false,
                services: data.services || [],
                createdAt: new Date().toISOString(),
                stats: {
                    uptime: 0,
                    lastStarted: null,
                    restartCount: 0,
                    lastHealthCheck: null,
                    healthStatus: 'unknown'
                }
            };

            // Create config file with credentials
            this.createConfigFile(tunnel);

            // Save to data store
            dataStore.saveTunnel(tunnel);

            console.log('Tunnel created successfully:', tunnel.id);
            return tunnel;
        } catch (error) {
            console.error('Failed to create tunnel:', error);
            throw new Error(`Failed to create tunnel: ${error.message}`);
        }
    }

    async updateTunnel(id, data) {
        const tunnel = dataStore.getTunnel(id);
        if (!tunnel) {
            throw new Error('Tunnel not found');
        }

        // Check if tunnel is actually running (not just database status)
        const isRunning = TUNNEL_PROCESSES.has(id) || (tunnel.pid && await this.isProcessRunning(tunnel.pid));
        
        console.log(`Updating tunnel ${tunnel.name}, currently running: ${isRunning}`);

        // Update tunnel data
        const updatedTunnel = {
            ...tunnel,
            ...data,
            id: tunnel.id, // Keep original ID
            cloudflareId: tunnel.cloudflareId, // Keep Cloudflare ID
            tunnelSecret: tunnel.tunnelSecret, // Keep tunnel secret
            updatedAt: new Date().toISOString()
        };

        // Update config file
        this.createConfigFile(updatedTunnel);

        // Save to data store
        dataStore.saveTunnel(updatedTunnel);

        // Restart tunnel if it was running - this ensures changes take effect
        if (isRunning) {
            console.log(`Restarting tunnel ${tunnel.name} to apply changes...`);
            await this.restartTunnel(id);
            console.log(`Tunnel ${tunnel.name} restarted with new configuration`);
        }

        return updatedTunnel;
    }

    async deleteTunnel(id) {
        const tunnel = dataStore.getTunnel(id);
        if (!tunnel) {
            throw new Error('Tunnel not found');
        }

        console.log(`Deleting tunnel: ${tunnel.name}`);

        // Step 1: Stop tunnel if running
        const isRunning = TUNNEL_PROCESSES.has(id) || (tunnel.pid && await this.isProcessRunning(tunnel.pid));
        if (isRunning) {
            console.log(`Stopping tunnel ${tunnel.name} before deletion...`);
            await this.stopTunnel(id);
        }

        // Step 2: Delete DNS record from Cloudflare if hostname exists
        if (tunnel.hostname && tunnel.zoneId) {
            try {
                await cloudflareApi.deleteDNSRecord(tunnel.zoneId, tunnel.hostname);
                console.log(`DNS record deleted for ${tunnel.hostname}`);
            } catch (error) {
                console.error('Error deleting DNS record:', error.message);
                // Continue with deletion even if DNS cleanup fails
            }
        }

        // Step 3: Delete tunnel from Cloudflare
        try {
            await cloudflareApi.deleteTunnel(tunnel.cloudflareId);
            console.log(`Cloudflare tunnel ${tunnel.cloudflareId} deleted`);
        } catch (error) {
            console.error('Error deleting tunnel from Cloudflare:', error.message);
            // Continue with deletion even if Cloudflare cleanup fails
        }

        // Step 4: Delete config files
        const configPath = path.join(this.configDir, `${id}.yml`);
        const credentialsPath = path.join(this.configDir, `${id}-credentials.json`);
        
        if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
            console.log(`Deleted config file: ${configPath}`);
        }
        
        if (fs.existsSync(credentialsPath)) {
            fs.unlinkSync(credentialsPath);
            console.log(`Deleted credentials file: ${credentialsPath}`);
        }

        // Step 5: Delete from data store
        dataStore.deleteTunnel(id);
        console.log(`Tunnel ${tunnel.name} completely removed`);
    }

    async startTunnel(id) {
        const tunnel = dataStore.getTunnel(id);
        if (!tunnel) {
            throw new Error('Tunnel not found');
        }

        if (TUNNEL_PROCESSES.has(id)) {
            throw new Error('Tunnel is already running');
        }

        try {
            const configPath = path.join(this.configDir, `${id}.yml`);
            
            // Initialize logs for this tunnel
            if (!TUNNEL_LOGS.has(id)) {
                TUNNEL_LOGS.set(id, []);
            }
            
            console.log(`Starting tunnel ${id} with config: ${configPath}`);
            console.log(`Tunnel details:`, tunnel);
            
            // Start cloudflared process
            const process = spawn('cloudflared', [
                'tunnel',
                '--config', configPath,
                'run',
                tunnel.cloudflareId
            ]);

            process.stdout.on('data', (data) => {
                const log = `${data}`.trim();
                console.log(`[Tunnel ${tunnel.name}] ${log}`);
                this.addLog(id, 'info', log);
            });

            process.stderr.on('data', (data) => {
                const log = `${data}`.trim();
                // Cloudflared writes most output to stderr, determine actual level
                const isError = log.includes(' ERR ') || log.includes('error') || log.includes('failed');
                const isWarning = log.includes(' WRN ');
                
                if (isError) {
                    console.error(`[Tunnel ${tunnel.name}] ❌ ${log}`);
                    this.addLog(id, 'error', log);
                } else if (isWarning) {
                    console.warn(`[Tunnel ${tunnel.name}] ⚠️  ${log}`);
                    this.addLog(id, 'warning', log);
                } else {
                    console.log(`[Tunnel ${tunnel.name}] ${log}`);
                    this.addLog(id, 'info', log);
                }
            });

            process.on('close', (code) => {
                const log = `Tunnel exited with code ${code}`;
                console.log(`[Tunnel ${tunnel.name}] ${log}`);
                this.addLog(id, 'info', log);
                TUNNEL_PROCESSES.delete(id);
                
                // Update status
                const t = dataStore.getTunnel(id);
                if (t) {
                    t.status = 'stopped';
                    dataStore.saveTunnel(t);
                }
            });

            TUNNEL_PROCESSES.set(id, process);

            // Update status
            tunnel.status = 'running';
            tunnel.pid = process.pid;
            tunnel.stats.lastStarted = new Date().toISOString();
            tunnel.stats.restartCount = (tunnel.stats.restartCount || 0) + 1;
            dataStore.saveTunnel(tunnel);

            // Start monitoring and health checks
            monitoring.recordTunnelStart(id);
            healthCheck.startHealthCheck(tunnel, (tunnelId) => this.restartTunnel(tunnelId));

            return { success: true, message: 'Tunnel started', pid: process.pid };
        } catch (error) {
            throw new Error(`Failed to start tunnel: ${error.message}`);
        }
    }

    async stopTunnel(id) {
        const tunnel = dataStore.getTunnel(id);
        if (!tunnel) {
            throw new Error('Tunnel not found');
        }

        const process = TUNNEL_PROCESSES.get(id);
        
        if (process) {
            // We have the process handle, use it
            process.kill();
            TUNNEL_PROCESSES.delete(id);
            console.log(`Stopped tunnel ${tunnel.name} via process handle`);
        } else if (tunnel.pid) {
            // No process handle, but we have a PID - try to kill it
            const isRunning = await this.isProcessRunning(tunnel.pid);
            if (isRunning) {
                try {
                    await execAsync(`kill ${tunnel.pid}`);
                    console.log(`Stopped tunnel ${tunnel.name} via PID ${tunnel.pid}`);
                } catch (error) {
                    console.error(`Failed to kill process ${tunnel.pid}:`, error.message);
                    throw new Error(`Failed to stop tunnel: ${error.message}`);
                }
            } else {
                console.log(`Tunnel ${tunnel.name} process ${tunnel.pid} not running`);
            }
        }

        tunnel.status = 'stopped';
        tunnel.pid = null;
        dataStore.saveTunnel(tunnel);

        // Stop monitoring and health checks
        monitoring.recordTunnelStop(id);
        healthCheck.stopHealthCheck(id);

        // Send notification
        await notifications.sendTunnelStopped(tunnel);

        return { success: true, message: 'Tunnel stopped' };
    }

    async restartTunnel(id) {
        await this.stopTunnel(id);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return await this.startTunnel(id);
    }

    async getTunnelStatus(id) {
        const tunnel = dataStore.getTunnel(id);
        if (!tunnel) {
            throw new Error('Tunnel not found');
        }

        // Check if process is actually running
        let isRunning = TUNNEL_PROCESSES.has(id);
        
        // If not in our map but has a PID, check if that process is running
        if (!isRunning && tunnel.pid) {
            isRunning = await this.isProcessRunning(tunnel.pid);
            if (!isRunning) {
                // Process died, update status
                tunnel.status = 'stopped';
                tunnel.pid = null;
                dataStore.saveTunnel(tunnel);
            }
        }
        
        return {
            id: tunnel.id,
            name: tunnel.name,
            status: isRunning ? 'running' : 'stopped',
            pid: tunnel.pid,
            port: tunnel.port,
            hostname: tunnel.hostname
        };
    }

    createConfigFile(tunnel) {
        let ingressRules = '';
        
        // Check if we have multiple services configured
        if (tunnel.services && tunnel.services.length > 0) {
            // Advanced routing with multiple services
            for (const service of tunnel.services) {
                if (service.path) {
                    // Path-based routing
                    ingressRules += `  - hostname: ${tunnel.hostname}\n`;
                    ingressRules += `    path: ${service.path}\n`;
                    ingressRules += `    service: http://localhost:${service.port}\n`;
                } else if (service.hostname) {
                    // Multiple hostname routing
                    ingressRules += `  - hostname: ${service.hostname}\n`;
                    ingressRules += `    service: http://localhost:${service.port}\n`;
                }
            }
        } else {
            // Simple single service routing
            ingressRules = `  - hostname: ${tunnel.hostname || '*'}\n    service: http://localhost:${tunnel.port}\n`;
        }
        
        const config = `tunnel: ${tunnel.cloudflareId}
credentials-file: ${path.join(this.configDir, `${tunnel.id}-credentials.json`)}

ingress:
${ingressRules}  - service: http_status:404
`;

        // Write config file
        const configPath = path.join(this.configDir, `${tunnel.id}.yml`);
        fs.writeFileSync(configPath, config);
        console.log(`Created config file: ${configPath}`);
        console.log(`Config content:\n${config}`);

        // Write credentials file in the correct format for cloudflared
        const credentialsPath = path.join(this.configDir, `${tunnel.id}-credentials.json`);
        const credentials = {
            AccountTag: dataStore.getCredentials().accountId,
            TunnelSecret: tunnel.tunnelSecret,
            TunnelID: tunnel.cloudflareId
        };
        fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
        console.log(`Created credentials file: ${credentialsPath}`);
        console.log(`Credentials structure:`, {
            AccountTag: credentials.AccountTag,
            TunnelID: credentials.TunnelID,
            TunnelSecret: credentials.TunnelSecret ? '***' + credentials.TunnelSecret.slice(-8) : 'MISSING'
        });
    }

    addLog(tunnelId, level, message) {
        if (!TUNNEL_LOGS.has(tunnelId)) {
            TUNNEL_LOGS.set(tunnelId, []);
        }
        const logs = TUNNEL_LOGS.get(tunnelId);
        logs.push({
            timestamp: new Date().toISOString(),
            level,
            message
        });
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.shift();
        }
    }

    getLogs(tunnelId) {
        return TUNNEL_LOGS.get(tunnelId) || [];
    }

    generateId() {
        return 'tunnel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

module.exports = new TunnelManager();

