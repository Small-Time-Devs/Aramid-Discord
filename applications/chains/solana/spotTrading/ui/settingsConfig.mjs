import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} from 'discord.js';

/**
 * Display the trade settings menu with the current settings values
 * @param {Object} interaction - Discord interaction object
 * @param {Object} settings - User's current trade settings
 */
export async function showTradeSettingsMenu(interaction, settings) {
    try {
        console.log('Creating settings display...');
        
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

        // Use editReply as we've likely already deferred the interaction
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
 * Show the settings success message after updating settings
 * @param {Object} interaction - Discord interaction object
 * @param {Object} settings - Updated trade settings
 * @param {String} type - The type of settings updated ('buy' or 'sell')
 */
export async function showSettingsSuccessMessage(interaction, settings, type) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('✅ Settings Updated')
            .setDescription(`Your quick ${type} settings have been saved`)
            .setColor(0x00FF00);

        if (type === 'buy') {
            embed.addFields({
                name: '📈 Quick Buy Amounts (SOL)',
                value: [
                    `Min: ${settings.minQuickBuy}`,
                    `Medium: ${settings.mediumQuickBuy}`,
                    `Large: ${settings.largeQuickBuy}`
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
                
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        } else {
            embed.addFields({
                name: '📉 Quick Sell Amounts (% of tokens)',
                value: [
                    `Min: ${settings.minQuickSell}%`,
                    `Medium: ${settings.mediumQuickSell}%`,
                    `Large: ${settings.largeQuickSell}%`
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
                
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        }
        
        console.log(`Settings success message shown for ${type} settings`);
        
    } catch (error) {
        console.error(`Error showing settings success message:`, error);
        await interaction.followUp({
            content: `✅ Settings saved, but there was an error displaying details: ${error.message}`,
            ephemeral: true
        });
    }
}
