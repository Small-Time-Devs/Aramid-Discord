import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle 
} from 'discord.js';
import { checkUserWallet, saveMarketMakingConfig } from '../../../../../src/db/dynamo.mjs';

let marketMakingConfig = {};

export function registerMarketMakerSettingsHandlers(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'SOLANA_MARKET_MAKING_SETTINGS':
                    await handleSettingsMenu(interaction);
                    break;
                case 'SET_TOKEN_ADDRESS':
                    await showTokenAddressModal(interaction);
                    break;
                case 'SET_SLIPPAGE':
                    await showSlippageModal(interaction);
                    break;
                case 'SET_WALLETS_NUMBER':
                    await showWalletsNumberModal(interaction);
                    break;
                case 'SAVE_SETTINGS':
                    await handleSaveSettings(interaction);
                    break;
                // Add other button handlers...
            }
        }

        if (interaction.isModalSubmit()) {
            switch (interaction.customId) {
                case 'token_address_modal':
                    await handleTokenAddressSubmit(interaction);
                    break;
                case 'slippage_modal':
                    await handleSlippageSubmit(interaction);
                    break;
                // Add other modal submit handlers...
            }
        }
    });
}

async function handleSettingsMenu(interaction) {
    const userId = interaction.user.id;
    initializeConfig(userId);

    const embed = createSettingsEmbed(marketMakingConfig[userId]);
    const components = createSettingsButtons();

    await interaction.reply({
        embeds: [embed],
        components: components,
        ephemeral: true
    });
}

function createSettingsEmbed(config) {
    return new EmbedBuilder()
        .setTitle('Market Making Settings')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Token Address', value: config.outputMint || 'Not set', inline: true },
            { name: 'Slippage', value: `${config.slippage || 0}%`, inline: true },
            { name: 'Number of Wallets', value: `${config.numberOfWallets || 0}`, inline: true },
            // Add other fields...
        );
}

function createSettingsButtons() {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SET_TOKEN_ADDRESS')
                .setLabel('Set Token')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('SET_SLIPPAGE')
                .setLabel('Set Slippage')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SAVE_SETTINGS')
                .setLabel('Save Settings')
                .setStyle(ButtonStyle.Success)
        );

    return [row1, row2];
}

async function showTokenAddressModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('token_address_modal')
        .setTitle('Set Token Address');

    const tokenInput = new TextInputBuilder()
        .setCustomId('token_address')
        .setLabel('Enter token contract address')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(tokenInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleTokenAddressSubmit(interaction) {
    const tokenAddress = interaction.fields.getTextInputValue('token_address');
    const userId = interaction.user.id;

    marketMakingConfig[userId].outputMint = tokenAddress;
    await handleSettingsMenu(interaction);
}

async function handleSaveSettings(interaction) {
    const userId = interaction.user.id;
    const config = marketMakingConfig[userId];

    if (!config.outputMint) {
        await interaction.reply({
            content: '❌ Token address is required to save settings.',
            ephemeral: true
        });
        return;
    }

    try {
        await saveMarketMakingConfig(userId, config);
        await interaction.reply({
            content: '✅ Settings saved successfully!',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        await interaction.reply({
            content: '❌ Error saving settings. Please try again.',
            ephemeral: true
        });
    }
}

// Add other necessary functions...

