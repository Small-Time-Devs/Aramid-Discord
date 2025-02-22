import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { save2FASecret, get2FASecret, checkUserWallet } from '../db/dynamo.mjs';

export async function enable2FA(userId, username) {
    const secret = speakeasy.generateSecret({ length: 20 });
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Save the secret to the user's account in the database
    await save2FASecret(userId, secret.base32);

    return { 
        secret: secret.base32, 
        qrCodeUrl,
        embed: {
            title: '🔒 2FA Setup',
            description: 'Scan this QR code with your authenticator app or enter the secret manually.',
            fields: [
                {
                    name: 'Secret Key',
                    value: `\`${secret.base32}\``,
                    inline: false
                }
            ],
            color: 0x00ff00
        }
    };
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
