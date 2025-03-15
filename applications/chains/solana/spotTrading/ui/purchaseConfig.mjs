import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { state } from '../solSpotTrading.mjs';
import { 
    fetchSolBalance, 
    getSolanaPriorityFee 
} from '../functions/utils.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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
export async function showTokenPurchaseConfig(interaction, tokenDetailsOrAddress, tokenPrice = null, isDeferred = false) {
    try {
        const userId = interaction.user.id;
        
        // Handle both token details object and token address
        let tokenDetails = tokenDetailsOrAddress;
        
        // Initialize config or get existing
        if (!state.solanaBuyTokenConfig[userId]) {
            throw new Error("Purchase configuration not found. Please start again.");
        }
        
        const config = state.solanaBuyTokenConfig[userId];
        
        // Get wallet balance
        const solBalance = await fetchSolBalance(config.solPublicKey);
        
        // Get formatted price display
        let priceDisplay = 'Unknown';
        if (tokenPrice !== null) {
            // Check if tokenPrice is an object or a primitive value
            if (typeof tokenPrice === 'object' && tokenPrice !== null) {
                // Extract the price value from the object - adapt based on your API response structure
                if (tokenPrice.usd) {
                    priceDisplay = `$${tokenPrice.usd.toFixed(6)}`;
                } else if (tokenPrice.price) {
                    priceDisplay = `$${tokenPrice.price.toFixed(6)}`;
                } else {
                    // Try to get the first numeric property
                    const numericValues = Object.values(tokenPrice).filter(val => typeof val === 'number');
                    if (numericValues.length > 0) {
                        priceDisplay = `$${numericValues[0].toFixed(6)}`;
                    }
                }
            } else if (typeof tokenPrice === 'number') {
                // If it's directly a number
                priceDisplay = `$${tokenPrice.toFixed(6)}`;
            } else if (typeof tokenPrice === 'string' && !isNaN(parseFloat(tokenPrice))) {
                // If it's a numeric string
                priceDisplay = `$${parseFloat(tokenPrice).toFixed(6)}`;
            }
        }
        
        // Create embed for token purchase configuration
        const embed = new EmbedBuilder()
            .setTitle(`Buy ${tokenDetails.symbol || 'Token'}`)
            .setColor(0x00FFFF)
            .addFields(
                { 
                    name: 'Token Details', 
                    value: [
                        `Name: ${tokenDetails.name || 'Unknown Token'}`,
                        `Symbol: ${tokenDetails.symbol || 'N/A'}`,
                        `Address: ${tokenDetails.address || config.outputMint}`,
                        `Current Price: ${priceDisplay}`
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: 'Wallet', 
                    value: `Balance: ${solBalance.toFixed(4)} SOL`, 
                    inline: true 
                },
                { 
                    name: 'Purchase Settings', 
                    value: [
                        `Amount: ${config.amount} SOL`,
                        `Slippage: ${config.slippage/100}%`,
                        `Priority Fee: ${config.priorityFeeSol.toFixed(6)} SOL`
                    ].join('\n'),
                    inline: true 
                }
            );
        
        // Create button rows
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('purchase_amount_small')
                    .setLabel('0.01 SOL')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('purchase_amount_medium')
                    .setLabel('0.1 SOL')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('purchase_amount_large')
                    .setLabel('0.5 SOL')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_slippage')
                    .setLabel('Set Slippage')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_custom_amount')
                    .setLabel('Custom Amount')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('toggle_jito')
                    .setLabel(config.jito ? 'Jito: On' : 'Jito: Off')
                    .setStyle(config.jito ? ButtonStyle.Success : ButtonStyle.Danger)
            );
            
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('execute_purchase')
                    .setLabel('Buy Now')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(config.amount <= 0),
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')  // Changed from 'back_to_token_selection' to 'back_to_spot_trading'
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        // Handle interaction response based on status
        if (isDeferred) {
            await interaction.editReply({
                embeds: [embed],
                components: [row1, row2, row3]
            });
        } else {
            await interaction.update({
                embeds: [embed],
                components: [row1, row2, row3]
            });
        }
    } catch (error) {
        console.error('Error showing token purchase config:', error);
        
        // Handle interaction appropriately based on its state
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error loading purchase configuration: ${error.message}`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error loading purchase configuration: ${error.message}`,
                ephemeral: true
            });
        }
    }
}