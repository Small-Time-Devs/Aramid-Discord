import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { state } from '../marketMakerMain.mjs';
import { fetchSolBalance } from '../../spotTrading/functions/utils.mjs';

/**
 * Show token market making configuration UI
 * @param {Object} interaction - Discord interaction
 * @param {Object} tokenDetails - Token details object
 * @param {number} tokenBalance - User's token balance
 */
export async function showTokenMakingConfig(interaction, tokenDetails, tokenBalance = null) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        if (!config) {
            throw new Error('Market making configuration not found');
        }
        
        // Get the token details
        const tokenName = tokenDetails?.name || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || '';
        
        // Create the display name
        const displayName = tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName;
        
        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle('Market Making Configuration')
            .setColor(0x6E0DAD)
            .addFields(
                {
                    name: 'Selected Token',
                    value: displayName,
                    inline: true
                },
                {
                    name: 'Token Address',
                    value: `\`${config.tokenMint}\``,
                    inline: false
                }
            );
        
        // Add token balance if available
        if (tokenBalance !== null) {
            embed.addFields(
                {
                    name: 'Your Balance',
                    value: `${tokenBalance} tokens`,
                    inline: true
                }
            );
        }
        
        // Add current configuration
        embed.addFields(
            {
                name: 'Market Making Settings',
                value: [
                    `Spread: ${config.spreadPercentage || 1}%`,
                    `Price Range: ${config.priceRange || 5}%`,
                    `Auto-Adjust: ${config.autoAdjust !== false ? 'Enabled' : 'Disabled'}`
                ].join('\n'),
                inline: false
            }
        );
        
        // Create button rows
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_mm_spread')
                    .setLabel('Set Spread')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_mm_range')
                    .setLabel('Set Range')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('toggle_auto_adjust')
                    .setLabel(config.autoAdjust !== false ? 'Disable Auto-Adjust' : 'Enable Auto-Adjust')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('save_mm_config')
                    .setLabel('Save Configuration')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_mm_dashboard')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger)
            );
        
        // Send the configuration UI
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
        
    } catch (error) {
        console.error('Error showing token market making config:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}
