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
import { checkUserWallet, getTransactionKeys, getTradeSettings } from '../../../../../src/db/dynamo.mjs';
import { 
    fetchSolBalance, 
    fetchTokenDetails, 
    fetchTokenPrice,
    fetchTokenBalances,
    getSolanaPriorityFee 
} from '../functions/utils.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { showTokenSellConfig } from '../ui/sellConfig.mjs';
import axios from 'axios';
import { globalURLS, globalStaticConfig } from '../../../../../src/globals/global.mjs';

/**
 * Handle the "Sell Token" button click
 */
export async function handleSellToken(interaction) {
    try {
        await interaction.deferUpdate({ ephemeral: true });
        
        const userId = interaction.user.id;
        const { exists, solPublicKey } = await checkUserWallet(userId);
        
        if (!exists) {
            const embed = new EmbedBuilder()
                .setTitle('No Wallet Found')
                .setDescription('You need to generate a wallet first.')
                .setColor(0xFF0000);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('generate_wallet')
                        .setLabel('Generate Wallet')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            return;
        }
        
        // Get user's token balances
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        
        if (!tokenBalances || tokenBalances.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('No Tokens Found')
                .setDescription('You don\'t have any tokens to sell.')
                .setColor(0xFF0000);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_spot_trading')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            return;
        }
        
        // Show token selection interface
        await showTokenSellOptions(interaction, tokenBalances);
        
    } catch (error) {
        console.error('Error handling Sell Token:', error);
        await interaction.followUp({
            content: '❌ Error processing your request. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Display token sell options based on user's holdings
 */
export async function showTokenSellOptions(interaction, tokenBalances) {
    try {
        const userId = interaction.user.id;
        const { solPublicKey } = await checkUserWallet(userId);
        const solBalance = await fetchSolBalance(solPublicKey);
        
        // Filter tokens that have a non-zero balance
        const tokensWithBalance = tokenBalances.filter(token => token.amount > 0);
        
        const embed = new EmbedBuilder()
            .setTitle('Sell Token')
            .setDescription('Select a token to sell')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Wallet Balance', 
                    value: `${solBalance.toFixed(4)} SOL`, 
                    inline: false 
                }
            );
        
        if (tokensWithBalance.length > 0) {
            const tokenList = tokensWithBalance
                .map(token => `${token.name}: ${token.amount}`)
                .join('\n');
                
            embed.addFields(
                { 
                    name: 'Your Tokens', 
                    value: '```\n' + tokenList + '\n```', 
                    inline: false 
                }
            );
        }
        
        // Create rows of buttons for tokens to sell
        const rows = [];
        const tokensPerRow = 3;
        
        for (let i = 0; i < tokensWithBalance.length; i += tokensPerRow) {
            const rowTokens = tokensWithBalance.slice(i, i + tokensPerRow);
            const tokenRow = new ActionRowBuilder();
            
            rowTokens.forEach(token => {
                tokenRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sell_token_${token.mint}`)
                        .setLabel(`Sell ${token.name}`)
                        .setStyle(ButtonStyle.Danger)
                );
            });
            
            if (tokenRow.components.length > 0) {
                rows.push(tokenRow);
            }
            
            // Maximum of 5 rows of buttons
            if (rows.length >= 4) break;
        }
        
        // Add back button
        const backRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        rows.push(backRow);
        
        await interaction.editReply({
            embeds: [embed],
            components: rows
        });
        
    } catch (error) {
        console.error('Error showing token sell options:', error);
        await interaction.followUp({
            content: '❌ Failed to load token sell options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle token selection for selling
 */
export async function handleTokenSellSelection(interaction) {
    try {
        if (!interaction.customId.startsWith('sell_token_')) {
            return;
        }
        
        // Start with deferUpdate to prevent timeout
        await interaction.deferUpdate();
        
        const tokenMint = interaction.customId.replace('sell_token_', '');
        const userId = interaction.user.id;
        const { exists, solPublicKey } = await checkUserWallet(userId);
        
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
        
        // Get token details and balance
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        const selectedToken = tokenBalances.find(token => token.mint === tokenMint);
        
        if (!selectedToken || selectedToken.amount <= 0) {
            await interaction.followUp({
                content: '❌ You don\'t have any of this token to sell.',
                ephemeral: true
            });
            return;
        }
        
        // Initialize sell config with the selected token
        state.solanaSellTokenConfig = state.solanaSellTokenConfig || {};
        state.solanaSellTokenConfig[userId] = {
            userId,
            tokenMint: tokenMint,
            tokenAmount: selectedToken.amount,
            sellPercentage: 100, // Default to selling 100%
            tokenDecimals: selectedToken.decimals,
            solPublicKey,
            slippage: 50,
            priorityFee: mediumFee,
            priorityFeeSol: mediumFee / LAMPORTS_PER_SOL,
        };

        console.log(`Set up sell config for token: ${tokenMint}`);
        console.log(`Token amount: ${selectedToken.amount}`);
        console.log(`Token decimals: ${selectedToken.decimals}`);
        
        // Fetch token details
        const tokenDetails = await fetchTokenDetails(tokenMint);
        const tokenPrice = await fetchTokenPrice(tokenMint);
        
        console.log('Token details retrieved for selling:', tokenDetails);
        console.log('Token price:', tokenPrice);
        
        // Show token sell configuration
        await showTokenSellConfig(interaction, selectedToken, tokenDetails, tokenPrice, true);
        
    } catch (error) {
        console.error('Error in handleTokenSellSelection:', error);
        
        // Ensure we respond to the interaction even if there's an error
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ An error occurred: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ An error occurred: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle setting the sell percentage
 */
export async function handleSetSellPercentage(interaction) {
    try {
        console.log('Showing sell percentage modal...');
        
        const modal = new ModalBuilder()
            .setCustomId('sell_percentage_modal')
            .setTitle('Set Sell Percentage');

        const percentageInput = new TextInputBuilder()
            .setCustomId('sell_percentage')
            .setLabel('Percentage to sell (1-100)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('100')
            .setValue('100')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(percentageInput);
        modal.addComponents(row);

        console.log('Showing modal with ID:', modal.data.custom_id);
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing sell percentage modal:', error);
        await interaction.reply({
            content: `❌ Failed to open percentage input: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

export async function handleSellPercentageSubmit(interaction) {
    try {
        if (!interaction.deferred) {
            await interaction.deferReply({ ephemeral: true });
        }
        await interaction.editReply({
            content: 'Sell percentage submission is coming soon!',
        });
    } catch (error) {
        console.error('Error in handleSellPercentageSubmit:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred.', ephemeral: true });
        }
    }
}

/**
 * Handle quick sell button clicks based on user settings
 */
export async function handleQuickSellSelection(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const config = state.solanaSellTokenConfig[userId];
        const buttonType = interaction.customId.replace('quick_sell_', '');
        
        if (!config) {
            await interaction.followUp({
                content: '❌ Configuration not found. Please restart the sell process.',
                ephemeral: true
            });
            return;
        }
        
        // Get the user's settings
        const userSettings = await getTradeSettings(userId);
        let percentage = 0;
        
        // Set percentage based on button clicked
        switch (buttonType) {
            case 'min':
                percentage = userSettings.minQuickSell;
                break;
            case 'med':
                percentage = userSettings.mediumQuickSell;
                break;
            case 'large':
                percentage = userSettings.largeQuickSell;
                break;
            default:
                percentage = 100; // Default fallback
        }
        
        // Update the configuration with the selected percentage
        config.sellPercentage = percentage;
        console.log(`Updated sell percentage to ${percentage}% using quick sell button`);
        
        // Fetch token details for the updated display
        const { solPublicKey } = await checkUserWallet(userId);
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        const selectedToken = tokenBalances.find(token => token.mint === config.tokenMint);
        
        if (!selectedToken) {
            await interaction.followUp({
                content: '❌ Token not found in your wallet. It may have been transferred or sold.',
                ephemeral: true
            });
            return;
        }
        
        const tokenDetails = await fetchTokenDetails(config.tokenMint);
        const tokenPrice = await fetchTokenPrice(config.tokenMint);
        
        // Show the updated sell config
        await showTokenSellConfig(interaction, selectedToken, tokenDetails, tokenPrice, true);
        
        // Add a followUp message confirming the action
        await interaction.followUp({
            content: `✅ Sell percentage set to ${percentage}% using ${buttonType} quick sell setting`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling quick sell selection:', error);
        await interaction.followUp({
            content: `❌ Error setting sell percentage: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle executing the token sale
 */
export async function handleExecuteSell(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const config = state.solanaSellTokenConfig[userId];
        
        // Verify we have all required data
        if (!config || !config.tokenMint || !config.sellPercentage) {
            await interaction.followUp({
                content: '❌ Missing required information for sale. Please configure properly.',
                ephemeral: true
            });
            return;
        }
        
        // Show processing message
        await interaction.followUp({
            content: '⏳ Processing your sale transaction...',
            ephemeral: true
        });
        
        // Get the fresh transaction keys
        const walletKeys = await getTransactionKeys(userId);
        
        if (!walletKeys.success) {
            await interaction.followUp({
                content: `❌ ${walletKeys.error || 'Failed to retrieve wallet keys'}. Please try again.`,
                ephemeral: true
            });
            return;
        }
        
        // Fetch current token balance
        const { solPublicKey } = await checkUserWallet(userId);
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        const selectedToken = tokenBalances.find(token => token.mint === config.tokenMint);
        
        if (!selectedToken || selectedToken.amount <= 0) {
            await interaction.followUp({
                content: '❌ You don\'t have any of this token to sell.',
                ephemeral: true
            });
            return;
        }
        
        // Calculate amount to sell based on percentage
        const sellAmount = (selectedToken.amount * config.sellPercentage) / 100;
        
        // Set up the API request parameters
        const apiParams = {
            private_key: walletKeys.solPrivateKey,
            inputMint: config.tokenMint,
            amount: sellAmount,
            slippage: config.slippage,
            priority_fee: config.priorityFee
        };
        
        // Debug log with redacted private key
        console.log('Preparing API parameters for sell with redacted private key:', {
            ...apiParams,
            private_key: '[REDACTED]'
        });
        
        try {
            console.log('Sending sale transaction to API...');
            
            // Use Jupiter swap API to sell the token
            const response = await axios.post(globalURLS.smallTimeDevsJupiterSell, apiParams);
            
            // Log the response for debugging
            console.log('API Response received for sell:', {
                status: response.status,
                success: response.data.success,
                message: response.data.message,
                txid: response.data.txid
            });
            
            // Check if the transaction was successful
            if (response.data && (response.data.success === true || response.data.message === 'Transaction confirmed')) {
                // Transaction was successful, get the token details
                const tokenDetails = await fetchTokenDetails(config.tokenMint);
                const tokenName = tokenDetails?.name || 'Unknown Token';
                const tokenSymbol = tokenDetails?.symbol || '';
                
                const txid = response.data.txid || response.data.signature;
                const solReceived = response.data.solReceived || 'Unknown';
                
                const embed = new EmbedBuilder()
                    .setTitle('Sale Successful')
                    .setColor(0x00FF00)
                    .addFields(
                        { 
                            name: 'Token', 
                            value: tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName, 
                            inline: true 
                        },
                        { 
                            name: 'Amount Sold', 
                            value: `${sellAmount} tokens (${config.sellPercentage}%)`, 
                            inline: true 
                        },
                        { 
                            name: 'SOL Received', 
                            value: solReceived ? `${solReceived} SOL` : 'Unknown amount', 
                            inline: true 
                        },
                        { 
                            name: 'Status', 
                            value: 'Completed', 
                            inline: true 
                        },
                        { 
                            name: 'Transaction ID', 
                            value: `[View on Solscan](https://solscan.io/tx/${txid})`, 
                            inline: false 
                        }
                    );
                
                // Create action buttons for follow-up actions
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('SOLANA_TOKEN_SELL')
                            .setLabel('Sell Another Token')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('back_to_spot_trading')
                            .setLabel('Back to Trading')
                            .setStyle(ButtonStyle.Secondary)
                    );
                
                await interaction.followUp({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
            } else if (response.data && response.data.error) {
                // Handle explicit error from API
                throw new Error(response.data.error);
            } else if (!response.data || !response.data.success) {
                // Check the response structure for other potential error indicators
                const errorMsg = response.data?.message || 'Unknown error';
                console.error('Unexpected API response for sell:', response.data);
                throw new Error(`API returned an unexpected response: ${errorMsg}`);
            }
            
        } catch (sellError) {
            console.error('Sale execution error:', sellError);
            console.error('Error details:', sellError.response?.data || 'No additional details');
            
            let errorMessage = 'Transaction failed';
            if (sellError.response?.data?.error) {
                errorMessage += `: ${sellError.response.data.error}`;
            } else if (sellError.message) {
                errorMessage += `: ${sellError.message}`;
            }
            
            await interaction.followUp({
                content: `❌ ${errorMessage}`,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('Error handling sell execution:', error);
        await interaction.followUp({
            content: '❌ An error occurred while processing your sale. Please try again.',
            ephemeral: true
        });
    }
}
