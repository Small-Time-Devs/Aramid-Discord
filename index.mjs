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
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    console.log(`Button ${interaction.customId} clicked by ${interaction.user.tag}`);
    
    try {
        // Delete the previous menu message if it exists
        if (lastMenuMessage) {
            await lastMenuMessage.delete().catch(console.error);
            lastMenuMessage = null;
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
