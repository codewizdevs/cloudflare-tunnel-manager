const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SystemCheck {
    async checkRequirements() {
        const status = {
            cloudflaredInstalled: false,
            version: null,
            canInstall: false
        };

        try {
            // Check if cloudflared is installed
            const { stdout } = await execAsync('cloudflared --version');
            status.cloudflaredInstalled = true;
            status.version = stdout.trim();
        } catch (error) {
            status.cloudflaredInstalled = false;
            
            // Check if we can install (root/sudo access)
            try {
                await execAsync('sudo -n true');
                status.canInstall = true;
            } catch {
                status.canInstall = false;
            }
        }

        return status;
    }

    async installCloudflared() {
        try {
            // Download and install cloudflared for Ubuntu/Debian
            const commands = [
                'curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb',
                'sudo dpkg -i cloudflared.deb',
                'rm cloudflared.deb'
            ];

            for (const command of commands) {
                await execAsync(command);
            }

            // Verify installation
            const { stdout } = await execAsync('cloudflared --version');
            
            return {
                success: true,
                message: 'Cloudflared installed successfully',
                version: stdout.trim()
            };
        } catch (error) {
            return {
                success: false,
                message: 'Failed to install cloudflared',
                error: error.message
            };
        }
    }

    async executeCommand(command) {
        try {
            const { stdout, stderr } = await execAsync(command);
            return { success: true, stdout, stderr };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new SystemCheck();

