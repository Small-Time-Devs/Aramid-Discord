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

/**
 * Handle trading settings display
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
 * Following the same pattern that works for the token address modal
 */
export async function handleQuickBuySubmission(interaction) {
    try {
        console.log(`⭐ Processing quick buy settings submission...`);
        console.log(`Modal ID: ${interaction.customId}`);
        console.log(`Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Make sure we have the fields we need
        if (!interaction.fields.getTextInputValue('min_buy') ||
            !interaction.fields.getTextInputValue('med_buy') ||
            !interaction.fields.getTextInputValue('large_buy')) {
            throw new Error('Missing one or more required fields in form submission');
        }
        
        // Get values from form and convert to numbers
        const minBuy = parseFloat(interaction.fields.getTextInputValue('min_buy'));
        const medBuy = parseFloat(interaction.fields.getTextInputValue('med_buy'));
        const largeBuy = parseFloat(interaction.fields.getTextInputValue('large_buy'));
        
        console.log(`Received values: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);

        // Basic validation
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            throw new Error('Please enter valid numbers');
        }

        if (minBuy < 0 || medBuy < 0 || largeBuy < 0) {
            throw new Error('Values must be positive');
        }

        const userId = interaction.user.id;
        
        // First reply to acknowledge receipt
        await interaction.reply({
            content: `⏳ Saving your quick buy settings...`,
            ephemeral: true
        });
        
        // Save to database
        try {
            await saveTradeSettings(userId, {
                minQuickBuy: minBuy,
                mediumQuickBuy: medBuy,
                largeQuickBuy: largeBuy
            });
            console.log('Quick buy settings saved successfully');
        } catch (dbError) {
            console.error('Database error while saving settings:', dbError);
            await interaction.followUp({
                content: `❌ Database error: ${dbError.message}. Your settings were not saved.`,
                ephemeral: true
            });
            return;
        }
        
        // Create confirmation message
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Quick Buy Settings Saved')
            .setColor(0x00FF00)
            .addFields(
                { name: 'Minimum Amount', value: `${minBuy} SOL`, inline: true },
                { name: 'Medium Amount', value: `${medBuy} SOL`, inline: true },
                { name: 'Large Amount', value: `${largeBuy} SOL`, inline: true }
            );

        // Get updated settings
        const updatedSettings = await getTradeSettings(userId);
        
        // Create settings display
        const settingsEmbed = new EmbedBuilder()
            .setTitle('⚙️ Trading Settings')
            .setDescription('Your trading settings have been updated')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: '📈 Quick Buy Amounts (SOL)',
                    value: [
                        `Min: ${updatedSettings.minQuickBuy}`,
                        `Medium: ${updatedSettings.mediumQuickBuy}`,
                        `Large: ${updatedSettings.largeQuickBuy}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📉 Quick Sell Amounts (% of tokens)',
                    value: [
                        `Min: ${updatedSettings.minQuickSell}%`,
                        `Medium: ${updatedSettings.mediumQuickSell}%`,
                        `Large: ${updatedSettings.largeQuickSell}%`
                    ].join('\n'),
                    inline: true
                }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_quick_buy')
                    .setLabel('Set Quick Buy')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('set_quick_sell')
                    .setLabel('Set Quick Sell')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        // First show confirmation, then show full settings
        await interaction.followUp({
            embeds: [successEmbed],
            ephemeral: true
        });
        
        // Show full settings with buttons
        await interaction.followUp({
            embeds: [settingsEmbed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling quick buy settings:', error);
        
        // Make sure we handle the interaction response properly
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle quick sell settings submission
 * Following the same pattern that works for the token address modal
 */
export async function handleQuickSellSubmission(interaction) {
    try {
        console.log(`⭐ Processing quick sell settings submission...`);
        console.log(`Modal ID: ${interaction.customId}`);
        console.log(`Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Make sure we have the fields we need
        if (!interaction.fields.getTextInputValue('min_sell') ||
            !interaction.fields.getTextInputValue('med_sell') ||
            !interaction.fields.getTextInputValue('large_sell')) {
            throw new Error('Missing one or more required fields in form submission');
        }
        
        // Get values from form and convert to numbers
        const minSell = parseFloat(interaction.fields.getTextInputValue('min_sell'));
        const medSell = parseFloat(interaction.fields.getTextInputValue('med_sell'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('large_sell'));
        
        console.log(`Received values: min=${minSell}%, med=${medSell}%, large=${largeSell}%`);

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

        const userId = interaction.user.id;
        
        // First reply to acknowledge receipt
        await interaction.reply({
            content: `⏳ Saving your quick sell settings...`,
            ephemeral: true
        });
        
        // Save to database
        try {
            await saveTradeSettings(userId, {
                minQuickSell: minSell,
                mediumQuickSell: medSell,
                largeQuickSell: largeSell
            });
            console.log('Quick sell settings saved successfully');
        } catch (dbError) {
            console.error('Database error while saving settings:', dbError);
            await interaction.followUp({
                content: `❌ Database error: ${dbError.message}. Your settings were not saved.`,
                ephemeral: true
            });
            return;
        }
        
        // Create confirmation message
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Quick Sell Settings Saved')
            .setColor(0x00FF00)
            .addFields(
                { name: 'Minimum Amount', value: `${minSell}%`, inline: true },
                { name: 'Medium Amount', value: `${medSell}%`, inline: true },
                { name: 'Large Amount', value: `${largeSell}%`, inline: true }
            );

        // Get updated settings
        const updatedSettings = await getTradeSettings(userId);
        
        // Create settings display
        const settingsEmbed = new EmbedBuilder()
            .setTitle('⚙️ Trading Settings')
            .setDescription('Your trading settings have been updated')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: '📈 Quick Buy Amounts (SOL)',
                    value: [
                        `Min: ${updatedSettings.minQuickBuy}`,
                        `Medium: ${updatedSettings.mediumQuickBuy}`,
                        `Large: ${updatedSettings.largeQuickBuy}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📉 Quick Sell Amounts (% of tokens)',
                    value: [
                        `Min: ${updatedSettings.minQuickSell}%`,
                        `Medium: ${updatedSettings.mediumQuickSell}%`,
                        `Large: ${updatedSettings.largeQuickSell}%`
                    ].join('\n'),
                    inline: true
                }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_quick_buy')
                    .setLabel('Set Quick Buy')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('set_quick_sell')
                    .setLabel('Set Quick Sell')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        // First show confirmation, then show full settings
        await interaction.followUp({
            embeds: [successEmbed],
            ephemeral: true
        });
        
        // Show full settings with buttons
        await interaction.followUp({
            embeds: [settingsEmbed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling quick sell settings:', error);
        
        // Make sure we handle the interaction response properly
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}
