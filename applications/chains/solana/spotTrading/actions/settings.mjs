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
import { showSolanaSpotTradingMenu } from '../ui/dashboard.mjs';

// Track active settings updates to prevent collisions
const activeSettingsUpdates = new Set();

/**
 * Handle settings button click - unified approach from directSettings
 */
export async function handleSettingsButton(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        console.log(`Getting settings for user: ${interaction.user.id}`);
        
        const settings = await getTradeSettings(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setTitle('Trading Settings')
            .setDescription('Configure your quick trade amounts')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: 'Quick Buy Amounts (SOL)',
                    value: [
                        `Min: ${settings.minQuickBuy}`,
                        `Medium: ${settings.mediumQuickBuy}`,
                        `Large: ${settings.largeQuickBuy}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: 'Quick Sell Amounts (%)',
                    value: [
                        `Min: ${settings.minQuickSell}%`,
                        `Medium: ${settings.mediumQuickSell}%`,
                        `Large: ${settings.largeQuickSell}%`
                    ].join('\n'),
                    inline: true
                }
            );
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('direct_set_buy')
                    .setLabel('Set Buy Amounts')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('direct_set_sell')
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
        console.error('Error handling settings button:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: `Error loading settings: ${error.message}`
            });
        } else {
            await interaction.reply({
                content: `Error loading settings: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

/**
 * Show direct buy settings modal
 */
export async function handleSetBuyButton(interaction) {
    try {
        console.log('Creating buy settings modal for user:', interaction.user.id);
        const settings = await getTradeSettings(interaction.user.id);
        
        const modal = new ModalBuilder()
            .setCustomId('direct_buy_modal')
            .setTitle('Set Quick Buy Amounts');
            
        const minInput = new TextInputBuilder()
            .setCustomId('direct_min_buy')
            .setLabel('Minimum Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setValue(settings.minQuickBuy.toString())
            .setPlaceholder('0.1')
            .setRequired(true);
            
        const medInput = new TextInputBuilder()
            .setCustomId('direct_med_buy')
            .setLabel('Medium Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setValue(settings.mediumQuickBuy.toString())
            .setPlaceholder('0.5')
            .setRequired(true);
            
        const largeInput = new TextInputBuilder()
            .setCustomId('direct_large_buy')
            .setLabel('Large Buy Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setValue(settings.largeQuickBuy.toString())
            .setPlaceholder('1.0')
            .setRequired(true);
            
        const firstRow = new ActionRowBuilder().addComponents(minInput);
        const secondRow = new ActionRowBuilder().addComponents(medInput);
        const thirdRow = new ActionRowBuilder().addComponents(largeInput);
        
        modal.addComponents(firstRow, secondRow, thirdRow);
        
        console.log('Sending buy modal with ID:', modal.data.custom_id);
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing buy settings modal:', error);
        await interaction.reply({
            content: `Error showing settings form: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Show direct sell settings modal
 */
export async function handleSetSellButton(interaction) {
    try {
        console.log('Creating sell settings modal for user:', interaction.user.id);
        const settings = await getTradeSettings(interaction.user.id);
        
        const modal = new ModalBuilder()
            .setCustomId('direct_sell_modal')
            .setTitle('Set Quick Sell Amounts');
            
        const minInput = new TextInputBuilder()
            .setCustomId('direct_min_sell')
            .setLabel('Minimum Sell Amount (%)')
            .setStyle(TextInputStyle.Short)
            .setValue(settings.minQuickSell.toString())
            .setPlaceholder('10')
            .setRequired(true);
            
        const medInput = new TextInputBuilder()
            .setCustomId('direct_med_sell')
            .setLabel('Medium Sell Amount (%)')
            .setStyle(TextInputStyle.Short)
            .setValue(settings.mediumQuickSell.toString())
            .setPlaceholder('50')
            .setRequired(true);
            
        const largeInput = new TextInputBuilder()
            .setCustomId('direct_large_sell')
            .setLabel('Large Sell Amount (%)')
            .setStyle(TextInputStyle.Short)
            .setValue(settings.largeQuickSell.toString())
            .setPlaceholder('100')
            .setRequired(true);
            
        const firstRow = new ActionRowBuilder().addComponents(minInput);
        const secondRow = new ActionRowBuilder().addComponents(medInput);
        const thirdRow = new ActionRowBuilder().addComponents(largeInput);
        
        modal.addComponents(firstRow, secondRow, thirdRow);
        
        console.log('Sending sell modal with ID:', modal.data.custom_id);
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing sell settings modal:', error);
        await interaction.reply({
            content: `Error showing settings form: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle direct buy settings modal submission
 */
export async function handleBuyModalSubmit(interaction) {
    try {
        console.log('Processing buy modal submission for user:', interaction.user.id);
        
        // Get values from form
        const minBuy = parseFloat(interaction.fields.getTextInputValue('direct_min_buy'));
        const medBuy = parseFloat(interaction.fields.getTextInputValue('direct_med_buy'));
        const largeBuy = parseFloat(interaction.fields.getTextInputValue('direct_large_buy'));
        
        console.log(`Buy values submitted: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);
        
        // Basic validation
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            await interaction.reply({
                content: 'Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        if (minBuy <= 0 || medBuy <= 0 || largeBuy <= 0) {
            await interaction.reply({
                content: 'All values must be greater than zero',
                ephemeral: true
            });
            return;
        }
        
        // Save settings
        await saveTradeSettings(interaction.user.id, {
            minQuickBuy: minBuy,
            mediumQuickBuy: medBuy,
            largeQuickBuy: largeBuy
        });
        
        // Show success message
        await interaction.reply({
            content: 'Buy settings saved successfully!',
            ephemeral: true
        });
        
        // Show updated settings
        await handleSettingsButton(interaction);
        
    } catch (error) {
        console.error('Error handling buy settings submission:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: `Error saving settings: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle direct sell settings modal submission
 */
export async function handleSellModalSubmit(interaction) {
    try {
        console.log('Processing sell modal submission for user:', interaction.user.id);
        
        // Get values from form
        const minSell = parseFloat(interaction.fields.getTextInputValue('direct_min_sell'));
        const medSell = parseFloat(interaction.fields.getTextInputValue('direct_med_sell'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('direct_large_sell'));
        
        console.log(`Sell values submitted: min=${minSell}, med=${medSell}, large=${largeSell}`);
        
        // Basic validation
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            await interaction.reply({
                content: 'Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        if (minSell <= 0 || medSell <= 0 || largeSell <= 0) {
            await interaction.reply({
                content: 'All values must be greater than zero',
                ephemeral: true
            });
            return;
        }
        
        if (largeSell > 100) {
            await interaction.reply({
                content: 'Maximum sell percentage cannot exceed 100%',
                ephemeral: true
            });
            return;
        }
        
        // Save settings
        await saveTradeSettings(interaction.user.id, {
            minQuickSell: minSell,
            mediumQuickSell: medSell,
            largeQuickSell: largeSell
        });
        
        // Show success message
        await interaction.reply({
            content: 'Sell settings saved successfully!',
            ephemeral: true
        });
        
        // Show updated settings
        await handleSettingsButton(interaction);
        
    } catch (error) {
        console.error('Error handling sell settings submission:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: `Error saving settings: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle trading settings display - original method
 */
export async function handleTradeSettings(interaction) {
    const userId = interaction.user.id;
    
    try {
        await interaction.deferUpdate();
        console.log(`Loading trade settings for user: ${userId}`);
        
        const settings = await getTradeSettings(userId);
        console.log(`Retrieved settings:`, settings);
        
        // Create a nicely formatted embed
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Trading Settings')
            .setDescription('Configure your quick trade amounts')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: '📈 Quick Buy Amounts (SOL)',
                    value: [
                        `Min: ${settings.minQuickBuy}`,
                        `Medium: ${settings.mediumQuickBuy}`,
                        `Large: ${settings.largeQuickBuy}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📉 Quick Sell Amounts (% of tokens)',
                    value: [
                        `Min: ${settings.minQuickSell}%`,
                        `Medium: ${settings.mediumQuickSell}%`,
                        `Large: ${settings.largeQuickSell}%`
                    ].join('\n'),
                    inline: true
                }
            );

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_quick_buy')
                    .setLabel('Set Quick Buy')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('set_quick_sell')
                    .setLabel('Set Quick Sell')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
        console.log('Settings display updated successfully');

    } catch (error) {
        console.error('Error displaying trade settings:', error);
        await interaction.followUp({
            content: `❌ Error loading trade settings: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Show quick buy settings modal - original method
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
 * Show quick sell settings modal - original method
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
 * Handle quick buy settings submission - original method
 */
export async function handleQuickBuySubmission(interaction) {
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
        console.log('Processing buy settings submission for user:', userId);
        console.log('Quick buy modal fields:', Array.from(interaction.fields.fields.keys()).join(', '));
        
        // Get values from form
        const minBuy = parseFloat(interaction.fields.getTextInputValue('min_buy'));
        const medBuy = parseFloat(interaction.fields.getTextInputValue('med_buy'));
        const largeBuy = parseFloat(interaction.fields.getTextInputValue('large_buy'));
        
        console.log(`Buy values submitted: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);
        
        // Basic validation
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            await interaction.reply({
                content: 'Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        if (minBuy <= 0 || medBuy <= 0 || largeBuy <= 0) {
            await interaction.reply({
                content: 'All values must be greater than zero',
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
        
        // Show success message
        await interaction.reply({
            content: `✅ Quick buy settings saved successfully!`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error in quick buy submission:', error);
        
        // Simple error response
        if (!interaction.replied) {
            await interaction.reply({
                content: `❌ Error saving settings: ${error.message}`,
                ephemeral: true
            });
        }
    } finally {
        // Always remove from the active updates set
        activeSettingsUpdates.delete(userId);
    }
}

/**
 * Handle quick sell settings submission - original method
 */
export async function handleQuickSellSubmission(interaction) {
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
        console.log('Processing sell settings submission for user:', userId);
        console.log('Quick sell modal fields:', Array.from(interaction.fields.fields.keys()).join(', '));
        
        // Get values from form
        const minSell = parseFloat(interaction.fields.getTextInputValue('min_sell'));
        const medSell = parseFloat(interaction.fields.getTextInputValue('med_sell'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('large_sell'));
        
        console.log(`Sell values submitted: min=${minSell}%, med=${medSell}%, large=${largeSell}%`);
        
        // Basic validation
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            await interaction.reply({
                content: 'Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        if (minSell <= 0 || medSell <= 0 || largeSell <= 0) {
            await interaction.reply({
                content: 'All values must be greater than zero',
                ephemeral: true
            });
            return;
        }
        
        if (largeSell > 100) {
            await interaction.reply({
                content: 'Maximum sell percentage cannot exceed 100%',
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
        
        // Show success message
        await interaction.reply({
            content: `✅ Quick sell settings saved successfully!`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error in quick sell submission:', error);
        
        // Simple error response
        if (!interaction.replied) {
            await interaction.reply({
                content: `❌ Error saving settings: ${error.message}`,
                ephemeral: true
            });
        }
    } finally {
        // Always remove from the active updates set
        activeSettingsUpdates.delete(userId);
    }
}

// Export all functions for use in application handler
export const directSettings = {
    handleSettingsButton,
    handleSetBuyButton,
    handleSetSellButton,
    handleBuyModalSubmit,
    handleSellModalSubmit
};

// Export standalone settings functions to be used directly from handler
export const standaloneSettings = {
    displayDashboard: handleTradeSettings,
    showBuyModal: showQuickBuyModal,
    showSellModal: showQuickSellModal,
    handleBuySubmit: handleQuickBuySubmission,
    handleSellSubmit: handleQuickSellSubmission
};
