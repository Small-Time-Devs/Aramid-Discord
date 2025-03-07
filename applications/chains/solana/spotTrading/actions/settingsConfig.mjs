import { 
    EmbedBuilder,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { getTradeSettings, saveTradeSettings } from '../../../../../src/db/dynamo.mjs';
import { showTradeSettingsMenu } from '../ui/settingsConfig.mjs';
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
 * Show quick buy settings modal - using the technique from your original code
 */
export async function showQuickBuyModal(interaction) {
    try {
        console.log('Opening quick buy settings modal...');
        
        const userId = interaction.user.id;
        const settings = await getTradeSettings(userId);
        
        // Get default values from settings
        const minBuyStr = settings.minQuickBuy ? settings.minQuickBuy.toString() : '0.1';
        const medBuyStr = settings.mediumQuickBuy ? settings.mediumQuickBuy.toString() : '0.5';
        const largeBuyStr = settings.largeQuickBuy ? settings.largeQuickBuy.toString() : '1.0';
        
        // Create modal
        const modal = new ModalBuilder()
            .setCustomId('quick_buy_modal')
            .setTitle('Set Quick Buy Amounts');

        // Add components to modal
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

        modal.addComponents(
            new ActionRowBuilder().addComponents(minInput),
            new ActionRowBuilder().addComponents(medInput),
            new ActionRowBuilder().addComponents(largeInput)
        );

        // Show the modal
        await interaction.showModal(modal);
        
        // Wait for modal submission using the technique from your original code
        try {
            console.log('Waiting for modal submission...');
            
            // Note: This will only work if the code is running in an environment 
            // where awaitModalSubmit is supported (like using the client.on method)
            const modalSubmitInteraction = await interaction.awaitModalSubmit({
                filter: (i) => i.customId === 'quick_buy_modal' && i.user.id === interaction.user.id,
                time: 60000 // 1 minute timeout
            });
            
            console.log('Modal submission received!');
            
            // Get values from modal
            const minBuy = parseFloat(modalSubmitInteraction.fields.getTextInputValue('min_buy'));
            const medBuy = parseFloat(modalSubmitInteraction.fields.getTextInputValue('med_buy'));
            const largeBuy = parseFloat(modalSubmitInteraction.fields.getTextInputValue('large_buy'));
            
            console.log(`Values from modal: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);
            
            // Validate inputs
            if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
                await modalSubmitInteraction.reply({
                    content: '❌ Please enter valid numbers for all fields.',
                    ephemeral: true
                });
                return;
            }
            
            if (minBuy <= 0 || medBuy <= 0 || largeBuy <= 0) {
                await modalSubmitInteraction.reply({
                    content: '❌ All values must be greater than zero.',
                    ephemeral: true
                });
                return;
            }
            
            // Save settings to database
            await saveTradeSettings(interaction.user.id, {
                minQuickBuy: minBuy,
                mediumQuickBuy: medBuy,
                largeQuickBuy: largeBuy
            });
            
            console.log('Settings saved successfully');
            
            // Send success message directly (as in your original code)
            const embed = new EmbedBuilder()
                .setTitle('✅ Settings Updated')
                .setDescription('Your quick buy settings have been saved')
                .setColor(0x00FF00)
                .addFields({
                    name: '📈 Quick Buy Amounts (SOL)',
                    value: [
                        `Min: ${minBuy}`,
                        `Medium: ${medBuy}`,
                        `Large: ${largeBuy}`
                    ].join('\n'),
                    inline: true
                });
                
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('set_quick_sell')
                        .setLabel('Set Quick Sell')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('back_to_spot_trading')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            await modalSubmitInteraction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            
        } catch (submitError) {
            console.error('Modal submission error:', submitError);
            
            // This error usually means the modal timed out or was never submitted
            if (submitError.code === 'INTERACTION_COLLECTOR_ERROR') {
                console.log('Modal timed out or was never submitted');
                return;
            }
            
            // Handle any other errors
            await interaction.followUp({
                content: `❌ Failed to save settings: ${submitError.message}`,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('Error showing quick buy modal:', error);
        await interaction.reply({
            content: `❌ Error showing settings form: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Show quick sell settings modal - using the technique from your original code
 */
export async function showQuickSellModal(interaction) {
    try {
        console.log('Opening quick sell settings modal...');
        
        const userId = interaction.user.id;
        const settings = await getTradeSettings(userId);
        
        // Get default values from settings
        const minSellStr = settings.minQuickSell ? settings.minQuickSell.toString() : '10';
        const medSellStr = settings.mediumQuickSell ? settings.mediumQuickSell.toString() : '50';
        const largeSellStr = settings.largeQuickSell ? settings.largeQuickSell.toString() : '100';
        
        // Create modal
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

        modal.addComponents(
            new ActionRowBuilder().addComponents(minSellInput),
            new ActionRowBuilder().addComponents(medSellInput),
            new ActionRowBuilder().addComponents(largeSellInput)
        );

        // Show the modal
        await interaction.showModal(modal);
        
        // Wait for modal submission
        try {
            console.log('Waiting for modal submission...');
            
            const modalSubmitInteraction = await interaction.awaitModalSubmit({
                filter: (i) => i.customId === 'quick_sell_modal' && i.user.id === interaction.user.id,
                time: 60000 // 1 minute timeout
            });
            
            console.log('Modal submission received!');
            
            // Get values from modal
            const minSell = parseFloat(modalSubmitInteraction.fields.getTextInputValue('min_sell'));
            const medSell = parseFloat(modalSubmitInteraction.fields.getTextInputValue('med_sell'));
            const largeSell = parseFloat(modalSubmitInteraction.fields.getTextInputValue('large_sell'));
            
            console.log(`Values from modal: min=${minSell}, med=${medSell}, large=${largeSell}`);
            
            // Validate inputs
            if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
                await modalSubmitInteraction.reply({
                    content: '❌ Please enter valid numbers for all fields.',
                    ephemeral: true
                });
                return;
            }
            
            if (minSell <= 0 || medSell <= 0 || largeSell <= 0) {
                await modalSubmitInteraction.reply({
                    content: '❌ All values must be greater than zero.',
                    ephemeral: true
                });
                return;
            }
            
            if (largeSell > 100) {
                await modalSubmitInteraction.reply({
                    content: '❌ Maximum sell percentage cannot exceed 100%.',
                    ephemeral: true
                });
                return;
            }
            
            // Save settings to database
            await saveTradeSettings(interaction.user.id, {
                minQuickSell: minSell,
                mediumQuickSell: medSell,
                largeQuickSell: largeSell
            });
            
            console.log('Settings saved successfully');
            
            // Send success message directly
            const embed = new EmbedBuilder()
                .setTitle('✅ Settings Updated')
                .setDescription('Your quick sell settings have been saved')
                .setColor(0x00FF00)
                .addFields({
                    name: '📉 Quick Sell Amounts (% of tokens)',
                    value: [
                        `Min: ${minSell}%`,
                        `Medium: ${medSell}%`,
                        `Large: ${largeSell}%`
                    ].join('\n'),
                    inline: true
                });
                
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('set_quick_buy')
                        .setLabel('Set Quick Buy')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('back_to_spot_trading')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            await modalSubmitInteraction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            
        } catch (submitError) {
            console.error('Modal submission error:', submitError);
            
            if (submitError.code === 'INTERACTION_COLLECTOR_ERROR') {
                console.log('Modal timed out or was never submitted');
                return;
            }
            
            await interaction.followUp({
                content: `❌ Failed to save settings: ${submitError.message}`,
                ephemeral: true
            });
        }
        
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
 * Note: This function is kept for backwards compatibility but isn't used in the awaitModalSubmit approach
 */
export async function handleQuickBuySubmission(interaction) {
    try {
        const userId = interaction.user.id;
        console.log('Processing buy settings submission for user:', userId);
        console.log(`Modal ID: ${interaction.customId}`);
        console.log(`Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Get values from form
        const minBuyStr = interaction.fields.getTextInputValue('min_buy');
        const medBuyStr = interaction.fields.getTextInputValue('med_buy');
        const largeBuyStr = interaction.fields.getTextInputValue('large_buy');
        
        console.log(`Buy values: min=${minBuyStr}, med=${medBuyStr}, large=${largeBuyStr}`);
        
        // Parse values
        const minBuy = parseFloat(minBuyStr);
        const medBuy = parseFloat(medBuyStr);
        const largeBuy = parseFloat(largeBuyStr);
        
        // Basic validation
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            await interaction.reply({
                content: '❌ Please enter valid numbers for all fields.',
                ephemeral: true
            });
            return;
        }
        
        if (minBuy <= 0 || medBuy <= 0 || largeBuy <= 0) {
            await interaction.reply({
                content: '❌ All values must be greater than zero.',
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
        
        // Direct reply with simple message
        await interaction.reply({
            content: `✅ Quick buy settings saved:\n• Min: ${minBuy} SOL\n• Medium: ${medBuy} SOL\n• Large: ${largeBuy} SOL`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling quick buy submission:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error saving settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error saving settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle quick sell settings submission
 * Note: This function is kept for backwards compatibility but isn't used in the awaitModalSubmit approach
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
        
        console.log(`Sell values: min=${minSellStr}, med=${medSellStr}, large=${largeSellStr}`);
        
        // Parse values
        const minSell = parseFloat(minSellStr);
        const medSell = parseFloat(medSellStr);
        const largeSell = parseFloat(largeSellStr);
        
        // Basic validation
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            await interaction.reply({
                content: '❌ Please enter valid numbers for all fields.',
                ephemeral: true
            });
            return;
        }
        
        if (minSell <= 0 || medSell <= 0 || largeSell <= 0) {
            await interaction.reply({
                content: '❌ All values must be greater than zero.',
                ephemeral: true
            });
            return;
        }
        
        if (largeSell > 100) {
            await interaction.reply({
                content: '❌ Maximum sell percentage cannot exceed 100%.',
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
        
        // Direct reply with simple message
        await interaction.reply({
            content: `✅ Quick sell settings saved:\n• Min: ${minSell}%\n• Medium: ${medSell}%\n• Large: ${largeSell}%`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling quick sell submission:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error saving settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error saving settings: ${error.message}. Please try again.`,
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
