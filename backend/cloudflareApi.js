const axios = require('axios');
const dataStore = require('./dataStore');

class CloudflareApi {
    constructor() {
        this.baseUrl = 'https://api.cloudflare.com/client/v4';
    }

    getHeaders() {
        const credentials = dataStore.getCredentials();
        
        if (credentials.apiToken) {
            return {
                'Authorization': `Bearer ${credentials.apiToken}`,
                'Content-Type': 'application/json'
            };
        } else if (credentials.apiKey && credentials.email) {
            return {
                'X-Auth-Email': credentials.email,
                'X-Auth-Key': credentials.apiKey,
                'Content-Type': 'application/json'
            };
        }
        
        throw new Error('No valid credentials found');
    }

    async authenticate(credentials) {
        try {
            // Save credentials
            dataStore.saveCredentials(credentials);

            // Test authentication by fetching accounts (uses Account permissions)
            const response = await axios.get(`${this.baseUrl}/accounts`, {
                headers: this.getHeaders()
            });

            if (response.data.success) {
                // Also save the account ID if we got it
                if (response.data.result.length > 0) {
                    const accountId = response.data.result[0].id;
                    dataStore.saveCredentials({ accountId });
                }
                
                return {
                    success: true,
                    message: 'Authentication successful',
                    accounts: response.data.result
                };
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            return {
                success: false,
                message: 'Authentication failed',
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async getAccountId() {
        try {
            const response = await axios.get(`${this.baseUrl}/accounts`, {
                headers: this.getHeaders()
            });

            if (response.data.success && response.data.result.length > 0) {
                const accountId = response.data.result[0].id;
                dataStore.saveCredentials({ accountId });
                return accountId;
            }
            throw new Error('No accounts found');
        } catch (error) {
            throw new Error(`Failed to get account ID: ${error.message}`);
        }
    }

    async createTunnel(name) {
        try {
            const credentials = dataStore.getCredentials();
            let accountId = credentials.accountId;

            if (!accountId) {
                accountId = await this.getAccountId();
            }

            // Generate a proper base64 tunnel secret (32 random bytes)
            const tunnelSecret = this.generateTunnelSecret();
            
            console.log('Creating tunnel with accountId:', accountId, 'name:', name);

            const response = await axios.post(
                `${this.baseUrl}/accounts/${accountId}/cfd_tunnel`,
                { name, tunnel_secret: tunnelSecret },
                { headers: this.getHeaders() }
            );

            if (response.data.success) {
                const tunnel = response.data.result;
                // Attach the tunnel secret to the result for credential file creation
                tunnel.tunnel_secret = tunnelSecret;
                return tunnel;
            }
            throw new Error('Failed to create tunnel');
        } catch (error) {
            console.error('Tunnel creation error:', error.response?.data || error.message);
            const errorMsg = this.formatError(error);
            throw new Error(`Failed to create tunnel: ${errorMsg}`);
        }
    }

    async deleteTunnel(tunnelId) {
        try {
            const credentials = dataStore.getCredentials();
            const accountId = credentials.accountId;

            await axios.delete(
                `${this.baseUrl}/accounts/${accountId}/cfd_tunnel/${tunnelId}`,
                { headers: this.getHeaders() }
            );

            return { success: true };
        } catch (error) {
            const errorMsg = this.formatError(error);
            throw new Error(`Failed to delete tunnel: ${errorMsg}`);
        }
    }

    async getTunnelToken(tunnelId) {
        try {
            const credentials = dataStore.getCredentials();
            const accountId = credentials.accountId;

            const response = await axios.get(
                `${this.baseUrl}/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`,
                { headers: this.getHeaders() }
            );

            if (response.data.success) {
                return response.data.result;
            }
            throw new Error('Failed to get tunnel token');
        } catch (error) {
            const errorMsg = this.formatError(error);
            throw new Error(`Failed to get tunnel token: ${errorMsg}`);
        }
    }

    async createDNSRecord(zoneId, tunnelId, hostname) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/zones/${zoneId}/dns_records`,
                {
                    type: 'CNAME',
                    name: hostname,
                    content: `${tunnelId}.cfargotunnel.com`,
                    proxied: true
                },
                { headers: this.getHeaders() }
            );

            if (response.data.success) {
                return response.data.result;
            }
            throw new Error('Failed to create DNS record');
        } catch (error) {
            const errorMsg = this.formatError(error);
            throw new Error(`Failed to create DNS record: ${errorMsg}`);
        }
    }

    async deleteDNSRecord(zoneId, hostname) {
        try {
            console.log(`Looking for DNS record in zone ${zoneId} with hostname: ${hostname}`);
            
            // Get all DNS records in the zone
            const listResponse = await axios.get(
                `${this.baseUrl}/zones/${zoneId}/dns_records`,
                { headers: this.getHeaders() }
            );

            if (listResponse.data.success) {
                // Find CNAME records that contain the hostname
                const dnsRecords = listResponse.data.result.filter(record => {
                    const isMatch = record.type === 'CNAME' && 
                                   (record.name === hostname || 
                                    record.name.startsWith(hostname + '.') ||
                                    record.name.endsWith('.' + hostname) ||
                                    record.content?.includes('.cfargotunnel.com'));
                    
                    if (isMatch) {
                        console.log(`Found matching DNS record: ${record.name} -> ${record.content}`);
                    }
                    return isMatch;
                });

                if (dnsRecords.length > 0) {
                    // Delete all matching records
                    for (const record of dnsRecords) {
                        await axios.delete(
                            `${this.baseUrl}/zones/${zoneId}/dns_records/${record.id}`,
                            { headers: this.getHeaders() }
                        );
                        console.log(`Deleted DNS record: ${record.name} (${record.id})`);
                    }
                    return { success: true, deleted: dnsRecords.length };
                } else {
                    console.log(`No DNS record found matching ${hostname}`);
                    return { success: true, message: 'No DNS record found' };
                }
            } else {
                throw new Error('Failed to list DNS records');
            }
        } catch (error) {
            const errorMsg = this.formatError(error);
            console.error(`Failed to delete DNS record: ${errorMsg}`);
            // Don't throw - DNS record might not exist, which is fine
            return { success: false, error: errorMsg };
        }
    }

    generateTunnelSecret() {
        // Generate 32 random bytes and encode as base64
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('base64');
    }

    formatError(error) {
        if (error.response?.data?.errors) {
            const errors = error.response.data.errors;
            if (Array.isArray(errors)) {
                return errors.map(e => e.message).join(', ');
            }
        }
        return error.message || 'Unknown error';
    }
}

module.exports = new CloudflareApi();

