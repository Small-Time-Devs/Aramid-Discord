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
 * Show quick buy settings modal - ensuring proper naming consistency
 */
export async function showQuickBuyModal(interaction) {
    try {
        console.log('🔍 [SETTINGS] Opening quick buy modal for user:', interaction.user.id);
        const userId = interaction.user.id;
        
        // Get current settings to pre-fill
        console.log('🔍 [SETTINGS] Fetching current settings for pre-filling modal');
        const settings = await getTradeSettings(userId);
        console.log('🔍 [SETTINGS] Retrieved settings:', JSON.stringify(settings));
        
        // Ensure settings values are properly formatted for display in the modal
        const minBuyStr = settings.minQuickBuy ? settings.minQuickBuy.toString() : '0.1';
        const medBuyStr = settings.mediumQuickBuy ? settings.mediumQuickBuy.toString() : '0.5';
        const largeBuyStr = settings.largeQuickBuy ? settings.largeQuickBuy.toString() : '1.0';
        
        console.log(`🔍 [SETTINGS] Modal pre-fill values: min=${minBuyStr}, med=${medBuyStr}, large=${largeBuyStr}`);
        
        // Important: Keep this modal ID consistent with what your interaction handler expects
        const modal = new ModalBuilder()
            .setCustomId('quick_buy_modal')
            .setTitle('Set Quick Buy Amounts');

        // Important: Keep these input IDs consistent with what your handler expects
        const minInput = new TextInputBuilder()
            .setCustomId('min_buy')
            .setLabel('Minimum Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.1')
            .setValue(minBuyStr)
            .setRequired(true);

        const medInput = new TextInputBuilder()
            .setCustomId('med_buy')
            .setLabel('Medium Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.5')
            .setValue(medBuyStr)
            .setRequired(true);

        const largeInput = new TextInputBuilder()
            .setCustomId('large_buy')
            .setLabel('Large Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1.0')
            .setValue(largeBuyStr)
            .setRequired(true);

        // Wrap each input in its own ActionRow - this is important!
        const firstRow = new ActionRowBuilder().addComponents(minInput);
        const secondRow = new ActionRowBuilder().addComponents(medInput);
        const thirdRow = new ActionRowBuilder().addComponents(largeInput);
        
        modal.addComponents(firstRow, secondRow, thirdRow);

        console.log('🔍 [SETTINGS] Prepared modal with ID:', modal.data.custom_id);
        console.log('🔍 [SETTINGS] Modal component count:', modal.components.length);
        console.log('🔍 [SETTINGS] Modal components:', JSON.stringify(modal.components.map(c => c.components[0].data)));
        
        // This is how you properly display a modal per the documentation
        console.log('🔍 [SETTINGS] Attempting to show modal to user');
        await interaction.showModal(modal);
        console.log('🔍 [SETTINGS] Modal successfully shown to user');
        
    } catch (error) {
        console.error('❌ [SETTINGS ERROR] Error showing quick buy modal:', error);
        console.error('❌ [SETTINGS ERROR] Error stack:', error.stack);
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
        
        // Ensure settings values are properly formatted for display in the modal
        const minSellStr = settings.minQuickSell ? settings.minQuickSell.toString() : '10';
        const medSellStr = settings.mediumQuickSell ? settings.mediumQuickSell.toString() : '50';
        const largeSellStr = settings.largeQuickSell ? settings.largeQuickSell.toString() : '100';
        
        console.log(`Pre-filling modal with values: min=${minSellStr}, med=${medSellStr}, large=${largeSellStr}`);

        const modal = new ModalBuilder()
            .setCustomId('quick_sell_modal')
            .setTitle('Set Quick Sell Amounts');

        // Add components to modal
        const minSellInput = new TextInputBuilder()
            .setCustomId('min_sell')
            .setLabel('Minimum Sell Amount (% of tokens)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('10')
            .setValue(minSellStr)
            .setRequired(true);

        const medSellInput = new TextInputBuilder()
            .setCustomId('med_sell')
            .setLabel('Medium Sell Amount (% of tokens)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('50')
            .setValue(medSellStr)
            .setRequired(true);

        const largeSellInput = new TextInputBuilder()
            .setCustomId('large_sell')
            .setLabel('Large Sell Amount (% of tokens)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('100')
            .setValue(largeSellStr)
            .setRequired(true);

        // Add components to the modal
        const firstRow = new ActionRowBuilder().addComponents(minSellInput);
        const secondRow = new ActionRowBuilder().addComponents(medSellInput);
        const thirdRow = new ActionRowBuilder().addComponents(largeSellInput);
        
        modal.addComponents(firstRow, secondRow, thirdRow);

        console.log('Showing modal with ID:', modal.data.custom_id);
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
 * Handle quick buy settings submission - ensuring we properly handle the modal interaction
 */
export async function handleQuickBuySubmission(interaction) {
    try {
        const userId = interaction.user.id;
        console.log('🔍 [SETTINGS] Processing buy settings submission for user:', userId);
        console.log(`🔍 [SETTINGS] Modal ID: ${interaction.customId}`);
        console.log(`🔍 [SETTINGS] Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Important: Verify fields exist before trying to access them
        if (!interaction.fields.fields.has('min_buy') || 
            !interaction.fields.fields.has('med_buy') || 
            !interaction.fields.fields.has('large_buy')) {
            
            console.error('❌ [SETTINGS ERROR] Missing expected fields in modal submission');
            console.log('❌ [SETTINGS ERROR] Fields received:', Array.from(interaction.fields.fields.keys()));
            await interaction.reply({
                content: '❌ Form submission error: Missing required fields. Expected min_buy, med_buy, and large_buy.',
                ephemeral: true
            });
            return;
        }
        
        // Get values from form - using proper error handling
        console.log('🔍 [SETTINGS] Extracting form values');
        const minBuyStr = interaction.fields.getTextInputValue('min_buy');
        const medBuyStr = interaction.fields.getTextInputValue('med_buy');
        const largeBuyStr = interaction.fields.getTextInputValue('large_buy');
        
        console.log(`🔍 [SETTINGS] Buy values submitted as strings: min=${minBuyStr}, med=${medBuyStr}, large=${largeBuyStr}`);
        
        // Parse values as floats with proper error handling
        const minBuy = parseFloat(minBuyStr);
        const medBuy = parseFloat(medBuyStr);
        const largeBuy = parseFloat(largeBuyStr);
        
        console.log(`🔍 [SETTINGS] Buy values parsed as floats: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);
        
        // Important: Properly acknowledge the interaction first, then do processing
        // Use deferReply instead of editReply for initial interaction response
        console.log('🔍 [SETTINGS] Deferring reply to prevent timeout');
        await interaction.deferReply({ ephemeral: true });
        console.log('🔍 [SETTINGS] Reply deferred successfully');
        
        // Basic validation
        console.log('🔍 [SETTINGS] Validating input values');
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            console.log('❌ [SETTINGS ERROR] Invalid number inputs detected');
            await interaction.editReply({
                content: '❌ Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        if (minBuy <= 0 || medBuy <= 0 || largeBuy <= 0) {
            console.log('❌ [SETTINGS ERROR] Negative or zero values detected');
            await interaction.editReply({
                content: '❌ All values must be greater than zero',
                ephemeral: true
            });
            return;
        }
        
        // Save settings - wrap in try/catch for better error reporting
        try {
            console.log('🔍 [SETTINGS] Saving settings to database');
            console.log('🔍 [SETTINGS] Settings to save:', JSON.stringify({
                minQuickBuy: minBuy,
                mediumQuickBuy: medBuy,
                largeQuickBuy: largeBuy
            }));
            
            await saveTradeSettings(userId, {
                minQuickBuy: minBuy,
                mediumQuickBuy: medBuy,
                largeQuickBuy: largeBuy
            });
            console.log('✅ [SETTINGS] Quick buy settings saved successfully');
        } catch (saveError) {
            console.error('❌ [SETTINGS ERROR] Error saving settings:', saveError);
            console.error('❌ [SETTINGS ERROR] Error stack:', saveError.stack);
            await interaction.editReply({
                content: `❌ Failed to save settings: ${saveError.message}`,
                ephemeral: true
            });
            return;
        }
        
        // Show success message with updated settings
        try {
            console.log('🔍 [SETTINGS] Fetching updated settings for confirmation message');
            const settings = await getTradeSettings(userId);
            console.log('🔍 [SETTINGS] Retrieved updated settings:', JSON.stringify(settings));
            console.log('🔍 [SETTINGS] Showing success message');
            await showSettingsSuccessMessage(interaction, settings, 'buy');
            console.log('✅ [SETTINGS] Success message shown successfully');
        } catch (displayError) {
            console.error('❌ [SETTINGS ERROR] Error showing success message:', displayError);
            console.error('❌ [SETTINGS ERROR] Error stack:', displayError.stack);
            await interaction.editReply({
                content: '✅ Settings saved successfully, but there was an error displaying the updated values.',
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('❌ [SETTINGS ERROR] Unhandled error in quick buy submission:', error);
        console.error('❌ [SETTINGS ERROR] Error stack:', error.stack);
        
        // Simple error response based on interaction state
        if (interaction.deferred) {
            await interaction.editReply({
                content: `❌ Error saving settings: ${error.message}`,
                ephemeral: true
            });
        } else {
            // Important: Use reply for initial responses, not followUp
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
        console.log(`Modal ID: ${interaction.customId}`);
        console.log(`Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Get values from form
        const minSellStr = interaction.fields.getTextInputValue('min_sell');
        const medSellStr = interaction.fields.getTextInputValue('med_sell');
        const largeSellStr = interaction.fields.getTextInputValue('large_sell');
        
        console.log(`Sell values submitted as strings: min=${minSellStr}, med=${medSellStr}, large=${largeSellStr}`);
        
        // Parse values as floats with proper error handling
        const minSell = parseFloat(minSellStr);
        const medSell = parseFloat(medSellStr);
        const largeSell = parseFloat(largeSellStr);
        
        console.log(`Sell values parsed as floats: min=${minSell}, med=${medSell}, large=${largeSell}`);
        
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        
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
