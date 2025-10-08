# PM2 Setup Guide

This guide will help you set up Cloudflare Tunnel Manager to auto-start on server boot using PM2.

## Why PM2?

- ✅ **No systemd configuration needed** - simpler than systemd
- ✅ **No root permissions required** for tunnel management
- ✅ **Auto-restart on crashes** - keeps the app running
- ✅ **Easy log management** - built-in log rotation
- ✅ **Process monitoring** - see app status anytime
- ✅ **Works perfectly with tunnel auto-startup** feature

## Complete Setup (5 Minutes)

### 1. Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 2. Start the Tunnel Manager

```bash
cd "/home/dragan/Desktop/Cloudflare Tunnel"
npm run pm2:start
```

You should see:
```
[PM2] Starting /home/.../server.js in fork_mode (1 instance)
[PM2] Done.
┌─────┬──────────────────────────────┬─────────┬─────────┐
│ id  │ name                         │ status  │ restart │
├─────┼──────────────────────────────┼─────────┼─────────┤
│ 0   │ cloudflare-tunnel-manager    │ online  │ 0       │
└─────┴──────────────────────────────┴─────────┴─────────┘
```

### 3. Configure Startup on Boot

```bash
npm run pm2:startup
```

This will output a command like:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user
```

**Copy and run that exact command** (it needs sudo).

### 4. Save PM2 Configuration

```bash
npm run pm2:save
```

This saves the current running apps so they restart on boot.

### 5. Configure Your Tunnels

1. Open browser: `http://localhost:3000`
2. Go to Settings → Configure Cloudflare API
3. Create tunnels
4. **Enable "Auto-startup"** checkbox on critical tunnels

### 6. Test It!

```bash
# Restart the server
npm run pm2:restart

# The app restarts and auto-startup tunnels should start automatically
# Check the logs:
npm run pm2:logs
```

You should see:
```
Checking for auto-startup tunnels...
Auto-starting tunnel: my-tunnel
Tunnel started successfully
```

---

## Daily Usage

### Check Status
```bash
npm run pm2:status
```

### View Logs
```bash
npm run pm2:logs

# Or view just errors:
pm2 logs cloudflare-tunnel-manager --err

# View last 100 lines:
pm2 logs cloudflare-tunnel-manager --lines 100
```

### Restart After Update
```bash
npm run pm2:restart
```

### Stop the App
```bash
npm run pm2:stop
```

### Start Again
```bash
npm run pm2:start
```

---

## How Auto-Startup Works

### Workflow:

1. **Server boots** → PM2 auto-starts → Tunnel Manager starts
2. **App initialization** → Checks `data/tunnels.json`
3. **Finds tunnels** with `autoStartup: true`
4. **Auto-starts** those tunnels
5. **Health checks** begin monitoring
6. **Discord notifications** sent if configured

### Example Scenario:

**You have 3 tunnels:**
- `prod-api` (autoStartup: ✓, environment: production)
- `staging-web` (autoStartup: ✗, environment: staging)  
- `dev-test` (autoStartup: ✗, environment: development)

**Server reboots:**
1. PM2 starts Tunnel Manager
2. `prod-api` automatically starts
3. `staging-web` and `dev-test` stay stopped
4. You can manually start the others when needed

---

## Monitoring with PM2

### View All Processes
```bash
pm2 list
```

### Monitor Resources
```bash
pm2 monit
```

### View App Info
```bash
pm2 show cloudflare-tunnel-manager
```

### Clear Logs
```bash
pm2 flush
```

---

## Troubleshooting

### PM2 not starting on boot
```bash
# Re-run startup configuration
npm run pm2:startup
# Run the sudo command it provides
npm run pm2:save
```

### App won't start
```bash
# Check logs
npm run pm2:logs

# Check if port 3000 is in use
sudo lsof -i :3000

# Delete and restart
pm2 delete cloudflare-tunnel-manager
npm run pm2:start
```

### Tunnels not auto-starting
```bash
# Check logs for errors
npm run pm2:logs

# Verify autoStartup is enabled
cat data/tunnels.json | grep autoStartup

# Manual test: stop PM2 and start normally
pm2 stop cloudflare-tunnel-manager
npm start
# Watch the console for "Auto-starting tunnel: ..."
```

---

## Uninstall / Remove

```bash
# Stop and remove from PM2
pm2 delete cloudflare-tunnel-manager

# Remove from startup
pm2 unstartup systemd

# Optionally remove PM2 globally
sudo npm uninstall -g pm2
```

---

## Benefits Summary

| Feature | Without PM2 | With PM2 |
|---------|-------------|----------|
| Auto-start on boot | ❌ Manual | ✅ Automatic |
| Crash recovery | ❌ Stays down | ✅ Auto-restarts |
| Log management | ❌ Manual | ✅ Built-in |
| Process monitoring | ❌ None | ✅ `pm2 status` |
| Tunnel auto-startup | ⚠️ Needs manual start | ✅ Fully automatic |
| Root permissions | ❌ Not needed | ❌ Not needed |
| Systemd config | ❌ Not needed | ❌ Not needed |

**PM2 + Auto-Startup = Production-Ready Automation** 🚀

