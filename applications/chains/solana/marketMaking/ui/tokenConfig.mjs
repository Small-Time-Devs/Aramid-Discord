import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { state } from '../marketMakerMain.mjs';
import { fetchTokenPrice } from '../../spotTrading/functions/utils.mjs';

/**
 * Show token configuration for market making
 */
export async function showTokenMakingConfig(interaction, tokenDetails, tokenBalance) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        if (!config) {
            throw new Error('Market maker configuration not found');
        }
        
        // Get token price if available
        const tokenPrice = await fetchTokenPrice(config.tokenMint);
        
        // Format token information 
        const tokenName = tokenDetails?.name || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || 'UNKNOWN';
        const displayName = tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName;
        const formattedPrice = tokenPrice ? `$${tokenPrice}` : 'Unknown';
        
        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle('Market Maker Token Configuration')
            .setColor(0x6E0DAD) // Purple for market making
            .addFields(
                { 
                    name: 'Selected Token', 
                    value: displayName, 
                    inline: true 
                },
                { 
                    name: 'Current Price', 
                    value: formattedPrice, 
                    inline: true 
                },
                {
                    name: 'Your Balance',
                    value: tokenBalance ? `${tokenBalance} tokens` : 'Unknown',
                    inline: true
                },
                { 
                    name: 'Contract Address', 
                    value: `\`${config.tokenMint}\``, 
                    inline: false 
                }
            );
            
        // Add current settings if they exist
        if (config.spreadPercentage || config.priceRange) {
            embed.addFields({
                name: 'Market Making Settings',
                value: [
                    `**Spread:** ${config.spreadPercentage || 1}%`,
                    `**Price Range:** ${config.priceRange || 5}%`,
                    `**Auto-adjust:** ${config.autoAdjust ? 'Enabled' : 'Disabled'}`
                ].join('\n'),
                inline: false
            });
        }
            
        // Create button rows
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_spread')
                    .setLabel('Set Spread')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_price_range')
                    .setLabel('Set Price Range')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('toggle_auto_adjust')
                    .setLabel(config.autoAdjust ? 'Disable Auto-adjust' : 'Enable Auto-adjust')
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
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
            
        await interaction.update({
            embeds: [embed],
            components: [row1, row2]
        });
        
    } catch (error) {
        console.error('Error showing token market making config:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error loading configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error loading configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}
