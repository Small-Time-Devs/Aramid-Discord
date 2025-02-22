import { Client, GatewayIntentBits } from 'discord.js';
import { CHANNEL_IDS } from './src/globals/global.mjs';
import { 
    sendWelcomeMessage, 
    sendErrorMessage, 
    sendSuccessMessage,
    sendMainMenu,
    sendChainSelection 
} from './src/utils/discordMessages.mjs';
import dotenv from 'dotenv';
import { registerDiscordUser } from './src/db/dynamo.mjs';
import { checkAndHandleDisclaimer, handleDisclaimerResponse } from './src/utils/disclaimer.mjs';
import { enable2FA, handle2FAVerification, require2FASetup } from './src/utils/2fa.mjs';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// Add this variable at the top level to track the last menu message
let lastMenuMessage = null;

// Bot ready event
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    const generalChannel = client.channels.cache.get(CHANNEL_IDS.GENERAL);
    if (generalChannel) {
        sendSuccessMessage(generalChannel, 'Bot is now online!');
    }
});

// New member join event
client.on('guildMemberAdd', async (member) => {
    const welcomeChannel = client.channels.cache.get(CHANNEL_IDS.WELCOME);
    if (welcomeChannel) {
        await sendWelcomeMessage(welcomeChannel);
    }
});

// Message event handler
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    try {
        // Register user on first message
        await registerDiscordUser(
            message.author.id,
            message.author.username
        );

        // Command handler
        if (message.content.startsWith('!')) {
            const args = message.content.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            try {
                switch (command) {
                    case 'ping':
                        await message.reply('Pong!');
                        break;
                    case 'help':
                        await message.reply('Available commands:\n!menu - Show the main menu\n!ping - Check bot response\n!help - Show this help message');
                        break;
                    case 'menu':
                        console.log(`Menu requested by ${message.author.tag}`);
                        if (lastMenuMessage) {
                            await lastMenuMessage.delete().catch(console.error);
                        }
                        lastMenuMessage = await sendMainMenu(message.channel);
                        break;
                    default:
                        await message.reply('Unknown command. Use !help for available commands.');
                }
            } catch (error) {
                console.error('Command error:', error);
                await sendErrorMessage(message.channel, error);
            }
        }
    } catch (error) {
        console.error('Message handling error:', error);
        await sendErrorMessage(message.channel, error);
    }
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // Handle disclaimer responses
    if (interaction.customId === 'agree_terms' || interaction.customId === 'disagree_terms') {
        await handleDisclaimerResponse(interaction);
        return;
    }

    // Check disclaimer before processing other buttons
    const hasAgreed = await checkAndHandleDisclaimer(interaction);
    if (!hasAgreed) return;

    console.log(`Button ${interaction.customId} clicked by ${interaction.user.tag}`);
    
    try {
        // Register user on first interaction
        await registerDiscordUser(
            interaction.user.id,
            interaction.user.username
        );

        // Delete the previous menu message if it exists
        if (lastMenuMessage) {
            await lastMenuMessage.delete().catch(console.error);
            lastMenuMessage = null;
        }

        // Check 2FA requirement before processing protected actions
        if (interaction.customId.startsWith('protected_')) {
            const has2FA = await require2FASetup(interaction);
            if (!has2FA) return;
        }

        switch (interaction.customId) {
            case 'view_wallet':
                console.log('Wallet view requested');
                await interaction.reply('Wallet viewing functionality coming soon!');
                break;
            case 'research_token':
                console.log('Token research requested');
                await interaction.reply('Enter the token address you want to research:');
                break;
            case 'chain_selection':
                console.log('Chain selection menu opened');
                lastMenuMessage = await sendChainSelection(interaction.channel);
                await interaction.deferUpdate();
                break;
            case 'chain_solana':
                console.log('Solana chain selected');
                await interaction.reply('Solana chain selected!');
                break;
            case 'chain_ethereum':
                console.log('Ethereum chain selected');
                await interaction.reply('Ethereum chain selected!');
                break;
        }
    } catch (error) {
        console.error('Interaction error:', error);
        await sendErrorMessage(interaction.channel, error);
    }
});

// Add slash command handler for 2FA commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'enable2fa') {
        try {
            const { qrCodeUrl, embed } = await enable2FA(
                interaction.user.id,
                interaction.user.username
            );

            // Convert QR code to attachment
            const qrBuffer = Buffer.from(qrCodeUrl.split(',')[1], 'base64');
            const attachment = { attachment: qrBuffer, name: '2fa-qr.png' };

            await interaction.reply({
                files: [attachment],
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error enabling 2FA:', error);
            await interaction.reply({
                content: '❌ Error enabling 2FA. Please try again.',
                ephemeral: true
            });
        }
    }

    if (interaction.commandName === 'verify2fa') {
        await handle2FAVerification(interaction);
    }
});

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
    const adminChannel = client.channels.cache.get(CHANNEL_IDS.ADMIN);
    if (adminChannel) {
        sendErrorMessage(adminChannel, error);
    }
});

// Login
client.login(process.env.DISCORD_TOKEN).catch(console.error);
