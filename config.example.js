module.exports = {
    // Server configuration
    port: process.env.PORT || 3000,
    
    // Session secret (change this in production!)
    sessionSecret: process.env.SESSION_SECRET || 'cloudflare-tunnel-manager-secret-key-change-me',
    
    // Session timeout (milliseconds)
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    
    // Data directories
    dataDir: './data',
    tunnelConfigsDir: './tunnel-configs',
    
    // Cloudflare API
    cloudflareApiUrl: 'https://api.cloudflare.com/client/v4'
};

