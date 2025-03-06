import { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder
} from 'discord.js';
import { getTradeSettings, saveTradeSettings } from '../../../../../src/db/dynamo.mjs';
import { showTradeSettingsMenu, showSettingsSuccessMessage } from '../ui/settingsConfig.mjs';
import { showSolanaSpotTradingMenu } from '../ui/dashboard.mjs';

/**
 * Handle trade settings button
 */
export async function handleTradeSettings(interaction) {
    try {
        await interaction.deferUpdate();
        console.log(`Getting settings for user: ${interaction.user.id}`);
        
        const settings = await getTradeSettings(interaction.user.id);
        await showTradeSettingsMenu(interaction, settings);
        
    } catch (error) {
        console.error('Error handling trade settings:', error);
        await interaction.followUp({
            content: `❌ Error loading trade settings: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Show quick buy settings modal
 */
export async function showQuickBuyModal(interaction) {
    try {
        console.log('Opening quick buy settings modal');
        const userId = interaction.user.id;
        
        // Get current settings to pre-fill
        const settings = await getTradeSettings(userId);
        
        const modal = new ModalBuilder()
            .setCustomId('quick_buy_modal')
            .setTitle('Set Quick Buy Amounts');

        // Add components to modal
        const minInput = new TextInputBuilder()
            .setCustomId('min_buy')
            .setLabel('Minimum Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.1')
            .setValue(settings.minQuickBuy.toString())
            .setRequired(true);

        const medInput = new TextInputBuilder()
            .setCustomId('med_buy')
            .setLabel('Medium Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.5')
            .setValue(settings.mediumQuickBuy.toString())
            .setRequired(true);

        const largeInput = new TextInputBuilder()
            .setCustomId('large_buy')
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
        console.error('Error showing quick buy modal:', error);
        await interaction.reply({
            content: `❌ Error showing settings form: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Show quick sell settings modal
 */
export async function showQuickSellModal(interaction) {
    try {
        console.log('Opening quick sell settings modal');
        const userId = interaction.user.id;
        
        // Get current settings to pre-fill
        const settings = await getTradeSettings(userId);
        
        const modal = new ModalBuilder()
            .setCustomId('quick_sell_modal')
            .setTitle('Set Quick Sell Amounts');

        // Add components to modal
        const minSellInput = new TextInputBuilder()
            .setCustomId('min_sell')
            .setLabel('Minimum Sell Amount (% of tokens)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('10')
            .setValue(settings.minQuickSell.toString())
            .setRequired(true);

        const medSellInput = new TextInputBuilder()
            .setCustomId('med_sell')
            .setLabel('Medium Sell Amount (% of tokens)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('50')
            .setValue(settings.mediumQuickSell.toString())
            .setRequired(true);

        const largeSellInput = new TextInputBuilder()
            .setCustomId('large_sell')
            .setLabel('Large Sell Amount (% of tokens)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('100')
            .setValue(settings.largeQuickSell.toString())
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(minSellInput),
            new ActionRowBuilder().addComponents(medSellInput),
            new ActionRowBuilder().addComponents(largeSellInput)
        );

        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing quick sell modal:', error);
        await interaction.reply({
            content: `❌ Error showing sell settings form: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle quick buy settings submission
 */
export async function handleQuickBuySubmission(interaction) {
    try {
        const userId = interaction.user.id;
        console.log('Processing buy settings submission for user:', userId);
        
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        
        // Get values from form
        const minBuy = parseFloat(interaction.fields.getTextInputValue('min_buy'));
        const medBuy = parseFloat(interaction.fields.getTextInputValue('med_buy'));
        const largeBuy = parseFloat(interaction.fields.getTextInputValue('large_buy'));
        
        console.log(`Buy values submitted: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);
        
        // Basic validation
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            await interaction.editReply({
                content: '❌ Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        if (minBuy <= 0 || medBuy <= 0 || largeBuy <= 0) {
            await interaction.editReply({
                content: '❌ All values must be greater than zero',
                ephemeral: true
            });
            return;
        }
        
        // Save settings
        await saveTradeSettings(userId, {
            minQuickBuy: minBuy,
            mediumQuickBuy: medBuy,
            largeQuickBuy: largeBuy
        });
        
        console.log('Quick buy settings saved successfully');
        
        // Show success message with updated settings
        const settings = await getTradeSettings(userId);
        await showSettingsSuccessMessage(interaction, settings, 'buy');
        
    } catch (error) {
        console.error('Error in quick buy submission:', error);
        
        // Simple error response
        if (interaction.deferred) {
            await interaction.editReply({
                content: `❌ Error saving settings: ${error.message}`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ Error saving settings: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle quick sell settings submission
 */
export async function handleQuickSellSubmission(interaction) {
    try {
        const userId = interaction.user.id;
        console.log('Processing sell settings submission for user:', userId);
        
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        
        // Get values from form
        const minSell = parseFloat(interaction.fields.getTextInputValue('min_sell'));
        const medSell = parseFloat(interaction.fields.getTextInputValue('med_sell'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('large_sell'));
        
        console.log(`Sell values submitted: min=${minSell}%, med=${medSell}%, large=${largeSell}%`);
        
        // Basic validation
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            await interaction.editReply({
                content: '❌ Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        if (minSell <= 0 || medSell <= 0 || largeSell <= 0) {
            await interaction.editReply({
                content: '❌ All values must be greater than zero',
                ephemeral: true
            });
            return;
        }
        
        if (largeSell > 100) {
            await interaction.editReply({
                content: '❌ Maximum sell percentage cannot exceed 100%',
                ephemeral: true
            });
            return;
        }
        
        // Save settings
        await saveTradeSettings(userId, {
            minQuickSell: minSell,
            mediumQuickSell: medSell,
            largeQuickSell: largeSell
        });
        
        console.log('Quick sell settings saved successfully');
        
        // Show success message with updated settings
        const settings = await getTradeSettings(userId);
        await showSettingsSuccessMessage(interaction, settings, 'sell');
        
    } catch (error) {
        console.error('Error in quick sell submission:', error);
        
        // Simple error response
        if (interaction.deferred) {
            await interaction.editReply({
                content: `❌ Error saving settings: ${error.message}`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ Error saving settings: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle the back to spot trading button
 */
export async function handleBackToSpotTrading(interaction) {
    try {
        await showSolanaSpotTradingMenu(interaction);
    } catch (error) {
        console.error('Error returning to trading menu:', error);
        await interaction.followUp({
            content: '❌ Failed to return to trading menu. Please try again.',
            ephemeral: true
        });
    }
}
