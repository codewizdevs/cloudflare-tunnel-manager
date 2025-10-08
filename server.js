const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const systemCheck = require('./backend/systemCheck');
const cloudflareApi = require('./backend/cloudflareApi');
const tunnelManager = require('./backend/tunnelManager');
const dataStore = require('./backend/dataStore');
const monitoring = require('./backend/monitoring');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'cloudflare-tunnel-manager-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
function requireAuth(req, res, next) {
    const settings = dataStore.getSettings();
    
    // If password protection is disabled, allow access
    if (!settings.passwordProtection?.enabled) {
        return next();
    }
    
    // Check if user is authenticated
    if (req.session.authenticated) {
        return next();
    }
    
    res.status(401).json({ error: 'Authentication required' });
}

app.use(express.static(path.join(__dirname, 'public')));

// Initialize data store
dataStore.init();

// Initialize tunnel manager and check for existing processes
(async () => {
    await tunnelManager.init();
})();

// API Routes

// System status
app.get('/api/system/status', requireAuth, async (req, res) => {
    try {
        const status = await systemCheck.checkRequirements();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Install cloudflared
app.post('/api/system/install', requireAuth, async (req, res) => {
    try {
        const result = await systemCheck.installCloudflared();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cloudflare credentials
app.get('/api/credentials', requireAuth, (req, res) => {
    try {
        const credentials = dataStore.getCredentials();
        res.json(credentials);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/credentials', requireAuth, (req, res) => {
    try {
        const credentials = req.body;
        dataStore.saveCredentials(credentials);
        res.json({ success: true, message: 'Credentials saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cloudflare authentication
app.post('/api/cloudflare/auth', requireAuth, async (req, res) => {
    try {
        const result = await cloudflareApi.authenticate(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tunnel management
app.get('/api/tunnels', requireAuth, (req, res) => {
    try {
        const tunnels = dataStore.getTunnels();
        res.json(tunnels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tunnels/:id', requireAuth, (req, res) => {
    try {
        const tunnel = dataStore.getTunnel(req.params.id);
        if (!tunnel) {
            return res.status(404).json({ error: 'Tunnel not found' });
        }
        res.json(tunnel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tunnels', requireAuth, async (req, res) => {
    try {
        const tunnel = await tunnelManager.createTunnel(req.body);
        res.json(tunnel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tunnels/:id', requireAuth, async (req, res) => {
    try {
        await tunnelManager.deleteTunnel(req.params.id);
        res.json({ success: true, message: 'Tunnel deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tunnel operations
app.post('/api/tunnels/:id/start', requireAuth, async (req, res) => {
    try {
        const result = await tunnelManager.startTunnel(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tunnels/:id/stop', requireAuth, async (req, res) => {
    try {
        const result = await tunnelManager.stopTunnel(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tunnels/:id/restart', requireAuth, async (req, res) => {
    try {
        const result = await tunnelManager.restartTunnel(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tunnels/:id/status', requireAuth, async (req, res) => {
    try {
        const status = await tunnelManager.getTunnelStatus(req.params.id);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tunnels/:id/logs', requireAuth, (req, res) => {
    try {
        const logs = tunnelManager.getLogs(req.params.id);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tunnels/:id/autostartup', requireAuth, (req, res) => {
    try {
        const tunnel = dataStore.getTunnel(req.params.id);
        if (!tunnel) {
            return res.status(404).json({ error: 'Tunnel not found' });
        }
        
        tunnel.autoStartup = req.body.enabled;
        dataStore.saveTunnel(tunnel);
        
        res.json({ success: true, autoStartup: tunnel.autoStartup });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tunnels/:id/environment', requireAuth, (req, res) => {
    try {
        const tunnel = dataStore.getTunnel(req.params.id);
        if (!tunnel) {
            return res.status(404).json({ error: 'Tunnel not found' });
        }
        
        const validEnvironments = ['production', 'staging', 'development'];
        if (!validEnvironments.includes(req.body.environment)) {
            return res.status(400).json({ error: 'Invalid environment' });
        }
        
        tunnel.environment = req.body.environment;
        dataStore.saveTunnel(tunnel);
        
        res.json({ success: true, environment: tunnel.environment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual DNS cleanup endpoint
app.post('/api/dns/cleanup', requireAuth, async (req, res) => {
    try {
        const { zoneId, hostname } = req.body;
        if (!zoneId || !hostname) {
            return res.status(400).json({ error: 'Zone ID and hostname are required' });
        }
        
        const result = await cloudflareApi.deleteDNSRecord(zoneId, hostname);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Settings endpoints
app.get('/api/settings', requireAuth, (req, res) => {
    try {
        const settings = dataStore.getSettings();
        // Don't send password hash to client
        const { passwordProtection, ...safeSettings } = settings;
        res.json({
            ...safeSettings,
            passwordProtection: { enabled: passwordProtection?.enabled || false }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings', requireAuth, (req, res) => {
    try {
        dataStore.saveSettings(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const settings = dataStore.getSettings();
    
    if (!settings.passwordProtection?.enabled) {
        req.session.authenticated = true;
        return res.json({ success: true });
    }
    
    if (password === settings.passwordProtection.password) {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/auth/status', (req, res) => {
    const settings = dataStore.getSettings();
    res.json({
        authenticated: req.session.authenticated || false,
        passwordProtectionEnabled: settings.passwordProtection?.enabled || false
    });
});

// Backup/Export/Import endpoints
app.get('/api/backup/export', requireAuth, (req, res) => {
    try {
        const data = {
            tunnels: dataStore.getTunnels(),
            settings: dataStore.getSettings(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=cloudflare-tunnels-backup.json');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/backup/import', requireAuth, async (req, res) => {
    try {
        const { tunnels, settings } = req.body;
        
        if (settings) {
            dataStore.saveSettings(settings);
        }
        
        if (tunnels && Array.isArray(tunnels)) {
            for (const tunnel of tunnels) {
                dataStore.saveTunnel(tunnel);
            }
        }
        
        res.json({ success: true, imported: { tunnels: tunnels?.length || 0 } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk operations
app.post('/api/tunnels/bulk/start', requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        const results = [];
        
        for (const id of ids) {
            try {
                await tunnelManager.startTunnel(id);
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }
        
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tunnels/bulk/stop', requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        const results = [];
        
        for (const id of ids) {
            try {
                await tunnelManager.stopTunnel(id);
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }
        
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tunnels/bulk/delete', requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        const results = [];
        
        for (const id of ids) {
            try {
                await tunnelManager.deleteTunnel(id);
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }
        
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Cloudflare Tunnel Manager running on http://localhost:${PORT}`);
});

