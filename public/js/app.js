// App state
let tunnels = [];
let credentials = {};
let systemStatus = {};
let settings = {};
let selectedTunnels = new Set();
let currentEnvironmentFilter = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Apply dark mode first (before auth check)
    initDarkMode();
    
    // Check authentication first - this will determine if we show UI or login
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
        // Show only login screen, hide everything else
        // Dark mode is already applied
        return;
    }
    
    // User is authenticated, load the app
    await checkSystemStatus();
    await loadCredentials();
    await loadSettings();
    await loadTunnels();
    
    setupEventListeners();
});

// Authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/status');
        const status = await response.json();
        
        if (status.passwordProtectionEnabled && !status.authenticated) {
            // Hide main app, show login screen
            document.getElementById('mainApp').style.cssText = 'display: none !important;';
            document.getElementById('loginScreen').style.cssText = 'min-height: 100vh; display: flex !important;';
            
            // Setup login form handler
            document.getElementById('loginForm').addEventListener('submit', handleLogin);
            document.getElementById('loginSubmitBtn').addEventListener('click', handleLogin);
            
            return false; // Not authenticated
        } else {
            // Show main app, hide login screen
            document.getElementById('mainApp').style.cssText = '';
            document.getElementById('loginScreen').style.cssText = 'display: none !important;';
            document.getElementById('logoutBtn').style.display = status.passwordProtectionEnabled ? 'block' : 'none';
            
            return true; // Authenticated
        }
    } catch (error) {
        console.error('Auth check error:', error);
        // On error, show app (fail open for development)
        document.getElementById('mainApp').style.cssText = '';
        document.getElementById('loginScreen').style.cssText = 'display: none !important;';
        return true;
    }
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    
    const password = document.getElementById('loginPasswordInput').value;
    const btn = document.getElementById('loginSubmitBtn');
    const errorDiv = document.getElementById('loginError');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        if (response.ok) {
            // Login successful, reload page to show app
            location.reload();
        } else {
            // Show error
            errorDiv.textContent = 'Invalid password. Please try again.';
            errorDiv.style.display = 'block';
            document.getElementById('loginPasswordInput').value = '';
            document.getElementById('loginPasswordInput').focus();
        }
    } catch (error) {
        errorDiv.textContent = 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-lock-open"></i> Login';
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Dark Mode
function initDarkMode() {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
        enableDarkMode();
    }
}

function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

function enableDarkMode() {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
    document.getElementById('darkModeToggle').innerHTML = '<i class="ti ti-sun"></i>';
    localStorage.setItem('darkMode', 'true');
}

function disableDarkMode() {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.setAttribute('data-theme', 'light');
    document.getElementById('darkModeToggle').innerHTML = '<i class="ti ti-moon"></i>';
    localStorage.setItem('darkMode', 'false');
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('createTunnelBtn').addEventListener('click', openCreateTunnelModal);
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
    document.getElementById('saveTunnelBtn').addEventListener('click', saveTunnel);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('installBtn')?.addEventListener('click', installCloudflared);
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('exportBtn').addEventListener('click', exportConfig);
    document.getElementById('importBtn').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('importModal'));
        modal.show();
    });
    document.getElementById('importConfirmBtn').addEventListener('click', importConfig);
    document.getElementById('environmentFilter').addEventListener('change', (e) => {
        currentEnvironmentFilter = e.target.value;
        renderTunnels();
    });
    document.getElementById('bulkActionsBtn').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('bulkActionsModal'));
        document.getElementById('bulkSelectedCount').textContent = selectedTunnels.size;
        modal.show();
    });
    document.getElementById('bulkStartBtn').addEventListener('click', () => bulkAction('start'));
    document.getElementById('bulkStopBtn').addEventListener('click', () => bulkAction('stop'));
    document.getElementById('bulkDeleteBtn').addEventListener('click', () => bulkAction('delete'));
    
    // Health check toggle
    document.getElementById('tunnelHealthCheck').addEventListener('change', (e) => {
        document.getElementById('healthCheckOptions').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Password protection toggle
    document.getElementById('passwordProtectionEnabled')?.addEventListener('change', (e) => {
        document.getElementById('passwordFields').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Add service button
    document.getElementById('addServiceBtn')?.addEventListener('click', addServiceRow);
    
    // Auth method toggle
    document.getElementById('authMethod').addEventListener('change', (e) => {
        const tokenFields = document.getElementById('tokenFields');
        const keyFields = document.getElementById('keyFields');
        
        if (e.target.value === 'token') {
            tokenFields.classList.remove('d-none');
            keyFields.classList.add('d-none');
        } else {
            tokenFields.classList.add('d-none');
            keyFields.classList.remove('d-none');
        }
    });
}

// System status
async function checkSystemStatus() {
    try {
        const response = await fetch('/api/system/status');
        systemStatus = await response.json();
        
        const alert = document.getElementById('systemAlert');
        const message = document.getElementById('systemAlertMessage');
        
        if (!systemStatus.cloudflaredInstalled) {
            alert.classList.remove('d-none');
            
            if (systemStatus.canInstall) {
                message.textContent = 'Cloudflared is not installed. Click the button below to install it.';
            } else {
                message.textContent = 'Cloudflared is not installed. Please install it manually or run with sudo privileges.';
                document.getElementById('installBtn').disabled = true;
            }
        } else {
            alert.classList.add('d-none');
        }
    } catch (error) {
        console.error('Error checking system status:', error);
    }
}

async function installCloudflared() {
    const btn = document.getElementById('installBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Installing...';
    
    try {
        const response = await fetch('/api/system/install', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Cloudflared installed successfully', 'success');
            await checkSystemStatus();
        } else {
            showNotification('Error', result.message, 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Failed to install cloudflared', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Install Cloudflared';
    }
}

// Settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        settings = await response.json();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Credentials
async function loadCredentials() {
    try {
        const response = await fetch('/api/credentials');
        credentials = await response.json();
        
        const alert = document.getElementById('credentialsAlert');
        if (!credentials.apiToken && !credentials.apiKey) {
            alert.classList.remove('d-none');
        } else {
            alert.classList.add('d-none');
        }
    } catch (error) {
        console.error('Error loading credentials:', error);
    }
}

// Settings modal
function openSettingsModal() {
    // Populate form with existing credentials
    if (credentials.apiToken) {
        document.getElementById('authMethod').value = 'token';
        document.getElementById('apiToken').value = credentials.apiToken;
    } else if (credentials.apiKey) {
        document.getElementById('authMethod').value = 'key';
        document.getElementById('apiEmail').value = credentials.email || '';
        document.getElementById('apiKey').value = credentials.apiKey;
        document.getElementById('tokenFields').classList.add('d-none');
        document.getElementById('keyFields').classList.remove('d-none');
    }
    
    if (credentials.accountId) {
        document.getElementById('accountId').value = credentials.accountId;
    }
    
    // Populate notifications
    if (settings.discordWebhook) {
        document.getElementById('discordWebhook').value = settings.discordWebhook;
    }
    
    // Populate security settings
    if (settings.passwordProtection?.enabled) {
        document.getElementById('passwordProtectionEnabled').checked = true;
        document.getElementById('passwordFields').style.display = 'block';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
    modal.show();
}

async function saveSettings() {
    const btn = document.getElementById('saveSettingsBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    
    try {
        // Save Cloudflare credentials
        const authMethod = document.getElementById('authMethod').value;
        const accountId = document.getElementById('accountId').value;
        
        const credData = { 
            accountId,
            apiToken: null,
            apiKey: null,
            email: null
        };
        
        if (authMethod === 'token') {
            credData.apiToken = document.getElementById('apiToken').value;
        } else {
            credData.email = document.getElementById('apiEmail').value;
            credData.apiKey = document.getElementById('apiKey').value;
        }
        
        await fetch('/api/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credData)
        });
        
        // Save other settings
        const settingsData = {
            discordWebhook: document.getElementById('discordWebhook').value,
            passwordProtection: {
                enabled: document.getElementById('passwordProtectionEnabled').checked,
                password: document.getElementById('dashboardPassword').value || settings.passwordProtection?.password
            }
        };
        
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });
        
        showNotification('Success', 'Settings saved successfully', 'success');
        await loadSettings();
        bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
        
        // Reload if password protection was changed
        if (settingsData.passwordProtection.enabled) {
            setTimeout(() => location.reload(), 1000);
        }
    } catch (error) {
        showNotification('Error', 'Failed to save settings', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Save Settings';
    }
}

// Tunnels
async function loadTunnels() {
    try {
        const response = await fetch('/api/tunnels');
        
        // Check if unauthorized
        if (response.status === 401) {
            location.reload();
            return;
        }
        
        tunnels = await response.json();
        
        // Get real-time status for each tunnel
        for (const tunnel of tunnels) {
            try {
                const statusResponse = await fetch(`/api/tunnels/${tunnel.id}/status`);
                const status = await statusResponse.json();
                tunnel.status = status.status;
                tunnel.pid = status.pid;
            } catch (error) {
                console.error(`Error getting status for tunnel ${tunnel.id}:`, error);
            }
        }
        
        renderTunnels();
    } catch (error) {
        console.error('Error loading tunnels:', error);
    }
}

function renderTunnels() {
    const container = document.getElementById('tunnelsList');
    
    // Filter tunnels by environment
    let filteredTunnels = tunnels;
    if (currentEnvironmentFilter) {
        filteredTunnels = tunnels.filter(t => t.environment === currentEnvironmentFilter);
    }
    
    if (filteredTunnels.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="ti ti-cloud-off"></i>
                    </div>
                    <h3>No tunnels ${currentEnvironmentFilter ? 'in this environment' : 'yet'}</h3>
                    <p>${currentEnvironmentFilter ? 'Try a different environment filter' : 'Create your first Cloudflare tunnel to get started'}</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Environment badge colors
    const envColors = {
        production: 'bg-success',
        staging: 'bg-warning',
        development: 'bg-info'
    };
    
    container.innerHTML = filteredTunnels.map(tunnel => `
        <div class="col-md-6 col-lg-4">
            <div class="card tunnel-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h3 class="card-title mb-0">
                            <label class="form-check d-inline-flex align-items-center">
                                <input type="checkbox" class="form-check-input me-2" onchange="toggleTunnelSelection('${tunnel.id}', this.checked)" ${selectedTunnels.has(tunnel.id) ? 'checked' : ''}>
                                <i class="ti ti-cloud"></i>
                                ${tunnel.name}
                            </label>
                        </h3>
                        <div class="dropdown">
                            <button class="badge ${envColors[tunnel.environment || 'production']} dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                ${tunnel.environment || 'production'}
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="changeEnvironment('${tunnel.id}', 'production')">
                                    <span class="badge bg-success me-2">●</span> Production
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="changeEnvironment('${tunnel.id}', 'staging')">
                                    <span class="badge bg-warning me-2">●</span> Staging
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="changeEnvironment('${tunnel.id}', 'development')">
                                    <span class="badge bg-info me-2">●</span> Development
                                </a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="mb-2">
                        <span class="status-badge">
                            <span class="status-indicator ${tunnel.status}"></span>
                            <strong>${tunnel.status === 'running' ? 'Running' : 'Stopped'}</strong>
                        </span>
                        ${tunnel.autoStartup ? `
                            <span class="badge bg-azure ms-2" title="Auto-starts when app starts">
                                <i class="ti ti-rocket"></i> Auto-startup
                            </span>
                        ` : ''}
                        ${tunnel.healthCheck?.enabled ? `
                            <span class="badge ${tunnel.stats?.healthStatus === 'healthy' ? 'bg-success' : 'bg-danger'} ms-2">
                                ${tunnel.stats?.healthStatus || 'unknown'}
                            </span>
                        ` : ''}
                    </div>
                    <div class="text-muted small mb-3">
                        ${tunnel.services && tunnel.services.length > 0 ? `
                            <div><strong>Advanced Routing:</strong> ${tunnel.services.length} service(s)</div>
                            ${tunnel.services.map(s => `<div class="ms-3">↳ ${s.path} → :${s.port}</div>`).join('')}
                        ` : `
                            <div><strong>Port:</strong> ${tunnel.port}</div>
                        `}
                        ${tunnel.hostname ? `<div><strong>Hostname:</strong> ${tunnel.hostname}</div>` : ''}
                        ${tunnel.healthCheck?.enabled ? `<div><strong>Health Check:</strong> Every ${tunnel.healthCheck.interval}s</div>` : ''}
                        ${tunnel.autoRestart ? `<div><strong>Auto-restart:</strong> Enabled</div>` : ''}
                        <div>
                            <label class="form-check form-check-inline">
                                <input type="checkbox" class="form-check-input" ${tunnel.autoStartup ? 'checked' : ''} 
                                       onchange="toggleAutoStartup('${tunnel.id}', this.checked)">
                                <span class="form-check-label"><strong>Auto-startup</strong></span>
                            </label>
                        </div>
                    </div>
                    <div class="tunnel-actions">
                        ${tunnel.status === 'running' 
                            ? `<button class="btn btn-warning btn-sm" onclick="stopTunnel('${tunnel.id}')">
                                <i class="ti ti-player-stop"></i> Stop
                               </button>
                               <button class="btn btn-info btn-sm" onclick="restartTunnel('${tunnel.id}')">
                                <i class="ti ti-refresh"></i> Restart
                               </button>`
                            : `<button class="btn btn-success btn-sm" onclick="startTunnel('${tunnel.id}')">
                                <i class="ti ti-player-play"></i> Start
                               </button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="deleteTunnel('${tunnel.id}')">
                            <i class="ti ti-trash"></i> Delete
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="viewLogs('${tunnel.id}', '${tunnel.name}')">
                            <i class="ti ti-file-text"></i> Logs
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function openCreateTunnelModal() {
    document.getElementById('tunnelModalTitle').textContent = 'Create Tunnel';
    document.getElementById('tunnelForm').reset();
    document.getElementById('servicesContainer').innerHTML = '';
    
    const modal = new bootstrap.Modal(document.getElementById('tunnelModal'));
    modal.show();
}

let serviceCounter = 0;

function addServiceRow() {
    const container = document.getElementById('servicesContainer');
    const id = `service_${serviceCounter++}`;
    
    const serviceHtml = `
        <div class="card mb-2" id="${id}">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Path</label>
                        <input type="text" class="form-control service-path" placeholder="/api or /app" data-service-id="${id}">
                        <small class="form-hint">URL path to route (e.g., /api)</small>
                    </div>
                    <div class="col-md-5">
                        <label class="form-label">Port</label>
                        <input type="number" class="form-control service-port" placeholder="3000" data-service-id="${id}">
                    </div>
                    <div class="col-md-1 d-flex align-items-end">
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeServiceRow('${id}')">
                            <i class="ti ti-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', serviceHtml);
}

function removeServiceRow(id) {
    document.getElementById(id)?.remove();
}

function collectServices() {
    const services = [];
    const paths = document.querySelectorAll('.service-path');
    const ports = document.querySelectorAll('.service-port');
    
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i].value.trim();
        const port = parseInt(ports[i].value);
        
        if (path && port) {
            services.push({ path, port });
        }
    }
    
    return services;
}

async function saveTunnel() {
    const hostnameInput = document.getElementById('tunnelHostname');
    const hostname = hostnameInput.value.trim();
    
    // Validate hostname format
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!hostname) {
        showNotification('Error', 'Hostname is required', 'danger');
        hostnameInput.classList.add('is-invalid');
        return;
    }
    
    if (!domainPattern.test(hostname)) {
        showNotification('Error', 'Invalid hostname format. Use format like: subdomain.example.com', 'danger');
        hostnameInput.classList.add('is-invalid');
        return;
    }
    
    if (!hostname.includes('.')) {
        showNotification('Error', 'Please enter a full domain (e.g., app.example.com, not just "app")', 'danger');
        hostnameInput.classList.add('is-invalid');
        return;
    }
    
    hostnameInput.classList.remove('is-invalid');
    
    const healthCheckEnabled = document.getElementById('tunnelHealthCheck').checked;
    const services = collectServices();
    
    const data = {
        name: document.getElementById('tunnelName').value,
        zoneId: document.getElementById('tunnelZoneId').value,
        port: parseInt(document.getElementById('tunnelPort').value),
        hostname: hostname,
        environment: document.getElementById('tunnelEnvironment').value,
        autoRestart: document.getElementById('tunnelAutoRestart').checked,
        autoStartup: document.getElementById('tunnelAutoStartup').checked,
        services: services,
        healthCheck: {
            enabled: healthCheckEnabled,
            interval: healthCheckEnabled ? parseInt(document.getElementById('tunnelHealthInterval').value) : 30,
            url: healthCheckEnabled ? document.getElementById('tunnelHealthPath').value : '/'
        }
    };
    
    const btn = document.getElementById('saveTunnelBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Creating...';
    
    try {
        const response = await fetch('/api/tunnels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showNotification('Success', 'Tunnel created successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('tunnelModal')).hide();
            await loadTunnels();
        } else {
            const error = await response.json();
            showNotification('Error', error.error || 'Failed to create tunnel', 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Failed to create tunnel', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Create Tunnel';
    }
}

async function startTunnel(id) {
    try {
        const response = await fetch(`/api/tunnels/${id}/start`, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Tunnel started', 'success');
            await loadTunnels();
        } else {
            showNotification('Error', result.error || 'Failed to start tunnel', 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Failed to start tunnel', 'danger');
    }
}

async function stopTunnel(id) {
    try {
        const response = await fetch(`/api/tunnels/${id}/stop`, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Tunnel stopped', 'success');
            await loadTunnels();
        } else {
            showNotification('Error', result.error || 'Failed to stop tunnel', 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Failed to stop tunnel', 'danger');
    }
}

async function restartTunnel(id) {
    try {
        const response = await fetch(`/api/tunnels/${id}/restart`, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Tunnel restarted', 'success');
            await loadTunnels();
        } else {
            showNotification('Error', result.error || 'Failed to restart tunnel', 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Failed to restart tunnel', 'danger');
    }
}

async function deleteTunnel(id) {
    const tunnel = tunnels.find(t => t.id === id);
    const tunnelName = tunnel ? tunnel.name : 'this tunnel';
    
    if (!confirm(`Are you sure you want to delete "${tunnelName}"?\n\nThis will:\n- Stop the tunnel if running\n- Delete DNS record from Cloudflare\n- Remove tunnel from Cloudflare\n- Delete local configuration\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        showNotification('Info', `Deleting tunnel "${tunnelName}"...`, 'info');
        
        const response = await fetch(`/api/tunnels/${id}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Tunnel deleted successfully. All resources cleaned up.', 'success');
            await loadTunnels();
        } else {
            showNotification('Error', result.error || 'Failed to delete tunnel', 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Failed to delete tunnel', 'danger');
    }
}

// Notifications
function showNotification(title, message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="d-flex">
            <div>
                <h4 class="alert-title">${title}</h4>
                <div class="text-muted">${message}</div>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Logs viewer
let currentLogsId = null;
let logsInterval = null;

function viewLogs(id, name) {
    currentLogsId = id;
    document.getElementById('logsTunnelName').textContent = name;
    
    const modal = new bootstrap.Modal(document.getElementById('logsModal'));
    modal.show();
    
    loadLogs(id);
    
    // Auto-refresh logs every 2 seconds while modal is open
    logsInterval = setInterval(() => loadLogs(id), 2000);
    
    // Stop auto-refresh when modal closes
    document.getElementById('logsModal').addEventListener('hidden.bs.modal', () => {
        if (logsInterval) {
            clearInterval(logsInterval);
            logsInterval = null;
        }
    });
}

async function loadLogs(id) {
    try {
        const response = await fetch(`/api/tunnels/${id}/logs`);
        const logs = await response.json();
        displayLogs(logs);
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

function displayLogs(logs) {
    const container = document.getElementById('logsContainer');
    
    if (logs.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">No logs available</div>';
        return;
    }
    
    container.innerHTML = logs.map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        let color = '#4caf50'; // info - green
        if (log.level === 'error') color = '#f44336'; // red
        if (log.level === 'warning') color = '#ff9800'; // orange
        
        return `<div style="margin-bottom: 4px;">
            <span style="color: #888;">[${time}]</span>
            <span style="color: ${color}; font-weight: bold;">[${log.level.toUpperCase()}]</span>
            <span>${escapeHtml(log.message)}</span>
        </div>`;
    }).join('');
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.getElementById('refreshLogsBtn')?.addEventListener('click', () => {
    if (currentLogsId) {
        loadLogs(currentLogsId);
    }
});

document.getElementById('clearLogsBtn')?.addEventListener('click', () => {
    document.getElementById('logsContainer').innerHTML = '<div class="text-center text-muted">Logs cleared</div>';
});

// Export/Import
async function exportConfig() {
    try {
        const response = await fetch('/api/backup/export');
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cloudflare-tunnels-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Success', 'Configuration exported successfully', 'success');
    } catch (error) {
        showNotification('Error', 'Failed to export configuration', 'danger');
    }
}

async function importConfig() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Error', 'Please select a file', 'danger');
        return;
    }
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const response = await fetch('/api/backup/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', `Imported ${result.imported.tunnels} tunnel(s)`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
            await loadTunnels();
        } else {
            showNotification('Error', 'Failed to import configuration', 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Invalid backup file', 'danger');
    }
}

// Bulk Operations
async function bulkAction(action) {
    if (selectedTunnels.size === 0) return;
    
    const ids = Array.from(selectedTunnels);
    
    try {
        const response = await fetch(`/api/tunnels/bulk/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        
        const result = await response.json();
        const successful = result.results.filter(r => r.success).length;
        
        showNotification('Success', `${action} completed for ${successful}/${ids.length} tunnel(s)`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('bulkActionsModal')).hide();
        selectedTunnels.clear();
        await loadTunnels();
    } catch (error) {
        showNotification('Error', `Bulk ${action} failed`, 'danger');
    }
}

function toggleTunnelSelection(id, checked) {
    if (checked) {
        selectedTunnels.add(id);
    } else {
        selectedTunnels.delete(id);
    }
    
    document.getElementById('bulkActionsBtn').disabled = selectedTunnels.size === 0;
}

async function toggleAutoStartup(id, enabled) {
    try {
        const response = await fetch(`/api/tunnels/${id}/autostartup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        
        if (response.ok) {
            showNotification('Success', `Auto-startup ${enabled ? 'enabled' : 'disabled'}`, 'success');
            await loadTunnels();
        } else {
            showNotification('Error', 'Failed to update auto-startup', 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Failed to update auto-startup', 'danger');
    }
}

async function changeEnvironment(id, environment) {
    event.preventDefault();
    
    try {
        const response = await fetch(`/api/tunnels/${id}/environment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ environment })
        });
        
        if (response.ok) {
            showNotification('Success', `Environment changed to ${environment}`, 'success');
            await loadTunnels();
        } else {
            showNotification('Error', 'Failed to change environment', 'danger');
        }
    } catch (error) {
        showNotification('Error', 'Failed to change environment', 'danger');
    }
}

// Auto-refresh tunnel status every 5 seconds
setInterval(async () => {
    if (tunnels.length > 0) {
        await loadTunnels();
    }
}, 5000);

