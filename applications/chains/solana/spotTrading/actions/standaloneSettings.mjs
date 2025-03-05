import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';
import { getTradeSettings, saveTradeSettings } from '../../../../../src/db/dynamo.mjs';

// Track active settings updates to prevent collisions
const activeSettingsUpdates = new Set();

/**
 * Display settings dashboard
 */
export async function displayDashboard(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        console.log(`Loading settings for user ${interaction.user.id}`);
        
        const settings = await getTradeSettings(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Trading Settings')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: '💰 Quick Buy Amounts (SOL)',
                    value: `Min: ${settings.minQuickBuy} SOL\nMed: ${settings.mediumQuickBuy} SOL\nLarge: ${settings.largeQuickBuy} SOL`,
                    inline: true
                },
                {
                    name: '💸 Quick Sell Amounts (%)',
                    value: `Min: ${settings.minQuickSell}%\nMed: ${settings.mediumQuickSell}%\nLarge: ${settings.largeQuickSell}%`,
                    inline: true
                }
            );
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('standalone_quick_buy_button')
                    .setLabel('Set Buy Amounts')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('standalone_quick_sell_button')
                    .setLabel('Set Sell Amounts')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error displaying settings dashboard:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: `❌ Error loading settings: ${error.message}`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ Error loading settings: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

/**
 * Show buy settings modal
 */
export async function showBuyModal(interaction) {
    try {
        // Get current settings to pre-fill
        const settings = await getTradeSettings(interaction.user.id);
        
        const modal = new ModalBuilder()
            .setCustomId('standalone_buy_modal')
            .setTitle('Quick Buy Amounts');
            
        const minInput = new TextInputBuilder()
            .setCustomId('standalone_buy_min')
            .setLabel('Minimum Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.1')
            .setValue(settings.minQuickBuy.toString())
            .setRequired(true);
            
        const medInput = new TextInputBuilder()
            .setCustomId('standalone_buy_med')
            .setLabel('Medium Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.5')
            .setValue(settings.mediumQuickBuy.toString())
            .setRequired(true);
            
        const largeInput = new TextInputBuilder()
            .setCustomId('standalone_buy_large')
            .setLabel('Large Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1.0')
            .setValue(settings.largeQuickBuy.toString())
            .setRequired(true);
            
        modal.addComponents(
            new ActionRowBuilder().addComponents(minInput),
            new ActionRowBuilder().addComponents(medInput),
            new ActionRowBuilder().addComponents(largeInput)
        );
        
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing buy settings modal:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Show sell settings modal
 */
export async function showSellModal(interaction) {
    try {
        // Get current settings to pre-fill
        const settings = await getTradeSettings(interaction.user.id);
        
        const modal = new ModalBuilder()
            .setCustomId('standalone_sell_modal')
            .setTitle('Quick Sell Percentages');
            
        const minInput = new TextInputBuilder()
            .setCustomId('standalone_sell_min')
            .setLabel('Minimum Sell Amount (%)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('10')
            .setValue(settings.minQuickSell.toString())
            .setRequired(true);
            
        const medInput = new TextInputBuilder()
            .setCustomId('standalone_sell_med')
            .setLabel('Medium Sell Amount (%)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('50')
            .setValue(settings.mediumQuickSell.toString())
            .setRequired(true);
            
        const largeInput = new TextInputBuilder()
            .setCustomId('standalone_sell_large')
            .setLabel('Large Sell Amount (%)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('100')
            .setValue(settings.largeQuickSell.toString())
            .setRequired(true);
            
        modal.addComponents(
            new ActionRowBuilder().addComponents(minInput),
            new ActionRowBuilder().addComponents(medInput),
            new ActionRowBuilder().addComponents(largeInput)
        );
        
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing sell settings modal:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle buy settings form submission
 */
export async function handleBuySubmit(interaction) {
    const userId = interaction.user.id;
    
    // Prevent duplicate submissions
    if (activeSettingsUpdates.has(userId)) {
        await interaction.reply({
            content: '⏳ Your previous settings update is still being processed. Please wait.',
            ephemeral: true
        });
        return;
    }
    
    activeSettingsUpdates.add(userId);
    
    try {
        console.log('Processing buy settings submission');
        
        // Get form values
        const minBuy = parseFloat(interaction.fields.getTextInputValue('standalone_buy_min'));
        const medBuy = parseFloat(interaction.fields.getTextInputValue('standalone_buy_med'));
        const largeBuy = parseFloat(interaction.fields.getTextInputValue('standalone_buy_large'));
        
        console.log(`User ${userId} submitted buy settings: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);
        
        // Basic validation
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            throw new Error('Please enter valid numbers');
        }
        
        if (minBuy < 0 || medBuy < 0 || largeBuy < 0) {
            throw new Error('Values must be positive');
        }
        
        // Save settings to database
        await saveTradeSettings(userId, {
            minQuickBuy: minBuy,
            mediumQuickBuy: medBuy,
            largeQuickBuy: largeBuy
        });
        
        console.log(`Saved buy settings for user ${userId}`);
        
        // Reply with success message
        await interaction.reply({
            content: `✅ Buy settings saved successfully.`,
            ephemeral: true
        });
        
        // Show updated dashboard
        await displayDashboard(interaction);
        
    } catch (error) {
        console.error(`Error processing buy settings for user ${userId}:`, error);
        
        // Handle error response
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error: ${error.message}`,
                ephemeral: true
            });
        }
    } finally {
        // Always clean up the active updates set
        activeSettingsUpdates.delete(userId);
    }
}

/**
 * Handle sell settings form submission
 */
export async function handleSellSubmit(interaction) {
    const userId = interaction.user.id;
    
    // Prevent duplicate submissions
    if (activeSettingsUpdates.has(userId)) {
        await interaction.reply({
            content: '⏳ Your previous settings update is still being processed. Please wait.',
            ephemeral: true
        });
        return;
    }
    
    activeSettingsUpdates.add(userId);
    
    try {
        console.log('Processing sell settings submission');
        
        // Get form values
        const minSell = parseFloat(interaction.fields.getTextInputValue('standalone_sell_min'));
        const medSell = parseFloat(interaction.fields.getTextInputValue('standalone_sell_med'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('standalone_sell_large'));
        
        console.log(`User ${userId} submitted sell settings: min=${minSell}, med=${medSell}, large=${largeSell}`);
        
        // Basic validation
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            throw new Error('Please enter valid numbers');
        }
        
        if (minSell < 0 || medSell < 0 || largeSell < 0) {
            throw new Error('Values must be positive');
        }
        
        if (largeSell > 100) {
            throw new Error('Maximum sell percentage cannot exceed 100%');
        }
        
        // Save settings to database
        await saveTradeSettings(userId, {
            minQuickSell: minSell,
            mediumQuickSell: medSell,
            largeQuickSell: largeSell
        });
        
        console.log(`Saved sell settings for user ${userId}`);
        
        // Reply with success message
        await interaction.reply({
            content: `✅ Sell settings saved successfully.`,
            ephemeral: true
        });
        
        // Show updated dashboard
        await displayDashboard(interaction);
        
    } catch (error) {
        console.error(`Error processing sell settings for user ${userId}:`, error);
        
        // Handle error response
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error: ${error.message}`,
                ephemeral: true
            });
        }
    } finally {
        // Always clean up the active updates set
        activeSettingsUpdates.delete(userId);
    }
}

// Export all functions to be used by the application handler
export const standaloneSettings = {
    displayDashboard,
    showBuyModal,
    showSellModal,
    handleBuySubmit,
    handleSellSubmit
};
