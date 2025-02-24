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
} from 'discord.js';  // Add these imports
import { handleApplicationInteractions } from './src/handlers/applicationHandler.mjs';

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

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        try {
            await handleApplicationInteractions(interaction);
        } catch (error) {
            console.error('Button interaction error:', error);
        }
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'token_address_modal') {
        try {
            await handleTokenAddressSubmit(interaction);
        } catch (error) {
            console.error('Modal submit error:', error);
        }
    }
});

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

// Update modal submit handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    try {
        if (interaction.customId === 'verify_2fa_modal') {
            const code = interaction.fields.getTextInputValue('2fa_code');
            const isValid = await verify2FACode(interaction.user.id, code);

            if (isValid) {
                await interaction.reply({
                    content: '✅ 2FA setup completed successfully!',
                    ephemeral: true // Using simple ephemeral flag
                });

                // Wait a moment before showing the next step
                setTimeout(async () => {
                    await sendQuickStartSecurity(interaction, 'wallet_security');
                }, 1500);
            } else {
                await interaction.reply({
                    content: '❌ Invalid 2FA code. Please try again.',
                    ephemeral: true // Using simple ephemeral flag
                });
            }
        }
    } catch (error) {
        console.error('Modal submit error:', error);
        await interaction.reply({
            content: '❌ An error occurred. Please try again.',
            ephemeral: true // Using simple ephemeral flag
        });
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
