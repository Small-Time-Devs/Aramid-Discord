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
import { fetchSolBalance, fetchTokenBalances, fetchTokenDetails, getSolanaPriorityFee } from '../functions/utils.mjs';
import { getTradeSettings, getTransactionKeys } from '../../../../../src/db/dynamo.mjs';
import { showSolanaSpotTradingMenu } from '../ui/dashboard.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import { globalURLS, globalStaticConfig } from '../../../../../src/globals/global.mjs';

/**
 * Handle "Sell Token" button
 */
export async function handleSellToken(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const { solPublicKey } = await getTransactionKeys(userId);
        
        // Fetch token balances
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        const tokensWithBalance = tokenBalances.filter(token => token.amount > 0);
        
        if (!tokensWithBalance.length) {
            await interaction.followUp({
                content: '❌ You don\'t have any tokens to sell.',
                ephemeral: true
            });
            return;
        }
        
        // Create a list of tokens
        const embed = new EmbedBuilder()
            .setTitle('Select Token to Sell')
            .setDescription('Choose a token from your wallet')
            .setColor(0x0099FF);
            
        // Create rows of buttons for tokens
        const rows = [];
        const tokensPerRow = 3;
        
        for (let i = 0; i < tokensWithBalance.length && rows.length < 5; i += tokensPerRow) {
            const rowTokens = tokensWithBalance.slice(i, i + tokensPerRow);
            const row = new ActionRowBuilder();
            
            rowTokens.forEach(token => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sell_token_${token.mint}`)
                        .setLabel(`${token.name || 'Unknown'}: ${token.amount}`)
                        .setStyle(ButtonStyle.Primary)
                );
            });
            
            if (row.components.length > 0) {
                rows.push(row);
            }
        }
        
        // Add back button
        if (rows.length < 5) {
            const backRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_spot_trading')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️')
                );
            rows.push(backRow);
        }
        
        await interaction.editReply({
            embeds: [embed],
            components: rows
        });
        
    } catch (error) {
        console.error('Error handling token sell selection:', error);
        await interaction.followUp({
            content: `❌ Error loading tokens: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle token selection for selling
 */
export async function handleTokenSellSelection(interaction) {
    try {
        const tokenMint = interaction.customId.replace('sell_token_', '');
        const userId = interaction.user.id;
        
        // Initialize configuration
        if (!state.solanaSellTokenConfig) {
            state.solanaSellTokenConfig = {};
        }
        
        if (!state.solanaSellTokenConfig[userId]) {
            state.solanaSellTokenConfig[userId] = {};
        }
        
        // Set token to sell
        state.solanaSellTokenConfig[userId].tokenMint = tokenMint;
        
        await interaction.deferUpdate();
        
        // Get token details and user keys
        const tokenDetails = await fetchTokenDetails(tokenMint);
        const { solPublicKey } = await getTransactionKeys(userId);
        
        // Get token balances
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        const selectedToken = tokenBalances.find(t => t.mint === tokenMint);
        
        if (!selectedToken) {
            throw new Error('Token not found in wallet.');
        }
        
        const tokenAmount = selectedToken.amount;
        state.solanaSellTokenConfig[userId].maxAmount = tokenAmount;
        
        // Get user settings for quick sell buttons
        const userSettings = await getTradeSettings(userId);
        
        // Create the token selling configuration screen
        const embed = new EmbedBuilder()
            .setTitle('Token Sell Configuration')
            .setColor(0x0099FF)
            .addFields(
                { name: 'Token', value: tokenDetails?.name || 'Unknown Token', inline: true },
                { name: 'Balance', value: `${tokenAmount}`, inline: true },
                { name: 'Contract', value: `\`${tokenMint}\``, inline: false }
            );
            
        // Create row with sell percentage option
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_sell_percentage')
                    .setLabel('Set Percentage to Sell')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_priority_fee')
                    .setLabel('Set Priority Fee')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        // Create quick sell buttons if settings are configured
        const quickSellRow = new ActionRowBuilder();
        
        if (userSettings && userSettings.minQuickSell && userSettings.mediumQuickSell && userSettings.largeQuickSell) {
            quickSellRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('quick_sell_min')
                    .setLabel(`Sell ${userSettings.minQuickSell}%`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quick_sell_med')
                    .setLabel(`Sell ${userSettings.mediumQuickSell}%`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quick_sell_large')
                    .setLabel(`Sell ${userSettings.largeQuickSell}%`)
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        // Create execution and back buttons
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('execute_sell')
                    .setLabel('Execute Sell')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!state.solanaSellTokenConfig[userId].sellPercentage), // Disabled until percentage set
                new ButtonBuilder()
                    .setCustomId('SOLANA_TOKEN_SELL')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger)
            );
            
        // Prepare components based on whether quick sell buttons exist
        const components = quickSellRow.components.length > 0 ? 
            [row1, quickSellRow, row3] : [row1, row3];
        
        await interaction.editReply({
            embeds: [embed],
            components: components
        });
        
    } catch (error) {
        console.error('Error handling token sell selection:', error);
        await interaction.followUp({
            content: `❌ Error configuring token sell: ${error.message}. Please try again.`,
            ephemeral: true
        });
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
        const { solPublicKey } = await getTransactionKeys(userId);
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
        const { solPublicKey } = await getTransactionKeys(userId);
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
