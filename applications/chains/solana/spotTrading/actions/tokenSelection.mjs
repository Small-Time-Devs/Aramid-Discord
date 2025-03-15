import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';
import { state } from '../solSpotTrading.mjs';
import { checkUserWallet } from '../../../../../src/db/dynamo.mjs';
import { 
    fetchSolBalance, 
    fetchTokenDetails, 
    fetchTokenPrice,
    getSolanaPriorityFee 
} from '../functions/utils.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { showTokenPurchaseConfig } from '../ui/purchaseConfig.mjs';
import { popularTokens } from '../../../../../src/globals/global.mjs';

/**
 * Handle token address input modal
 */
export async function handleTokenAddressInput(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('token_address_modal')
        .setTitle('Enter Token Address');

    const tokenAddressInput = new TextInputBuilder()
        .setCustomId('token_address')
        .setLabel('Token Contract Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter Solana token address')
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(tokenAddressInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

/**
 * Handle the "Buy New Token" button click
 */
export async function handleBuyNewToken(interaction) {
    try {
        await interaction.deferUpdate();
        
        // Create embedded message for buy options
        const embed = new EmbedBuilder()
            .setTitle('Buy Tokens')
            .setDescription('Choose how you would like to buy tokens')
            .setColor(0x00FFFF);
        
        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enter_token_address')
                    .setLabel('Enter Token Address')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝')
            );
        
        // Add popular tokens from global config that are flagged for spot trading
        const row2 = new ActionRowBuilder();
        
        // Filter tokens by the displayInSpotTrading flag
        const spotTradingTokens = Object.entries(popularTokens)
            .filter(([_, token]) => token.displayInSpotTrading)
            .slice(0, 3); // Limit to 3 tokens for UI space
        
        spotTradingTokens.forEach(([key, token]) => {
            row2.addComponents(
                new ButtonBuilder()
                    .setCustomId(`popular_token_${key.toLowerCase()}`)
                    .setLabel(token.symbol)
                    .setStyle(ButtonStyle.Success)
            );
        });
        
        // Add recently bought tokens if available
        const userId = interaction.user.id;
        const recentTokens = state.tokenBalancesCache[userId];
        const row3 = new ActionRowBuilder();
        
        if (recentTokens && recentTokens.length > 0) {
            // Take the first 3 tokens
            for (let i = 0; i < Math.min(recentTokens.length, 3); i++) {
                const token = recentTokens[i];
                if (token.mint && token.name) {
                    row3.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`buy_more_${token.mint}`)
                            .setLabel(`Buy ${token.name}`)
                            .setStyle(ButtonStyle.Primary)
                    );
                }
            }
        }
        
        // Add a back button
        const row4 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back to Trading')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        // Determine which rows to include
        const rows = [row1, row2];
        
        if (row3.components.length > 0) {
            rows.push(row3);
        }
        
        rows.push(row4);
        
        // Send the buy options
        await interaction.editReply({
            embeds: [embed],
            components: rows
        });
        
    } catch (error) {
        console.error('Error showing buy token options:', error);
        await interaction.followUp({
            content: '❌ Failed to load token buy options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle "Enter Token Address" button click
 */
export async function handleEnterTokenAddress(interaction) {
    try {
        console.log('Opening token address modal...');
        
        // Use consistent modal ID and input field name
        const modal = new ModalBuilder()
            .setCustomId('token_address_modal')
            .setTitle('Enter Token Address');

        const tokenAddressInput = new TextInputBuilder()
            .setCustomId('token_address')
            .setLabel('Token Contract Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter Solana token address')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(tokenAddressInput);
        modal.addComponents(row);
        
        console.log('Showing modal with ID:', modal.data.custom_id);
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing token address modal:', error);
        await interaction.reply({
            content: `❌ Failed to open token address input: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle token selection for buying existing tokens
 */
export async function handleTokenSelection(interaction) {
    try {
        if (!interaction.customId.startsWith('buy_more_')) {
            return;
        }
        
        // Start with deferUpdate to prevent timeout
        await interaction.deferUpdate();
        
        const tokenMint = interaction.customId.replace('buy_more_', '');
        const userId = interaction.user.id;
        const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
        
        if (!exists) {
            await interaction.followUp({
                content: '❌ No wallet found. Please create a wallet first.',
                ephemeral: true
            });
            return;
        }
        
        // Get priority fees with error handling
        let priorityFees;
        try {
            priorityFees = await getSolanaPriorityFee();
        } catch (error) {
            console.error('Error getting priority fees, using default values:', error);
            priorityFees = {
                lowFee: 1000,
                mediumFee: 10000,
                highFee: 100000
            };
        }
        
        // Use null-safe access with default values
        const mediumFee = priorityFees?.mediumFee || 10000;
        
        // Initialize buy config with the selected token
        state.solanaBuyTokenConfig[userId] = {
            userId,
            outputMint: tokenMint,
            amount: 0.01,
            jito: false,
            solPublicKey,
            solPrivateKey,
            slippage: 50,
            priorityFee: mediumFee,
            priorityFeeSol: mediumFee / LAMPORTS_PER_SOL,
        };

        console.log(`Set up purchase config for token: ${tokenMint}`);
        
        // Fetch token details
        const tokenDetails = await fetchTokenDetails(tokenMint);
        const tokenPrice = await fetchTokenPrice(tokenMint);
        
        console.log('Token details retrieved:', tokenDetails);
        console.log('Token price:', tokenPrice);
        
        // Use the same showTokenPurchaseConfig method that's used for custom tokens
        // This ensures consistency in the UI
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice, true);
        
    } catch (error) {
        console.error('Error in handleTokenSelection:', error);
        
        // Ensure we respond to the interaction even if there's an error
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing your request. Please try again.',
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: '❌ An error occurred while processing your request. Please try again.',
                ephemeral: true
            });
        }
    }
}

/**
 * Handle token address submission from modal
 * This handles both token_address_modal and token_address_input_modal
 */
export async function handleTokenAddressSubmit(interaction) {
    try {
        console.log(`⭐ Processing token modal submission with ID: ${interaction.customId}`);
        console.log(`Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Get the token address from the input field
        // Handle both possible field names for backwards compatibility
        let tokenAddress;
        if (interaction.fields.getTextInputValue('token_address')) {
            tokenAddress = interaction.fields.getTextInputValue('token_address');
        } else if (interaction.fields.getTextInputValue('token_address_input')) {
            tokenAddress = interaction.fields.getTextInputValue('token_address_input');
        } else {
            throw new Error('Token address field not found in modal submission');
        }
        
        console.log(`Token address entered: ${tokenAddress}`);
        
        const userId = interaction.user.id;
        
        // Ensure we have a valid configuration
        if (!state.solanaBuyTokenConfig[userId]) {
            console.log('Creating new configuration for user');
            const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
            if (!exists) {
                await interaction.reply({
                    content: '❌ No wallet found. Please create a wallet first.',
                    ephemeral: true
                });
                return;
            }
            
            // Get priority fees with error handling
            let priorityFees;
            try {
                priorityFees = await getSolanaPriorityFee();
            } catch (error) {
                console.error('Error getting priority fees, using default values:', error);
                priorityFees = {
                    lowFee: 1000,
                    mediumFee: 10000,
                    highFee: 100000
                };
            }
            
            // Use null-safe access with default values
            const mediumFee = priorityFees?.mediumFee || 10000;
            
            state.solanaBuyTokenConfig[userId] = {
                userId,
                outputMint: '',
                amount: 0.01,
                jito: false,
                solPublicKey,
                solPrivateKey,
                slippage: 50,
                priorityFee: mediumFee,
                priorityFeeSol: mediumFee / LAMPORTS_PER_SOL
            };
        }
        
        // Update configuration with the token address
        state.solanaBuyTokenConfig[userId].outputMint = tokenAddress;
        console.log('Set token address in configuration');
        
        // Defer the reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        console.log('Reply deferred');
        
        // Fetch token details with error handling
        let tokenDetails = { name: 'Unknown Token', symbol: 'UNKNOWN' };
        let tokenPrice = null;
        
        try {
            console.log('Fetching token details...');
            tokenDetails = await fetchTokenDetails(tokenAddress);
            tokenPrice = await fetchTokenPrice(tokenAddress);
            console.log('Token details retrieved:', tokenDetails ? 'Success' : 'Failed');
        } catch (detailsError) {
            console.error('Error fetching token details:', detailsError);
            // We continue with fallback values already set
        }
        
        // Show the purchase configuration
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice, true);
        
    } catch (error) {
        console.error('❌ Error handling token address modal submission:', error);
        
        // Handle interaction based on its state
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error processing token address: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error processing token address: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Display token buy options
 */
export async function showTokenBuyOptions(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.solanaBuyTokenConfig[userId];
        const solBalance = await fetchSolBalance(config.solPublicKey);
        
        const embed = new EmbedBuilder()
            .setTitle('Buy New Token')
            .setDescription('Enter a token address or select from popular tokens')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Wallet Balance', 
                    value: `${solBalance.toFixed(4)} SOL`, 
                    inline: false 
                }
            );
            
        // Add popular tokens section
        embed.addFields({
            name: 'Popular Tokens',
            value: 'Click a button below to select a token or enter a custom address',
            inline: false
        });
            
        // Create buttons for input options
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enter_token_address')
                    .setLabel('Enter Token Address')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
            
        // Add popular tokens from global config
        const row2 = new ActionRowBuilder();
        
        // Filter tokens by the displayInSpotTrading flag
        const spotTradingTokens = Object.entries(popularTokens)
            .filter(([_, token]) => token.displayInSpotTrading)
            .slice(0, 3); // Limit to 3 tokens for UI space
        
        spotTradingTokens.forEach(([key, token]) => {
            row2.addComponents(
                new ButtonBuilder()
                    .setCustomId(`popular_token_${key.toLowerCase()}`)
                    .setLabel(token.symbol)
                    .setStyle(ButtonStyle.Success)
            );
        });
            
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
    } catch (error) {
        console.error('Error showing token buy options:', error);
        await interaction.followUp({
            content: '❌ Failed to load token buy options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle popular token selection
 */
export async function handlePopularTokenSelect(interaction) {
    try {
        const tokenKey = interaction.customId.replace('popular_token_', '').toUpperCase();
        const userId = interaction.user.id;
        
        // Get the token from the centralized popular tokens list
        const token = popularTokens[tokenKey];
        
        if (!token || !token.address) {
            await interaction.reply({
                content: '❌ Invalid token selection or token not found in our database.',
                ephemeral: true
            });
            return;
        }
        
        // Initialize configuration if needed
        if (!state.solanaBuyTokenConfig[userId]) {
            const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
            if (!exists) {
                await interaction.reply({
                    content: '❌ No wallet found. Please create a wallet first.',
                    ephemeral: true
                });
                return;
            }
            
            // Get priority fees with error handling
            let priorityFees;
            try {
                priorityFees = await getSolanaPriorityFee();
            } catch (error) {
                console.error('Error getting priority fees, using default values:', error);
                priorityFees = {
                    lowFee: 1000,
                    mediumFee: 10000,
                    highFee: 100000
                };
            }
            
            const mediumFee = priorityFees?.mediumFee || 10000;
            
            state.solanaBuyTokenConfig[userId] = {
                userId,
                outputMint: token.address,
                amount: 0.01,
                jito: false,
                solPublicKey,
                solPrivateKey,
                slippage: 50,
                priorityFee: mediumFee,
                priorityFeeSol: mediumFee / LAMPORTS_PER_SOL
            };
        } else {
            // Update existing configuration
            state.solanaBuyTokenConfig[userId].outputMint = token.address;
        }
        
        // Show purchase config for the selected token
        await interaction.deferUpdate();
        
        // Create token details object from popularTokens data
        const tokenDetails = {
            name: token.name,
            symbol: token.symbol,
            address: token.address,
            decimals: token.decimals
        };
        
        // Fetch token price
        let tokenPrice = null;
        try {
            tokenPrice = await fetchTokenPrice(token.address);
        } catch (error) {
            console.error(`Error fetching price for ${token.symbol}:`, error);
        }
        
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice, true);
        
    } catch (error) {
        console.error('Error handling popular token selection:', error);
        await interaction.followUp({
            content: 'Error selecting token. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle recent token selection
 */
export async function handleRecentTokenSelect(interaction) {
    try {
        const tokenAddress = interaction.customId.replace('recent_token_', '');
        
        // Show purchase config for the selected token
        await interaction.deferUpdate();
        await showTokenPurchaseConfig(interaction, tokenAddress);
        
    } catch (error) {
        console.error('Error handling recent token selection:', error);
        await interaction.followUp({
            content: 'Error selecting token. Please try again.',
            ephemeral: true
        });
    }
}