# 🚀 Cloudflare Tunnel Manager

> **Professional web-based management system for Cloudflare Tunnels with advanced monitoring, health checks, and automation**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A powerful, modern web interface for managing Cloudflare Tunnels (cloudflared) on Linux. Created for system administrators who need reliable tunnel management with enterprise features like health monitoring, auto-restart, environment tagging, and Discord notifications - all without requiring systemd or root permissions.

![Cloudflare Tunnel Manager](https://img.shields.io/badge/Cloudflare-Tunnel%20Manager-orange)

---

## 📑 Table of Contents

- [Why Cloudflare Tunnel Manager?](#why-cloudflare-tunnel-manager)
- [Features](#features)
- [Screenshots](#screenshots)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Production Setup with PM2](#production-setup-with-pm2)
- [Usage Guide](#usage-guide)
- [Advanced Features](#advanced-features)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Why Cloudflare Tunnel Manager?

Managing Cloudflare Tunnels via command line is tedious. This tool provides:

✅ **Beautiful Web Interface** - Manage all tunnels from your browser  
✅ **No Systemd Required** - Uses PM2 for process management  
✅ **Health Monitoring** - Auto-restart failed tunnels  
✅ **Environment Tags** - Organize Production, Staging, Development  
✅ **Bulk Operations** - Start/stop/delete multiple tunnels  
✅ **Discord Alerts** - Get notified when tunnels fail  
✅ **Zero Downtime** - Tunnels survive server reboots  
✅ **Advanced Routing** - One tunnel, multiple backend services  
✅ **Dark Mode** - Easy on the eyes for late-night ops  

**Perfect for:** DevOps engineers, system administrators, developers managing multiple Cloudflare Tunnels across different environments.

---

## ✨ Features

### 🔧 Core Features

- **Tunnel Management**
  - Create, start, stop, restart, and delete tunnels via web UI
  - Real-time tunnel status monitoring with color-coded indicators
  - Live log viewer with auto-refresh
  - Process tracking across app restarts
  
- **Cloudflare Integration**
  - Automatic tunnel creation via Cloudflare API
  - Auto-configure DNS records (CNAME)
  - Zone ID management per tunnel
  - Secure credential storage
  - API token or Global API Key support

- **Linux System Integration**
  - Auto-detect cloudflared installation
  - One-click cloudflared installer for Ubuntu 24.04
  - Process management without root permissions
  - Automatic cleanup of orphaned processes

### 🚀 Advanced Features

- **🏷️ Environment Management**
  - Tag tunnels as Production, Staging, or Development
  - Color-coded badges (Green/Yellow/Blue)
  - Filter tunnels by environment
  - Click badge dropdown to change environment instantly

- **❤️ Health Checks & Auto-Restart**
  - HTTP health check monitoring with configurable intervals (10s+)
  - Custom health check paths (e.g., `/health`, `/api/status`)
  - Automatic tunnel restart on health check failure
  - Real-time health status display (healthy/unhealthy)
  - Reduces downtime to near-zero

- **🚀 Auto-Startup (PM2 Integration)**
  - Mark tunnels to auto-start when app launches
  - Toggle auto-startup with a single checkbox
  - Works perfectly with PM2 process manager
  - Survive server reboots without systemd
  - No root permissions required

- **🔔 Discord Notifications**
  - Global webhook integration
  - Notifications for: tunnel stopped, crashed, health check failed, started
  - Color-coded Discord embeds (Red/Orange/Green)
  - Keep your team informed in real-time

- **💾 Backup & Disaster Recovery**
  - Export all tunnels and settings to JSON
  - Import configuration from backup file
  - Migrate between servers easily
  - Version control your tunnel configs

- **🔐 Security**
  - Password-protect the entire dashboard
  - Session-based authentication (24h timeout)
  - Full UI restriction when unauthenticated
  - Beautiful gradient login screen
  - Logout functionality

- **🌙 Dark Mode**
  - Complete dark theme support
  - Persistent preference (localStorage)
  - Reduced eye strain for night operations
  - Works on all screens including login

- **📦 Bulk Operations**
  - Select multiple tunnels with checkboxes
  - Bulk start, stop, or delete operations
  - Environment-based filtering for bulk actions
  - Progress feedback for each operation

- **🔀 Advanced Routing**
  - Path-based routing within single tunnel
  - Multiple backend services (e.g., `/api→3000`, `/app→8080`)
  - Reduce tunnel count, save on limits
  - Dynamic service configuration

---

## 📸 Screenshots

### Main Dashboard
Modern, clean interface with real-time tunnel status, environment badges, and quick actions.

### Tunnel Creation
Simple form with validation, environment selection, health checks, and advanced routing options.

### Dark Mode
Beautiful dark theme perfect for late-night server management.

---

## 📋 Prerequisites

Before installing Cloudflare Tunnel Manager, ensure you have:

### Required

- **Node.js** v14 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Ubuntu 24.04** or compatible Linux distribution
- **Cloudflare Account** with API access ([Sign up](https://dash.cloudflare.com/sign-up))

### Recommended for Production

- **PM2** - Process manager for Node.js ([Install guide below](#production-setup-with-pm2))

### Will Be Installed Automatically

- **cloudflared** - Cloudflare Tunnel daemon (auto-installed via web interface)

---

## 🔧 Installation

### Step 1: Clone or Download

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/cloudflare-tunnel-manager.git
cd cloudflare-tunnel-manager

# Or download and extract ZIP
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Express.js (web server)
- Axios (HTTP client for Cloudflare API)
- Body-parser (request parsing)
- Express-session (authentication)

### Step 3: Start the Application

**For Development/Testing:**
```bash
npm start
```

**For Production (Recommended):**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start with PM2
npm run pm2:start

# Configure auto-start on boot
npm run pm2:startup
# Run the sudo command it outputs

# Save PM2 configuration
npm run pm2:save
```

### Step 4: Access the Web Interface

Open your browser and navigate to:
```
http://localhost:3000
```

Or from another machine:
```
http://YOUR_SERVER_IP:3000
```

---

## 🚀 Quick Start

### 1. Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"** → **"Create Custom Token"**
3. Set permissions:
   - **Account** → Cloudflare Tunnel → **Edit**
   - **Zone** → DNS → **Edit**
   - **Account** → Account Settings → **Read**
4. Click **"Continue to summary"** → **"Create Token"**
5. **Copy the token** (you won't see it again!)

### 2. Configure Cloudflare API

1. Open `http://localhost:3000`
2. Click **"Settings"** in the navigation
3. Go to **"Cloudflare API"** tab
4. Paste your API token
5. Click **"Save Settings"**
6. System will authenticate and auto-detect your Account ID

### 3. Install cloudflared (If Not Installed)

If the system shows "Requirements Not Installed":
1. Click **"Install Cloudflared"** button
2. Wait for installation to complete
3. Refresh the page

### 4. Create Your First Tunnel

1. Click **"Create Tunnel"**
2. Fill in the form:
   - **Tunnel Name:** `my-first-tunnel`
   - **Zone ID:** Your Cloudflare Zone ID (find in Cloudflare dashboard)
   - **Local Port:** `8080` (or your service port)
   - **Hostname:** `app.example.com` (full domain required)
   - **Environment:** `production`
3. Optional: Enable health checks and auto-startup
4. Click **"Create Tunnel"**

### 5. Start the Tunnel

1. Find your tunnel in the list
2. Click **"Start"** button
3. Watch the status indicator turn green
4. Click **"Logs"** to view connection details

### 6. Test Your Tunnel

Visit your configured hostname (e.g., `https://app.example.com`)

Your local service on port 8080 is now accessible via Cloudflare Tunnel! 🎉

---

## 🏭 Production Setup with PM2

For production environments, use PM2 to ensure zero-downtime operation.

### Why PM2?

- ✅ Auto-restart on crashes
- ✅ Start on server boot (no systemd config needed)
- ✅ Log management and rotation
- ✅ Process monitoring
- ✅ Works perfectly with tunnel auto-startup feature

### Complete PM2 Setup (5 Minutes)

```bash
# 1. Install PM2 globally
sudo npm install -g pm2

# 2. Start the application
cd /path/to/cloudflare-tunnel-manager
npm run pm2:start

# 3. Configure startup on boot (ONE TIME ONLY)
npm run pm2:startup
# Copy and run the command it outputs (requires sudo)

# 4. Save current PM2 state
npm run pm2:save

# 5. Verify it's running
npm run pm2:status
```

### PM2 Daily Commands

```bash
# View live logs
npm run pm2:logs

# Check status
npm run pm2:status

# Restart after updates
npm run pm2:restart

# Stop the app
npm run pm2:stop
```

### Auto-Startup Tunnels

1. Create tunnels and enable **"Auto-startup"** checkbox
2. When PM2 starts the app, marked tunnels auto-start
3. Server reboot → PM2 starts app → Tunnels auto-start
4. **Zero manual intervention required!**

---

## 📖 Usage Guide

### Creating a Tunnel

#### Basic Tunnel

1. Click **"Create Tunnel"**
2. Enter required information:
   - **Tunnel Name:** Friendly identifier
   - **Zone ID:** From Cloudflare dashboard (Domain → Overview → Zone ID)
   - **Local Port:** The port your service runs on (e.g., 3000, 8080)
   - **Hostname:** Full domain like `app.example.com` (NOT just `app`)
   - **Environment:** Select Production, Staging, or Development

3. Click **"Create Tunnel"**

#### Advanced Tunnel with Health Checks

1. Follow basic tunnel steps above
2. Enable **"Health Checks"** checkbox
3. Configure:
   - **Interval:** How often to check (default 30s)
   - **Health Path:** Endpoint to check (e.g., `/health`)
4. Enable **"Auto-restart on failure"**
5. Enable **"Auto-startup"** for critical tunnels
6. Create tunnel

#### Multi-Service Tunnel (Advanced Routing)

Route different URL paths to different backend services:

1. Fill in basic tunnel info
2. Scroll to **"Advanced Routing"**
3. Click **"+ Add Service"**
4. Add services:
   - Path: `/api` → Port: `3000`
   - Path: `/admin` → Port: `9000`
   - Path: `/app` → Port: `8080`
5. Create tunnel

Result: `app.example.com/api` → localhost:3000, `app.example.com/admin` → localhost:9000, etc.

### Managing Tunnels

#### Starting/Stopping

- **Start:** Click green **"Start"** button
- **Stop:** Click yellow **"Stop"** button (when running)
- **Restart:** Click blue **"Restart"** button (when running)
- **View Logs:** Click **"Logs"** button for real-time output

#### Changing Environment

1. Click the environment badge (e.g., "production")
2. Select new environment from dropdown
3. Badge updates instantly

#### Toggling Auto-Startup

- Click the **"Auto-startup"** checkbox on tunnel card
- Enabled: Tunnel auto-starts when app starts
- Disabled: Manual start required

#### Filtering Tunnels

- Use **"Environment Filter"** dropdown
- Show only: All, Production, Staging, or Development
- Combine with bulk operations

#### Bulk Operations

1. Check boxes next to tunnels
2. Click **"Bulk Actions"** button
3. Choose: Start All, Stop All, or Delete All
4. Confirm action

### Backup & Export/Import

#### Export Configuration

1. Click **"Export"** button
2. Downloads JSON file with:
   - All tunnel configurations
   - Application settings
   - Timestamp

#### Import Configuration

1. Click **"Import"** button
2. Select backup JSON file
3. Click **"Import"**
4. Tunnels merge with existing

Use case: Migrate to new server, disaster recovery, clone setup

### Configuring Settings

#### Cloudflare API (Required)

1. Settings → **Cloudflare API** tab
2. Select **"API Token"** (recommended)
3. Paste your token
4. Optional: Enter Account ID (auto-detected if empty)
5. Click **"Save Settings"**

#### Discord Notifications (Optional)

1. Create Discord webhook:
   - Discord Server → Settings → Integrations → Webhooks → New Webhook
   - Copy webhook URL

2. Settings → **Notifications** tab
3. Paste webhook URL
4. Click **"Save Settings"**

You'll receive notifications for:
- 🛑 Tunnel stopped (red)
- 💥 Tunnel crashed (red)
- ⚠️ Health check failed (orange)
- ✅ Tunnel started (green)

#### Password Protection (Optional)

1. Settings → **Security** tab
2. Enable **"Password Protection"**
3. Enter a strong password
4. Click **"Save Settings"**
5. Page reloads → Login screen appears

**To disable if locked out:** Edit `data/settings.json`, set `passwordProtection.enabled` to `false`, restart app.

### Using Dark Mode

- Click **moon/sun icon** in navbar
- Preference saved automatically
- Applies to all screens including login

---

## 🎯 Advanced Features

### Health Checks & Auto-Restart

**What it does:** Monitors your backend service and auto-restarts tunnel if it becomes unhealthy.

**Setup:**
1. Enable when creating tunnel
2. Set interval (e.g., 30 seconds)
3. Set health path (e.g., `/health` or `/`)
4. Enable auto-restart

**How it works:**
- Every X seconds, makes HTTP request to `http://localhost:PORT/health-path`
- If response is 4xx/5xx or connection fails → marks unhealthy
- If auto-restart enabled → automatically restarts tunnel
- Displays health badge on tunnel card

**Example use case:** Production API that should always be up. Health check every 30s, auto-restart enabled. If API crashes, tunnel restarts within 30s.

### Environment Management

**Organize tunnels by purpose:**

- **Production** (Green) - Live, customer-facing services
- **Staging** (Yellow) - Pre-production testing
- **Development** (Blue) - Development and testing

**Features:**
- Filter view by environment
- Color-coded visual organization
- Bulk operations per environment
- Change environment via badge dropdown

**Workflow example:**
1. Create tunnel in "development"
2. Test thoroughly
3. Click environment badge → change to "staging"
4. Final tests
5. Click environment badge → change to "production"

### Advanced Routing (Multiple Services)

**One tunnel, multiple backend services with path-based routing.**

**Example configuration:**
```
Hostname: app.example.com
Services:
  /api      → localhost:3000  (API server)
  /admin    → localhost:9000  (Admin panel)
  /static   → localhost:8080  (Static assets)
```

**Result:**
- `app.example.com/api/users` → Your API on port 3000
- `app.example.com/admin/dashboard` → Admin on port 9000
- `app.example.com/static/logo.png` → Static server on port 8080

**Benefits:**
- Save on tunnel limits
- Consolidate multiple services
- Simpler DNS management
- One tunnel to rule them all

### Auto-Startup with PM2

**The Problem:** After server reboot, you need to manually start tunnels.

**The Solution:** Auto-startup checkbox + PM2

**Setup:**
1. Install PM2 and configure startup (see Production Setup)
2. Enable "Auto-startup" on critical tunnels
3. Reboot server
4. PM2 starts app → App auto-starts marked tunnels

**Benefits:**
- ✅ Zero manual intervention after reboot
- ✅ No systemd configuration
- ✅ No root permissions for tunnel management
- ✅ Works with health checks and auto-restart

### Bulk Operations

**Manage multiple tunnels simultaneously.**

**Common scenarios:**

**Stop all staging tunnels:**
1. Filter: "Staging"
2. Select all visible tunnels
3. Bulk Actions → Stop All

**Delete all development tunnels:**
1. Filter: "Development"
2. Select tunnels to remove
3. Bulk Actions → Delete All
4. Confirm

**Start all production tunnels:**
1. Filter: "Production"
2. Select all
3. Bulk Actions → Start All

---

## 🔌 API Documentation

### Authentication

When password protection is enabled, include session cookie with requests.

### Endpoints

#### System
- `GET /api/system/status` - Check cloudflared installation
- `POST /api/system/install` - Install cloudflared

#### Authentication
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check auth status

#### Tunnels
- `GET /api/tunnels` - List all tunnels
- `GET /api/tunnels/:id` - Get tunnel details
- `POST /api/tunnels` - Create tunnel
- `DELETE /api/tunnels/:id` - Delete tunnel (full cleanup)
- `POST /api/tunnels/:id/start` - Start tunnel
- `POST /api/tunnels/:id/stop` - Stop tunnel
- `POST /api/tunnels/:id/restart` - Restart tunnel
- `GET /api/tunnels/:id/status` - Get status
- `GET /api/tunnels/:id/logs` - Get logs
- `POST /api/tunnels/:id/autostartup` - Toggle auto-startup
- `POST /api/tunnels/:id/environment` - Change environment

#### Bulk Operations
- `POST /api/tunnels/bulk/start` - Start multiple
- `POST /api/tunnels/bulk/stop` - Stop multiple
- `POST /api/tunnels/bulk/delete` - Delete multiple

#### Backup
- `GET /api/backup/export` - Export configuration
- `POST /api/backup/import` - Import configuration

#### Settings
- `GET /api/settings` - Get settings
- `POST /api/settings` - Update settings

---

## 🛠️ Troubleshooting

### Tunnel Won't Start

**Check cloudflared installation:**
```bash
cloudflared --version
```

**Check tunnel logs:**
- Click "Logs" button on tunnel card
- Look for error messages (shown in red)

**Verify credentials file:**
```bash
ls -la tunnel-configs/
# Should see tunnel_xxx-credentials.json files
```

### Health Checks Failing

**Test backend service manually:**
```bash
curl http://localhost:PORT/health-path
# Should return 200 OK
```

**Check health check configuration:**
- Ensure interval is reasonable (not too frequent)
- Verify health path is correct
- Check service is actually running

### DNS Not Resolving

**Wait for DNS propagation:** 1-2 minutes

**Clear local DNS cache:**
```bash
sudo systemd-resolve --flush-caches
```

**Verify in Cloudflare:**
- Dashboard → Your Domain → DNS
- Look for CNAME: `your-hostname` → `tunnel-id.cfargotunnel.com`

**Test DNS resolution:**
```bash
nslookup your-hostname.example.com 1.1.1.1
```

### Password Locked Out

**Manual recovery:**
```bash
# Edit settings file
nano data/settings.json

# Find and change:
"passwordProtection": {
  "enabled": false  # Change to false
}

# Save and restart
npm run pm2:restart  # Or: npm start
```

### Tunnel Process Won't Stop

**Find and kill process manually:**
```bash
# Find cloudflared processes
ps aux | grep cloudflared

# Kill by PID
kill <PID>
```

### PM2 Not Starting on Boot

**Reconfigure PM2 startup:**
```bash
npm run pm2:startup
# Run the sudo command it provides
npm run pm2:save
```

**Test reboot:**
```bash
sudo reboot
# After reboot, check:
npm run pm2:status
```

---

## 📁 Project Structure

```
cloudflare-tunnel-manager/
├── server.js                     # Express server
├── package.json                  # Dependencies
├── ecosystem.config.js           # PM2 configuration
├── backend/
│   ├── cloudflareApi.js         # Cloudflare API integration
│   ├── dataStore.js             # JSON data persistence
│   ├── healthCheck.js           # Health monitoring
│   ├── monitoring.js            # Uptime tracking
│   ├── notifications.js         # Discord webhooks
│   ├── systemCheck.js           # System requirements
│   └── tunnelManager.js         # Tunnel lifecycle management
├── public/
│   ├── index.html               # Main web interface
│   ├── css/
│   │   ├── style.css            # Custom styles
│   │   └── dark-mode.css        # Dark theme
│   └── js/
│       └── app.js               # Frontend JavaScript
├── data/                         # Auto-created on first run
│   ├── credentials.json         # Cloudflare API credentials
│   ├── tunnels.json             # Tunnel configurations
│   └── settings.json            # App settings
└── tunnel-configs/               # Auto-created on first run
    ├── tunnel_xxx.yml           # Cloudflare tunnel config
    └── tunnel_xxx-credentials.json
```

---

## 🔐 Security Best Practices

1. **Enable password protection** for production deployments
2. **Use API tokens** instead of Global API Key
3. **Restrict API token scope** to only required permissions
4. **Keep credentials secure** - `data/` folder is gitignored
5. **Use HTTPS** if exposing the management interface externally
6. **Regular backups** - export configuration weekly

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** - Open an issue with details
2. **Suggest features** - Share your ideas
3. **Submit PRs** - Fork, code, and submit pull requests
4. **Improve documentation** - Help others get started

### Development Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/cloudflare-tunnel-manager.git
cd cloudflare-tunnel-manager

# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Make your changes
# Test thoroughly
# Submit PR
```

---

## 📊 Technical Stack

- **Backend:** Node.js, Express.js
- **Frontend:** Vanilla JavaScript, Tabler UI
- **Storage:** JSON files (no database required)
- **Process Management:** PM2 (optional but recommended)
- **API Integration:** Cloudflare API v4
- **System Integration:** Linux process management

**Why these choices:**
- No database = Simple deployment
- Vanilla JS = No build step, fast loading
- Tabler UI = Modern, professional design
- PM2 = Production-ready process management

---

## 📝 License

ISC License - See LICENSE file for details

---

## 🙏 Credits

### Built by CodeWizDev

Professional web development and DevOps solutions.

**Website:** [codewizdev.com](https://codewizdev.com)

Specializing in custom development tools, automation systems, and enterprise solutions.

---

## ⭐ Support This Project

If this tool saves you time, please:
- ⭐ **Star this repository**
- 🐛 **Report bugs** you find
- 💡 **Suggest features** you need
- 📢 **Share** with other DevOps engineers

---

## 📞 Support & Documentation

- **Issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/cloudflare-tunnel-manager/issues)
- **Documentation:** See PM2_SETUP.md for detailed PM2 guide
- **Cloudflare Docs:** [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

## 🔖 Keywords

cloudflare tunnel, cloudflared manager, tunnel management, web interface, cloudflare zero trust, tunnel automation, health monitoring, pm2 integration, devops tools, linux tunnel manager, cloudflare api, tunnel dashboard, cloudflare tunnel gui, reverse proxy, tunnel monitoring

---

**Made with ❤️ by [CodeWizDev](https://codewizdev.com)**
