import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { state } from '../solSpotTrading.mjs';
import { fetchSolBalance } from '../functions/utils.mjs';
import { getTradeSettings } from '../../../../../src/db/dynamo.mjs';

/**
 * Show token sell configuration
 */
export async function showTokenSellConfig(interaction, tokenData, tokenDetails, tokenPrice, isFollowUp = false) {
    try {
        console.log('Showing token sell config...');
        const userId = interaction.user.id;
        const config = state.solanaSellTokenConfig[userId];
        
        if (!config) {
            throw new Error('Sell configuration not found');
        }
        
        // Get user's quick sell settings
        const userSettings = await getTradeSettings(userId);
        console.log('User quick sell settings:', JSON.stringify(userSettings));
        
        // Get token name with fallback logic
        const tokenName = tokenDetails?.name || tokenData?.name || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || tokenData?.symbol || 'UNKNOWN';
        const displayName = tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName;
        
        // Format token price and amount 
        const formattedPrice = tokenPrice ? `$${tokenPrice}` : 'Unknown';
        const totalAmount = tokenData?.amount || 0;
        const sellAmount = (totalAmount * config.sellPercentage) / 100;
        const estimatedValue = tokenPrice ? `~$${(sellAmount * tokenPrice).toFixed(2)}` : 'Unknown';
        
        // Fetch the user's SOL balance
        const solBalance = await fetchSolBalance(config.solPublicKey);
        
        const embed = new EmbedBuilder()
            .setTitle('Token Sell Configuration')
            .setColor(0xFF0000) // Red for selling
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
                    value: `${totalAmount} tokens\n${solBalance.toFixed(4)} SOL`,
                    inline: true
                },
                {
                    name: 'Sell Amount',
                    value: `${sellAmount} tokens (${config.sellPercentage}%)`,
                    inline: true
                },
                {
                    name: 'Estimated Value',
                    value: estimatedValue,
                    inline: true
                },
                { 
                    name: 'Contract Address', 
                    value: `\`${config.tokenMint}\``, 
                    inline: false 
                },
                {
                    name: 'Settings',
                    value: `Slippage: ${config.slippage / 100}%\nPriority Fee: ${config.priorityFeeSol.toFixed(6)} SOL`,
                    inline: false
                }
            );
            
        // First row: Quick sell buttons based on user's saved settings
        console.log('Creating quick sell buttons with values:', 
            `min=${userSettings.minQuickSell}%, med=${userSettings.mediumQuickSell}%, large=${userSettings.largeQuickSell}%`);
            
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quick_sell_min')
                    .setLabel(`Min (${userSettings.minQuickSell}%)`)
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('quick_sell_med')
                    .setLabel(`Med (${userSettings.mediumQuickSell}%)`)
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('quick_sell_large')
                    .setLabel(`Max (${userSettings.largeQuickSell}%)`)
                    .setStyle(ButtonStyle.Danger)
            );
            
        // Second row: Custom amount and settings
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_sell_percentage')
                    .setLabel('Custom Percentage')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_slippage')
                    .setLabel('Set Slippage')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('set_priority_fee')
                    .setLabel('Set Priority Fee')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        // Third row with execute and back buttons
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('execute_sell')
                    .setLabel('Execute Sale')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('SOLANA_TOKEN_SELL')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        console.log('Preparing response with', row1.components.length, 'quick sell buttons');
        
        // Handle the response based on the interaction state
        const components = [row1, row2, row3];
        
        if (isFollowUp) {
            console.log('Sending as editReply with', components.length, 'rows');
            await interaction.editReply({
                embeds: [embed],
                components: components
            });
        } else if (interaction.isModalSubmit()) {
            console.log('Sending as reply to modal with', components.length, 'rows');
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [embed],
                    components: components,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    embeds: [embed],
                    components: components
                });
            }
        } else {
            console.log('Sending as update with', components.length, 'rows');
            await interaction.update({
                embeds: [embed],
                components: components
            });
        }
        
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Error showing token sell config:', error);
        
        // Determine the appropriate method to respond based on the interaction state
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error loading sell configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error loading sell configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}
