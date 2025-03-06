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
 * Handle quick buy settings submission - simplified direct approach
 */
export async function handleQuickBuySubmission(interaction) {
    try {
        console.log('Processing quick buy submission');
        
        // Get values directly - no error handling here to make the basic flow clearer
        const minBuy = parseFloat(interaction.fields.getTextInputValue('min_buy'));
        const medBuy = parseFloat(interaction.fields.getTextInputValue('med_buy'));
        const largeBuy = parseFloat(interaction.fields.getTextInputValue('large_buy'));
        const userId = interaction.user.id;
        
        console.log(`Buy values: min=${minBuy}, med=${medBuy}, large=${largeBuy}`);
        
        // Simple validation
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            await interaction.reply({
                content: 'Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        // Call DB function directly
        await saveTradeSettings(userId, {
            minQuickBuy: minBuy,
            mediumQuickBuy: medBuy,
            largeQuickBuy: largeBuy
        });
        
        // Simple response - no embeds or complex formatting
        await interaction.reply({
            content: `Settings saved successfully!\n• Min: ${minBuy} SOL\n• Medium: ${medBuy} SOL\n• Large: ${largeBuy} SOL`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in quick buy submission:', error);
        
        // Simple error response
        if (!interaction.replied) {
            await interaction.reply({
                content: `Error saving settings: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle quick sell settings submission - simplified direct approach
 */
export async function handleQuickSellSubmission(interaction) {
    try {
        console.log('Processing quick sell submission');
        
        // Get values directly - no error handling here to make the basic flow clearer
        const minSell = parseFloat(interaction.fields.getTextInputValue('min_sell'));
        const medSell = parseFloat(interaction.fields.getTextInputValue('med_sell'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('large_sell'));
        const userId = interaction.user.id;
        
        console.log(`Sell values: min=${minSell}%, med=${medSell}%, large=${largeSell}%`);
        
        // Simple validation
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            await interaction.reply({
                content: 'Please enter valid numbers',
                ephemeral: true
            });
            return;
        }
        
        // Call DB function directly
        await saveTradeSettings(userId, {
            minQuickSell: minSell,
            mediumQuickSell: medSell,
            largeQuickSell: largeSell
        });
        
        // Simple response - no embeds or complex formatting
        await interaction.reply({
            content: `Settings saved successfully!\n• Min: ${minSell}%\n• Medium: ${medSell}%\n• Large: ${largeSell}%`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in quick sell submission:', error);
        
        // Simple error response
        if (!interaction.replied) {
            await interaction.reply({
                content: `Error saving settings: ${error.message}`,
                ephemeral: true
            });
        }
    }
}
