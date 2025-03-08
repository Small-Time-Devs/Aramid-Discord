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
 * A simpler version of the token purchase config display
 * to minimize potential errors
 */
export async function showTokenPurchaseConfigSimplified(interaction, tokenDetails, tokenPrice) {
    try {
        console.log('Creating simplified purchase config display...');
        
        const userId = interaction.user.id;
        const config = state.solanaBuyTokenConfig[userId];
        
        if (!config) {
            throw new Error('Configuration not found');
        }
        
        // Get user's quick buy settings
        const userSettings = await getTradeSettings(userId);
        console.log('User quick buy settings:', userSettings);
        
        // Get token name with better fallback logic
        const tokenName = tokenDetails?.name || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || '';
        const displayName = tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName;
        
        // Fetch the user's SOL balance
        const solBalance = await fetchSolBalance(config.solPublicKey);
        
        // Create a simple embed
        const embed = new EmbedBuilder()
            .setTitle('Token Purchase Setup')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Selected Token', 
                    value: displayName, 
                    inline: true 
                },
                { 
                    name: 'Price', 
                    value: tokenPrice ? `$${tokenPrice}` : 'Unknown', 
                    inline: true 
                },
                {
                    name: 'Wallet Balance',
                    value: `${solBalance.toFixed(4)} SOL`,
                    inline: true
                },
                { 
                    name: 'Contract Address', 
                    value: `\`${config.outputMint}\``, 
                    inline: false 
                }
            );
        
        // First row: Quick buy buttons based on user's saved settings
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quick_buy_min')
                    .setLabel(`Min (${userSettings.minQuickBuy} SOL)`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('quick_buy_med') 
                    .setLabel(`Med (${userSettings.mediumQuickBuy} SOL)`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('quick_buy_large')
                    .setLabel(`Max (${userSettings.largeQuickBuy} SOL)`)
                    .setStyle(ButtonStyle.Success)
            );
        
        // Second row: Custom amount and settings
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_purchase_amount')
                    .setLabel('Custom Amount')
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
                    .setCustomId('execute_purchase')
                    .setLabel('Execute Purchase')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_buy_options')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        console.log('Sending embed response...');
        
        // Use editReply as we've already deferred
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2, row3]
        });
        
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Error showing simplified purchase config:', error);
        await interaction.followUp({
            content: `❌ Error displaying token information: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Show token purchase configuration with improved error handling
 */
export async function showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice, isFollowUp = false) {
    try {
        console.log('Showing token purchase config...');
        const userId = interaction.user.id;
        const config = state.solanaBuyTokenConfig[userId];
        
        if (!config) {
            throw new Error('Configuration not found');
        }
        
        // Get user's quick buy settings
        const userSettings = await getTradeSettings(userId);
        console.log('User quick buy settings:', JSON.stringify(userSettings));
        
        // Get token name with better fallback logic
        const tokenName = tokenDetails?.name || tokenDetails?.symbol || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || 'UNKNOWN';
        const displayName = tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName;
        
        // Fetch the user's SOL balance
        const solBalance = await fetchSolBalance(config.solPublicKey);
        
        const embed = new EmbedBuilder()
            .setTitle('Token Purchase Configuration')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Selected Token', 
                    value: displayName, 
                    inline: true 
                },
                { 
                    name: 'Current Price', 
                    value: tokenPrice ? `$${tokenPrice}` : 'Unknown', 
                    inline: true 
                },
                {
                    name: 'Wallet Balance',
                    value: `${solBalance.toFixed(4)} SOL`,
                    inline: true
                },
                {
                    name: 'Purchase Amount',
                    value: `${config.amount} SOL`,
                    inline: true
                },
                { 
                    name: 'Contract Address', 
                    value: `\`${config.outputMint}\``, 
                    inline: false 
                },
                {
                    name: 'Settings',
                    value: `Slippage: ${config.slippage / 100}%\nPriority Fee: ${config.priorityFeeSol.toFixed(6)} SOL`,
                    inline: false
                }
            );
            
        // First row: Quick buy buttons based on user's saved settings
        console.log('Creating quick buy buttons with values:', 
           `min=${userSettings.minQuickBuy}, med=${userSettings.mediumQuickBuy}, large=${userSettings.largeQuickBuy}`);
            
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quick_buy_min')
                    .setLabel(`Min (${userSettings.minQuickBuy} SOL)`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('quick_buy_med')
                    .setLabel(`Med (${userSettings.mediumQuickBuy} SOL)`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('quick_buy_large')
                    .setLabel(`Max (${userSettings.largeQuickBuy} SOL)`)
                    .setStyle(ButtonStyle.Success)
            );
            
        // Second row: Custom amount and settings
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_purchase_amount')
                    .setLabel('Custom Amount')
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
                    .setCustomId('execute_purchase')
                    .setLabel('Execute Purchase')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_buy_options')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        console.log('Preparing response with', row1.components.length, 'quick buy buttons');
        
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
        console.error('Error showing token purchase config:', error);
        
        // Determine the appropriate method to respond based on the interaction state
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error loading purchase configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error loading purchase configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}
