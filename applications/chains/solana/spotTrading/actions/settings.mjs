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

/**
 * Handle trading settings display
 */
export async function handleTradeSettings(interaction) {
    const userId = interaction.user.id;
    
    try {
        const settings = await getTradeSettings(userId) || {
            minQuickBuy: 0.1,
            mediumQuickBuy: 0.5,
            largeQuickBuy: 1.0,
            minQuickSell: 0.1,
            mediumQuickSell: 0.5,
            largeQuickSell: 1.0
        };

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
                    name: '📉 Quick Sell Amounts (SOL)',
                    value: [
                        `Min: ${settings.minQuickSell}`,
                        `Medium: ${settings.mediumQuickSell}`,
                        `Large: ${settings.largeQuickSell}`
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

        if (interaction.deferred) {
            await interaction.editReply({
                embeds: [embed],
                components: [row1, row2]
            });
        } else {
            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });
        }

    } catch (error) {
        console.error('Error displaying trade settings:', error);
        await interaction.reply({
            content: '❌ Error loading trade settings. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle quick buy settings modal
 */
export async function showQuickBuyModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('quick_buy_modal')
        .setTitle('Set Quick Buy Amounts');

    // Add components to modal
    const minInput = new TextInputBuilder()
        .setCustomId('min_buy')
        .setLabel('Minimum Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.1')
        .setRequired(true);

    const medInput = new TextInputBuilder()
        .setCustomId('med_buy')
        .setLabel('Medium Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.5')
        .setRequired(true);

    const largeInput = new TextInputBuilder()
        .setCustomId('large_buy')
        .setLabel('Large Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1.0')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(minInput),
        new ActionRowBuilder().addComponents(medInput),
        new ActionRowBuilder().addComponents(largeInput)
    );

    await interaction.showModal(modal);
}

/**
 * Handle quick sell settings modal
 */
export async function showQuickSellModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('quick_sell_modal')
        .setTitle('Set Quick Sell Amounts');

    // Add components to modal
    const minSellInput = new TextInputBuilder()
        .setCustomId('min_sell')
        .setLabel('Minimum Sell Amount (Tokens)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('100')
        .setRequired(true);

    const medSellInput = new TextInputBuilder()
        .setCustomId('med_sell')
        .setLabel('Medium Sell Amount (Tokens)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('500')
        .setRequired(true);

    const largeSellInput = new TextInputBuilder()
        .setCustomId('large_sell')
        .setLabel('Large Sell Amount (Tokens)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1000')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(minSellInput),
        new ActionRowBuilder().addComponents(medSellInput),
        new ActionRowBuilder().addComponents(largeSellInput)
    );

    await interaction.showModal(modal);
}

/**
 * Handle quick buy settings submission
 */
export async function handleQuickBuySubmission(interaction) {
    try {
        const minBuy = parseFloat(interaction.fields.getTextInputValue('min_buy'));
        const medBuy = parseFloat(interaction.fields.getTextInputValue('med_buy'));
        const largeBuy = parseFloat(interaction.fields.getTextInputValue('large_buy'));

        // Validate inputs
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            throw new Error('Please enter valid numbers');
        }

        // Save to database
        await saveTradeSettings(interaction.user.id, {
            minQuickBuy: minBuy,
            mediumQuickBuy: medBuy,
            largeQuickBuy: largeBuy
        });

        // Send confirmation
        await interaction.reply({
            content: `✅ Quick buy settings saved:\n• Min: ${minBuy} SOL\n• Medium: ${medBuy} SOL\n• Large: ${largeBuy} SOL`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Quick buy settings error:', error);
        await interaction.reply({
            content: `❌ Failed to save settings: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle quick sell settings submission
 */
export async function handleQuickSellSubmission(interaction) {
    try {
        const minSell = parseFloat(interaction.fields.getTextInputValue('min_sell'));
        const medSell = parseFloat(interaction.fields.getTextInputValue('med_sell'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('large_sell'));

        // Validate inputs
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            throw new Error('Please enter valid numbers');
        }

        // Save to database
        await saveTradeSettings(interaction.user.id, {
            minQuickSell: minSell,
            mediumQuickSell: medSell,
            largeQuickSell: largeSell
        });

        // Send confirmation
        await interaction.reply({
            content: `✅ Quick sell settings saved:\n• Min: ${minSell} tokens\n• Medium: ${medSell} tokens\n• Large: ${largeSell} tokens`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Quick sell settings error:', error);
        await interaction.reply({
            content: `❌ Failed to save settings: ${error.message}`,
            ephemeral: true
        });
    }
}
