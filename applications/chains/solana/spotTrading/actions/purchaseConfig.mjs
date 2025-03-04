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
import { 
    fetchSolBalance, 
    fetchTokenDetails, 
    fetchTokenPrice, 
    getSolanaPriorityFee 
} from '../functions/utils.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { showTokenPurchaseConfig } from '../ui/purchaseConfig.mjs';
import { showTokenBuyOptions } from './tokenSelection.mjs';
import { showSolanaSpotTradingMenu } from '../ui/dashboard.mjs';
import axios from 'axios';
import { globalURLS } from '../../../../../src/globals/global.mjs';
import { checkUserWallet } from '../../../../../src/db/dynamo.mjs';

/**
 * Handle set purchase amount button
 */
export async function handleSetPurchaseAmount(interaction) {
    try {
        console.log('Showing purchase amount modal...');
        
        // Make sure the modal ID matches what we check for in the handler
        const modal = new ModalBuilder()
            .setCustomId('purchase_amount_modal') // Keep this ID consistent
            .setTitle('Set Purchase Amount');

        const amountInput = new TextInputBuilder()
            .setCustomId('purchase_amount') // Keep this ID consistent
            .setLabel('Amount to spend (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.01')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(row);

        console.log('Showing modal with ID:', modal.data.custom_id);
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing purchase amount modal:', error);
        await interaction.reply({
            content: `❌ Failed to open amount input: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle purchase amount input from modal
 */
export async function handlePurchaseAmountSubmit(interaction) {
    try {
        console.log('⭐ Processing purchase amount submission...');
        console.log(`Modal ID: ${interaction.customId}`);
        console.log(`Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Get the amount value from the input field
        const inputValue = interaction.fields.getTextInputValue('purchase_amount');
        console.log(`Amount entered: ${inputValue}`);
        
        const amount = parseFloat(inputValue);
        const userId = interaction.user.id;
        
        if (isNaN(amount) || amount <= 0) {
            await interaction.reply({
                content: '❌ Please enter a valid amount greater than 0.',
                ephemeral: true
            });
            return;
        }
        
        // Update configuration
        if (!state.solanaBuyTokenConfig[userId]) {
            console.error('No configuration found for user:', userId);
            await interaction.reply({
                content: '❌ Configuration error. Please restart the purchase process.',
                ephemeral: true
            });
            return;
        }
        
        state.solanaBuyTokenConfig[userId].amount = amount;
        console.log(`Updated amount to ${amount} SOL for user ${userId}`);
        
        // Defer the reply to prevent timeout during token fetching
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Fetch token details to display updated configuration
            const tokenAddress = state.solanaBuyTokenConfig[userId].outputMint;
            console.log(`Fetching details for token: ${tokenAddress}`);
            
            const tokenDetails = await fetchTokenDetails(tokenAddress);
            const tokenPrice = await fetchTokenPrice(tokenAddress);
            console.log('Token details fetched successfully');
            
            // Display updated configuration
            await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice, true);
            
        } catch (detailsError) {
            console.error('Error in token details processing:', detailsError);
            await interaction.editReply({
                content: `✅ Amount set to ${amount} SOL, but couldn't load full details. You can proceed with purchase.`,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('Error handling purchase amount input:', error);
        
        // Safe response based on interaction state
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error processing amount: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else if (interaction.deferred) {
            await interaction.editReply({
                content: `❌ Error processing amount: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error processing amount: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle set slippage button
 */
export async function handleSetSlippage(interaction) {
    try {
        const userId = interaction.user.id;
        
        const embed = new EmbedBuilder()
            .setTitle('Set Slippage Tolerance')
            .setDescription('Select your preferred slippage tolerance')
            .setColor(0x0099FF);
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('slippage_10')
                    .setLabel('0.1%')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slippage_50')
                    .setLabel('0.5%')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slippage_100')
                    .setLabel('1.0%')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slippage_300')
                    .setLabel('3.0%')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('back_to_purchase_config')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger)
            );
            
        await interaction.update({
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error showing slippage options:', error);
        await interaction.reply({
            content: '❌ Failed to load slippage options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle slippage selection
 */
export async function handleSlippageSelection(interaction) {
    try {
        const slippageKey = interaction.customId.replace('slippage_', '');
        const slippageValue = parseInt(slippageKey);
        const userId = interaction.user.id;
        
        // Update configuration
        state.solanaBuyTokenConfig[userId].slippage = slippageValue;
        
        // Fetch token details to display updated configuration
        const tokenAddress = state.solanaBuyTokenConfig[userId].outputMint;
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const tokenPrice = await fetchTokenPrice(tokenAddress);
        
        // Display updated configuration
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice);
        
    } catch (error) {
        console.error('Error handling slippage selection:', error);
        await interaction.reply({
            content: '❌ Error setting slippage. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle back to purchase config button
 */
export async function handleBackToPurchaseConfig(interaction) {
    try {
        const userId = interaction.user.id;
        const tokenAddress = state.solanaBuyTokenConfig[userId].outputMint;
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const tokenPrice = await fetchTokenPrice(tokenAddress);
        
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice);
    } catch (error) {
        console.error('Error going back to purchase config:', error);
        await interaction.reply({
            content: '❌ Failed to return to purchase configuration. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle back to buy options button
 */
export async function handleBackToBuyOptions(interaction) {
    try {
        await showTokenBuyOptions(interaction);
    } catch (error) {
        console.error('Error going back to buy options:', error);
        await interaction.reply({
            content: '❌ Failed to return to token options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle set priority fee button
 */
export async function handleSetPriorityFee(interaction) {
    try {
        const priorityFees = await getSolanaPriorityFee();
        const userId = interaction.user.id;
        
        const embed = new EmbedBuilder()
            .setTitle('Set Priority Fee')
            .setDescription('Select your preferred priority fee level')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Current Network Fees', 
                    value: [
                        `Low: ${(priorityFees.lowFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
                        `Medium: ${(priorityFees.mediumFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
                        `High: ${(priorityFees.highFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`
                    ].join('\n'), 
                    inline: false 
                }
            );
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fee_low')
                    .setLabel('Low')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('fee_medium')
                    .setLabel('Medium')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('fee_high')
                    .setLabel('High')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('back_to_purchase_config')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger)
            );
            
        await interaction.update({
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error showing priority fee options:', error);
        await interaction.reply({
            content: '❌ Failed to load priority fee options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle priority fee selection
 */
export async function handlePriorityFeeSelection(interaction) {
    try {
        const feeKey = interaction.customId.replace('fee_', '');
        const userId = interaction.user.id;
        const priorityFees = await getSolanaPriorityFee();
        
        let selectedFee = 0;
        switch (feeKey) {
            case 'low':
                selectedFee = priorityFees.lowFee;
                break;
            case 'medium':
                selectedFee = priorityFees.mediumFee;
                break;
            case 'high':
                selectedFee = priorityFees.highFee;
                break;
            default:
                selectedFee = priorityFees.mediumFee;
        }
        
        // Update configuration
        state.solanaBuyTokenConfig[userId].priorityFee = selectedFee;
        state.solanaBuyTokenConfig[userId].priorityFeeSol = selectedFee / LAMPORTS_PER_SOL;
        
        // Fetch token details to display updated configuration
        const tokenAddress = state.solanaBuyTokenConfig[userId].outputMint;
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const tokenPrice = await fetchTokenPrice(tokenAddress);
        
        // Display updated configuration
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice);
        
    } catch (error) {
        console.error('Error handling priority fee selection:', error);
        await interaction.reply({
            content: '❌ Error setting priority fee. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle execute purchase button
 */
export async function handleExecutePurchase(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const config = state.solanaBuyTokenConfig[userId];
        
        // Verify we have all required data
        if (!config || !config.outputMint || !config.amount) {
            await interaction.followUp({
                content: '❌ Missing required information for purchase. Please configure properly.',
                ephemeral: true
            });
            return;
        }
        
        // Do some basic validation
        const solBalance = await fetchSolBalance(config.solPublicKey);
        if (solBalance < config.amount) {
            await interaction.followUp({
                content: `❌ Insufficient balance. You have ${solBalance.toFixed(4)} SOL but tried to spend ${config.amount} SOL.`,
                ephemeral: true
            });
            return;
        }
        
        // Show processing message
        await interaction.followUp({
            content: '⏳ Processing your transaction...',
            ephemeral: true
        });
        
        // Since getReferralPublicKey might not exist, we'll skip that part
        // and just use an empty string for the referral key
        const referralPublicKey = '';
        
        try {
            // Make the actual API call to execute the purchase
            const response = await axios.post(`${globalURLS.smallTimeDevsTradeAPI}/aramidBuy`, {
                private_key: config.solPrivateKey,
                public_key: config.solPublicKey,
                mint: config.outputMint,
                amount: config.amount,
                referralPublicKey: referralPublicKey,
                priorityFee: config.priorityFee,
                slippage: config.slippage,
                useJito: config.jito || false,
            });
            
            console.log('API Response:', response.data);
            
            if (response.data.message === 'Transaction confirmed') {
                // Create success embed with actual transaction data
                const tokenDetails = await fetchTokenDetails(config.outputMint);
                const tokenName = tokenDetails?.name || 'Unknown Token';
                const tokenSymbol = tokenDetails?.symbol || '';
                
                const embed = new EmbedBuilder()
                    .setTitle('Transaction Successful')
                    .setColor(0x00FF00)
                    .addFields(
                        { 
                            name: 'Token', 
                            value: tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName, 
                            inline: true 
                        },
                        { 
                            name: 'Amount Spent', 
                            value: `${config.amount} SOL`, 
                            inline: true 
                        },
                        { 
                            name: 'Tokens Purchased', 
                            value: `${response.data.tokensPurchased || 'Unknown'}`, 
                            inline: true 
                        },
                        { 
                            name: 'Status', 
                            value: 'Completed', 
                            inline: true 
                        },
                        { 
                            name: 'Transaction ID', 
                            value: `[View on Solscan](https://solscan.io/tx/${response.data.txid})`, 
                            inline: false 
                        }
                    );
                
                await interaction.followUp({
                    embeds: [embed],
                    ephemeral: true
                });
            } else {
                throw new Error(response.data.error || 'Unknown error occurred');
            }
            
        } catch (purchaseError) {
            console.error('Purchase execution error:', purchaseError);
            
            let errorMessage = 'Transaction failed';
            if (purchaseError.response?.data?.error) {
                errorMessage += `: ${purchaseError.response.data.error}`;
            } else if (purchaseError.message) {
                errorMessage += `: ${purchaseError.message}`;
            }
            
            await interaction.followUp({
                content: `❌ ${errorMessage}`,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('Error handling purchase execution:', error);
        await interaction.followUp({
            content: '❌ An error occurred while processing your purchase. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle back to spot trading button
 */
export async function handleBackToSpotTrading(interaction) {
    try {
        await showSolanaSpotTradingMenu(interaction);
    } catch (error) {
        console.error('Error returning to trading menu:', error);
        await interaction.followUp({
            content: '❌ Failed to return to trading menu. Please try again.',
            ephemeral: true
        });
    }
}