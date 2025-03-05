import { 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} from 'discord.js';
import { getTradeSettings, saveTradeSettings } from '../../../../../src/db/dynamo.mjs';

/**
 * Show a simple quick buy settings modal
 * @param {Object} interaction - Discord interaction
 */
export async function showSimpleQuickBuyModal(interaction) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId('simple_quick_buy_modal')
        .setTitle('Set Quick Buy Amounts');

    // Add inputs to the modal
    const minInput = new TextInputBuilder()
        .setCustomId('simple_min_buy')
        .setLabel('Minimum Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.1')
        .setRequired(true);

    const medInput = new TextInputBuilder()
        .setCustomId('simple_med_buy')
        .setLabel('Medium Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.5')
        .setRequired(true);

    const largeInput = new TextInputBuilder()
        .setCustomId('simple_large_buy')
        .setLabel('Large Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1.0')
        .setRequired(true);

    // Add inputs to rows
    const firstRow = new ActionRowBuilder().addComponents(minInput);
    const secondRow = new ActionRowBuilder().addComponents(medInput);
    const thirdRow = new ActionRowBuilder().addComponents(largeInput);

    // Add rows to the modal
    modal.addComponents(firstRow, secondRow, thirdRow);

    // Show the modal
    await interaction.showModal(modal);
}

/**
 * Handle the simplified quick buy modal submission
 * @param {Object} interaction - Discord interaction
 */
export async function handleSimpleQuickBuySubmit(interaction) {
    // Get the data entered by the user
    const minBuy = parseFloat(interaction.fields.getTextInputValue('simple_min_buy'));
    const medBuy = parseFloat(interaction.fields.getTextInputValue('simple_med_buy'));
    const largeBuy = parseFloat(interaction.fields.getTextInputValue('simple_large_buy'));
    
    console.log(`Quick buy values submitted: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);
    
    try {
        // Validate the input
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            return await interaction.reply({ 
                content: 'Please enter valid numbers', 
                ephemeral: true 
            });
        }

        // Save the settings to the database
        await saveTradeSettings(interaction.user.id, {
            minQuickBuy: minBuy,
            mediumQuickBuy: medBuy,
            largeQuickBuy: largeBuy
        });
        
        // Reply with success message
        await interaction.reply({ 
            content: `Settings saved successfully:\n• Min: ${minBuy} SOL\n• Medium: ${medBuy} SOL\n• Large: ${largeBuy} SOL`, 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error('Error saving quick buy settings:', error);
        
        // Reply with error message
        await interaction.reply({ 
            content: `Error saving settings: ${error.message}`, 
            ephemeral: true 
        });
    }
}

/**
 * Show a simple quick sell settings modal
 * @param {Object} interaction - Discord interaction
 */
export async function showSimpleQuickSellModal(interaction) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId('simple_quick_sell_modal')
        .setTitle('Set Quick Sell Amounts');

    // Add inputs to the modal
    const minInput = new TextInputBuilder()
        .setCustomId('simple_min_sell')
        .setLabel('Minimum Sell Amount (%)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('10')
        .setRequired(true);

    const medInput = new TextInputBuilder()
        .setCustomId('simple_med_sell')
        .setLabel('Medium Sell Amount (%)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('50')
        .setRequired(true);

    const largeInput = new TextInputBuilder()
        .setCustomId('simple_large_sell')
        .setLabel('Large Sell Amount (%)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('100')
        .setRequired(true);

    // Add inputs to rows
    const firstRow = new ActionRowBuilder().addComponents(minInput);
    const secondRow = new ActionRowBuilder().addComponents(medInput);
    const thirdRow = new ActionRowBuilder().addComponents(largeInput);

    // Add rows to the modal
    modal.addComponents(firstRow, secondRow, thirdRow);

    // Show the modal
    await interaction.showModal(modal);
}

/**
 * Handle the simplified quick sell modal submission
 * @param {Object} interaction - Discord interaction
 */
export async function handleSimpleQuickSellSubmit(interaction) {
    // Get the data entered by the user
    const minSell = parseFloat(interaction.fields.getTextInputValue('simple_min_sell'));
    const medSell = parseFloat(interaction.fields.getTextInputValue('simple_med_sell'));
    const largeSell = parseFloat(interaction.fields.getTextInputValue('simple_large_sell'));
    
    console.log(`Quick sell values submitted: min=${minSell}, med=${medSell}, large=${largeSell}`);
    
    try {
        // Validate the input
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            return await interaction.reply({ 
                content: 'Please enter valid numbers', 
                ephemeral: true 
            });
        }

        // Save the settings to the database
        await saveTradeSettings(interaction.user.id, {
            minQuickSell: minSell,
            mediumQuickSell: medSell,
            largeQuickSell: largeSell
        });
        
        // Reply with success message
        await interaction.reply({ 
            content: `Settings saved successfully:\n• Min: ${minSell}%\n• Medium: ${medSell}%\n• Large: ${largeSell}%`, 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error('Error saving quick sell settings:', error);
        
        // Reply with error message
        await interaction.reply({ 
            content: `Error saving settings: ${error.message}`, 
            ephemeral: true 
        });
    }
}

/**
 * Show trading settings dashboard
 * @param {Object} interaction - Discord interaction
 */
export async function showSimpleSettingsDashboard(interaction) {
    try {
        const settings = await getTradeSettings(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setTitle('Trading Settings')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: 'Quick Buy Amounts (SOL)',
                    value: `Min: ${settings.minQuickBuy}\nMedium: ${settings.mediumQuickBuy}\nLarge: ${settings.largeQuickBuy}`,
                    inline: true
                },
                {
                    name: 'Quick Sell Amounts (%)',
                    value: `Min: ${settings.minQuickSell}%\nMedium: ${settings.mediumQuickSell}%\nLarge: ${settings.largeQuickSell}%`,
                    inline: true
                }
            );
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('simple_set_quick_buy')
                    .setLabel('Set Quick Buy')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('simple_set_quick_sell')
                    .setLabel('Set Quick Sell')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error showing settings dashboard:', error);
        await interaction.reply({
            content: `Error loading settings: ${error.message}`,
            ephemeral: true
        });
    }
}
