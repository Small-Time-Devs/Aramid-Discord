import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { CHANNEL_IDS } from './src/globals/global.mjs';
import { 
    sendWelcomeMessage, 
    sendErrorMessage, 
    sendSuccessMessage,
    sendMainMenu,
    sendStartupMessage,
    sendHelpMenu
} from './src/utils/discordMessages.mjs';
import { handleButtonInteraction } from './src/utils/utils.mjs';
import { registerWalletHandlers } from './src/actions/viewWallet.mjs';
import { handle2FACommands, verify2FACode } from './src/utils/2fa.mjs';
import dotenv from 'dotenv';
import { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';
import { handleApplicationInteractions } from './src/handlers/applicationHandler.mjs';
// Import the handleTokenAddressSubmit function properly
import { handleTokenAddressSubmit } from './applications/chains/solana/spotTrading/solSpotTrading.mjs';
// Fix the import for redirectToPersonalChannel
// Make sure the path is correct
import { redirectToPersonalChannel, handlePersonalChannelInteraction } from './src/handlers/userChannelHandler.mjs';
import { showSolanaSpotTradingMenu } from './applications/chains/solana/spotTrading/ui/dashboard.mjs';

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

const commands = [
    {
        name: 'enable2fa',
        description: 'Enable Two-Factor Authentication for your account'
    },
    {
        name: 'verify2fa',
        description: 'Verify your 2FA code',
        options: [
            {
                name: 'code',
                description: 'Your 2FA code from authenticator app',
                type: 3, // STRING
                required: true
            }
        ]
    },
    {
        name: 'menu',
        description: 'Open the main menu'
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Bot ready event
client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
        
        // Find the designated channel for the main menu
        const mainChannel = client.channels.cache.get(CHANNEL_IDS.GENERAL);
        if (mainChannel) {
            // Delete previous messages in the channel (optional)
            try {
                const messages = await mainChannel.messages.fetch({ limit: 10 });
                await mainChannel.bulkDelete(messages);
            } catch (error) {
                console.error('Error cleaning channel:', error);
            }

            // Send the main menu
            lastMenuMessage = await sendMainMenu(mainChannel);
            console.log('Main menu displayed in general channel');
        } else {
            console.error('Could not find general channel');
        }
    } catch (error) {
        console.error('Error during startup:', error);
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
    if (message.author.bot) return;

    try {
        // Handle commands
        if (message.content.toLowerCase() === '!menu' || message.content.toLowerCase() === '.menu') {
            console.log(`Menu requested by ${message.author.tag}`);
            if (lastMenuMessage) {
                await lastMenuMessage.delete().catch(console.error);
            }
            lastMenuMessage = await sendMainMenu(message.channel);
            // Delete the command message for cleaner chat
            await message.delete().catch(console.error);
        }
    } catch (error) {
        console.error('Message handling error:', error);
        await sendErrorMessage(message.channel, {
            message: 'An error occurred processing your command. Please try again.'
        });
    }
});

// Update this interaction handler to properly handle modal submissions
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isModalSubmit()) {
            console.log(`Processing modal submission with ID: ${interaction.customId}`);

            // Handle different modal types
            switch (interaction.customId) {
                case 'token_address_modal':
                case 'token_address_input_modal':
                    await handleTokenAddressSubmit(interaction);
                    break;
                case 'coin_research_address_modal':
                    // Import dynamically to avoid circular dependencies
                    const { handleAddressSubmit } = await import('./applications/chains/solana/coinResearch/coinResearchMain.mjs');
                    await handleAddressSubmit(interaction);
                    break;
                case 'verify_2fa_modal':
                    const code = interaction.fields.getTextInputValue('2fa_code');
                    const isValid = await verify2FACode(interaction.user.id, code);
                    
                    if (isValid) {
                        await interaction.reply({
                            content: '✅ 2FA setup completed successfully!',
                            ephemeral: true
                        });
                        
                        // Wait a moment before showing the next step
                        setTimeout(async () => {
                            await sendQuickStartSecurity(interaction, 'wallet_security');
                        }, 1500);
                    } else {
                        await interaction.reply({
                            content: '❌ Invalid 2FA code. Please try again.',
                            ephemeral: true
                        });
                    }
                    break;
                default:
                    console.log(`Unhandled modal submission: ${interaction.customId}`);
                    break;
            }
            return;
        }

        // Handle button interactions
        if (interaction.isButton()) {
            await handleApplicationInteractions(interaction);
        }

        // Handle the "Get Started" button from main menu
        if (interaction.isButton() && interaction.customId === 'create_personal_channel') {
            console.log(`[DEBUG] User ${interaction.user.tag} clicked Get Started button`);
            
            try {
                // Try the imported function first
                if (typeof redirectToPersonalChannel === 'function') {
                    await redirectToPersonalChannel(interaction);
                } else {
                    // If it's not defined, use the fallback
                    console.warn('[WARN] Using fallback channel creation function');
                    await fallbackRedirectToPersonalChannel(interaction);
                }
            } catch (channelError) {
                console.error('[ERROR] Failed to create personal channel:', channelError);
                await interaction.reply({
                    content: 'Sorry, there was an error creating your personal channel. Please try again later.',
                    ephemeral: true
                });
            }
            return;
        }
    } catch (error) {
        console.error('Interaction error:', error);
        // Attempt to reply if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: 'An error occurred while processing your request. Please try again.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    }
});

// Backup implementation in case the import fails
async function fallbackRedirectToPersonalChannel(interaction) {
    try {
        console.log('[FALLBACK] Using fallback channel creation function');
        await interaction.deferReply({ ephemeral: true });

        // Use the direct import to ensure we get the function
        const { getOrCreateUserChannel } = await import('./src/services/channelManager.mjs');
        const userChannel = await getOrCreateUserChannel(interaction);

        if (!userChannel) {
            throw new Error('Failed to create channel');
        }

        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('Welcome to Your Personal Trading Channel!')
            .setDescription(`Hello ${interaction.user.toString()}, this is your dedicated channel for trading with Aramid Bot.`)
            .setColor(0x0099FF)
            .addFields(
                { name: 'Privacy', value: 'Only you and server admins can see this channel.', inline: false },
                { name: 'Get Started', value: 'Click the button below to start trading.', inline: false }
            );

        const startButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_trading')
                    .setLabel('Start Trading')
                    .setStyle(ButtonStyle.Success)
            );

        await userChannel.send({
            content: `${interaction.user.toString()} Welcome to your personal trading channel!`,
            embeds: [welcomeEmbed],
            components: [startButton]
        });

        await interaction.editReply({
            content: `I've created a personal trading channel for you: <#${userChannel.id}>. Please continue there!`,
            ephemeral: true
        });

    } catch (error) {
        console.error('[FALLBACK] Error in fallback channel creation:', error);
        await interaction.reply({
            content: `Sorry, I couldn't create your personal channel: ${error.message}. Please try again later.`,
            ephemeral: true
        });
    }
}

// Slash command handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    try {
        switch (interaction.commandName) {
            case 'menu':
                if (lastMenuMessage) {
                    await lastMenuMessage.delete().catch(console.error);
                }
                await interaction.deferReply();
                lastMenuMessage = await sendMainMenu(interaction.channel);
                await interaction.deleteReply();
                break;
            case 'enable2fa':
            case 'verify2fa':
                await handle2FACommands(interaction);
                break;
        }
    } catch (error) {
        console.error('Slash command error:', error);
        await interaction.reply({
            content: '❌ An error occurred. Please try again.',
            ephemeral: true
        }).catch(console.error);
    }
});

// Register wallet handlers
registerWalletHandlers(client);

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
