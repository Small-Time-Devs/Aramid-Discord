import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { save2FASecret, get2FASecret, checkUserWallet } from '../db/dynamo.mjs';

export async function enable2FA(userId, username) {
    try {
        const secret = speakeasy.generateSecret({ 
            length: 20,
            name: `Aramid-${username}`,  // Add app name for better identification
            issuer: 'Aramid Bot'
        });

        // Generate QR code
        const otpauthUrl = secret.otpauth_url;
        const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

        // Save to database
        await save2FASecret(userId, secret.base32);

        return { 
            secret: secret.base32, 
            qrCodeUrl,
            embed: {
                title: '🔒 2FA Setup',
                description: 'Scan this QR code with your authenticator app or enter the secret manually.',
                fields: [
                    {
                        name: '📱 Compatible Apps',
                        value: '• Google Authenticator\n• Authy\n• Microsoft Authenticator',
                        inline: false
                    },
                    {
                        name: '🔑 Manual Entry',
                        value: 'If QR scan fails, manually enter this secret:\n' +
                               `\`${secret.base32}\``,
                        inline: false
                    }
                ],
                color: 0x00ff00
            }
        };
    } catch (error) {
        console.error('Error generating 2FA:', error);
        throw error;
    }
}

export async function verify2FACode(userId, token) {
    try {
        const secret = await get2FASecret(userId);
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });
    } catch (error) {
        console.error('Error verifying 2FA code:', error);
        return false;
    }
}

export async function check2FAStatus(userId) {
    try {
        const secret = await get2FASecret(userId);
        return !!secret;  // Returns true if 2FA secret exists
    } catch (error) {
        return false;  // Return false if no 2FA found
    }
}

export async function handle2FAVerification(interaction) {
    const userId = interaction.user.id;
    const token = interaction.options.getString('code');

    try {
        const isValid = await verify2FACode(userId, token);
        
        if (isValid) {
            await interaction.reply({
                content: '✅ 2FA verified successfully!',
                ephemeral: true
            });

            // Wait a moment before showing the next step
            setTimeout(async () => {
                await sendQuickStartSecurity(interaction, 'wallet_security');
            }, 1500);

            return true;
        } else {
            await interaction.reply({
                content: '❌ Invalid 2FA code. Please try again.',
                ephemeral: true
            });
            return false;
        }
    } catch (error) {
        console.error('2FA verification error:', error);
        await interaction.reply({
            content: '❌ Error verifying 2FA code. Please try again.',
            ephemeral: true
        });
        return false;
    }
}

export async function require2FASetup(interaction) {
    const userId = interaction.user.id;
    try {
        const { exists, twoFactorEnabled } = await checkUserWallet(userId);

        if (exists && !twoFactorEnabled) {
            await interaction.reply({
                content: '🔒 2FA is not enabled. Please use the `/enable2fa` command to set it up.',
                ephemeral: true
            });
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking 2FA setup:', error);
        await interaction.reply({
            content: '❌ Error checking 2FA status. Please try again.',
            ephemeral: true
        });
        return false;
    }
}

// Helper function to create 2FA verification request message
export async function send2FARequest(channel, userId) {
    return await channel.send({
        embeds: [{
            title: '🔒 2FA Verification Required',
            description: 'Please enter your 2FA code to continue.',
            color: 0xFF9900
        }],
        components: [{
            type: 1,
            components: [{
                type: 2,
                custom_id: `verify_2fa_${userId}`,
                label: 'Enter 2FA Code',
                style: 1
            }]
        }]
    });
}

export async function handle2FACommands(interaction) {
    if (!interaction.isCommand()) return;

    try {
        switch (interaction.commandName) {
            case 'enable2fa':
                console.log('Processing enable2fa command...');
                const setupResult = await enable2FA(
                    interaction.user.id,
                    interaction.user.username
                );

                if (!setupResult) {
                    await interaction.reply({
                        content: '❌ Error setting up 2FA. Please try again.',
                        ephemeral: true
                    });
                    return;
                }

                // Convert QR code to attachment
                const qrBuffer = Buffer.from(setupResult.qrCodeUrl.split(',')[1], 'base64');
                const attachment = { 
                    attachment: qrBuffer,
                    name: '2fa-qr.png'
                };

                await interaction.reply({
                    content: '🔒 Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)',
                    files: [attachment],
                    embeds: [setupResult.embed],
                    ephemeral: true
                });
                break;

            case 'verify2fa':
                const code = interaction.options.getString('code');
                if (!code) {
                    await interaction.reply({
                        content: '❌ Please provide a valid 2FA code.',
                        ephemeral: true
                    });
                    return;
                }
                await handle2FAVerification(interaction);
                break;

            default:
                return;
        }
    } catch (error) {
        console.error('Error handling 2FA command:', error);
        await interaction.reply({
            content: '❌ Error processing 2FA command. Please try again.',
            ephemeral: true
        });
    }
}
