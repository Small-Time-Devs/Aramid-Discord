import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';

/**
 * Format number with commas and fixed decimals
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places to show
 * @returns {string} Formatted number
 */
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    
    // Handle very small numbers with scientific notation
    if (num < 0.0001 && num > 0) {
        return num.toExponential(decimals);
    }
    
    // Format with commas and fixed decimals
    const fixedNum = parseFloat(num).toFixed(decimals);
    return parseFloat(fixedNum).toLocaleString('en-US');
}

/**
 * Format currency value
 * @param {number} value - Value to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    
    if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
        return `$${(value / 1e3).toFixed(2)}K`;
    } else {
        return `$${value.toFixed(2)}`;
    }
}

/**
 * Format percentage value with color indicator
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage string with emoji
 */
function formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) return '0.00%';
    
    const formattedValue = value.toFixed(2);
    if (value > 0) {
        return `+${formattedValue}% 🟢`;
    } else if (value < 0) {
        return `${formattedValue}% 🔴`;
    } else {
        return `${formattedValue}% ⚪`;
    }
}

/**
 * Display the token research results
 * @param {Object} interaction - Discord interaction
 * @param {string} tokenAddress - Token address
 * @param {Object} tokenInfo - Token information object
 */
export async function displayTokenResearch(interaction, tokenAddress, tokenInfo) {
    try {
        const metadata = tokenInfo.metadata;
        const tokenSymbol = metadata.symbol || 'UNKNOWN';
        const tokenName = metadata.name || 'Unknown Token';
        
        // Create main embed
        const embed = new EmbedBuilder()
            .setTitle(`${tokenSymbol} (${tokenName})`)
            .setDescription(`Research results for ${tokenAddress.substring(0, 8)}...${tokenAddress.substring(tokenAddress.length - 4)}`)
            .setColor(0x00AAFF)
            .addFields(
                {
                    name: 'Price',
                    value: formatCurrency(tokenInfo.price),
                    inline: true
                },
                {
                    name: 'Market Cap',
                    value: formatCurrency(tokenInfo.marketCap),
                    inline: true
                },
                {
                    name: 'FDV',
                    value: formatCurrency(tokenInfo.fdv),
                    inline: true
                },
                {
                    name: '24h Volume',
                    value: formatCurrency(tokenInfo.volume['24h']),
                    inline: true
                },
                {
                    name: 'TVL',
                    value: formatCurrency(tokenInfo.liquidity.tvl),
                    inline: true
                },
                {
                    name: 'Holders',
                    value: formatNumber(tokenInfo.holders.count),
                    inline: true
                }
            );
        
        // Add price change section
        embed.addFields({
            name: 'Price Change',
            value: [
                `1h: ${formatPercentage(tokenInfo.priceChange['1h'])}`,
                `24h: ${formatPercentage(tokenInfo.priceChange['24h'])}`,
                `7d: ${formatPercentage(tokenInfo.priceChange['7d'])}`
            ].join(' | '),
            inline: false
        });
        
        // Add supply information
        embed.addFields({
            name: 'Supply Information',
            value: [
                `Total Supply: ${formatNumber(tokenInfo.supply.total)}`,
                `Circulating: ${formatNumber(tokenInfo.supply.circulating)}`
            ].join('\n'),
            inline: false
        });
        
        // Add token links
        embed.addFields({
            name: 'Links',
            value: [
                `[Solscan](https://solscan.io/token/${tokenAddress})`,
                `[Birdeye](https://birdeye.so/token/${tokenAddress})`,
                `[DexScreener](https://dexscreener.com/solana/${tokenAddress})`
            ].join(' | '),
            inline: false
        });
        
        // Set footer with last updated time
        embed.setFooter({
            text: `Last updated: ${new Date(tokenInfo.lastUpdated).toLocaleString()}`
        });
        
        // If we have an image URL, set it as the thumbnail
        if (metadata.image) {
            embed.setThumbnail(metadata.image);
        }
        
        // Add action buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_research')
                    .setLabel('Refresh Data')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('research_enter_address')
                    .setLabel('Research Another')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('back_to_research')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        // Send the research results
        await interaction.editReply({
            content: null,
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error displaying research results:', error);
        await interaction.editReply({
            content: `❌ Error displaying research results: ${error.message}`,
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_research')
                            .setLabel('Back to Research')
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        });
    }
}
