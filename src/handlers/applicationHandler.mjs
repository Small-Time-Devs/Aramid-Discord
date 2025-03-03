import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } from 'discord.js';
import { sendApplicationMenu, sendChainSelectionForApp } from '../utils/discordMessages.mjs';
import { checkUserWallet } from '../db/dynamo.mjs';
import { 
    showSolanaSpotTradingMenu, 
    handleTradeSettings, 
    showQuickBuyModal, 
    showQuickSellModal, 
    handleQuickBuySubmission, 
    handleQuickSellSubmission, 
    handleTokenAddressInput,
    handleTokenAddressSubmit,  // Now a single unified function
    handleTokenSelection,
    // Import new handlers
    handleBuyNewToken,
    handleEnterTokenAddress,
    handlePopularTokenSelect,
    handleSetPurchaseAmount,
    handlePurchaseAmountSubmit,
    handleSetSlippage,
    handleSlippageSelection,
    handleSetPriorityFee,
    handlePriorityFeeSelection,
    handleExecutePurchase,
    handleBackToPurchaseConfig,
    handleBackToBuyOptions,
    handleBackToSpotTrading
} from '../../applications/chains/solana/spotTrading/solSpotTrading.mjs';

export async function handleApplicationInteractions(interaction) {
    try {
        // Add debug logging for all interactions
        if (interaction.isButton() || interaction.isModalSubmit()) {
            console.log(`[DEBUG] Processing ${interaction.isButton() ? 'button' : 'modal'} interaction with ID: ${interaction.customId}`);
        }

        // Handle button interactions
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'applications':
                    await sendApplicationMenu(interaction);
                    break;

                case 'spot_trading':
                    await sendChainSelectionForApp(interaction, 'spot');
                    break;

                case 'market_maker':
                    await sendChainSelectionForApp(interaction, 'market');
                    break;

                case 'spot_solana':
                    await showSolanaSpotTradingMenu(interaction);
                    break;
                    
                // Solana spot trading buttons
                case 'SOLANA_TOKEN_BUY':
                    await handleBuyNewToken(interaction);
                    break;
                    
                case 'enter_token_address':
                    await handleEnterTokenAddress(interaction);
                    break;
                    
                case 'set_purchase_amount':
                    await handleSetPurchaseAmount(interaction);
                    break;
                    
                case 'set_slippage':
                    await handleSetSlippage(interaction);
                    break;
                
                case 'set_priority_fee':
                    await handleSetPriorityFee(interaction);
                    break;
                    
                case 'execute_purchase':
                    await handleExecutePurchase(interaction);
                    break;
                    
                case 'back_to_purchase_config':
                    await handleBackToPurchaseConfig(interaction);
                    break;
                    
                case 'back_to_buy_options':
                    await handleBackToBuyOptions(interaction);
                    break;
                    
                case 'back_to_spot_trading':
                    await handleBackToSpotTrading(interaction);
                    break;

                case 'spot_xrp':
                    // Handle XRP spot trading
                    await interaction.update({
                        content: 'Starting XRP spot trading...',
                        components: [],
                        embeds: []
                    });
                    // Add logic to start XRP spot trading
                    break;

                case 'market_solana':
                    // Handle Solana market making
                    await interaction.update({
                        content: 'Starting Solana market making...',
                        components: [],
                        embeds: []
                    });
                    // Add logic to start Solana market making
                    break;

                case 'market_xrp':
                    // Handle XRP market making
                    await interaction.update({
                        content: 'Starting XRP market making...',
                        components: [],
                        embeds: []
                    });
                    // Add logic to start XRP market making
                    break;

                case 'back_to_applications':
                    await sendApplicationMenu(interaction);
                    break;

                case 'trade_settings':
                    await handleTradeSettings(interaction);
                    break;

                case 'set_quick_buy':
                    await showQuickBuyModal(interaction);
                    break;

                case 'set_quick_sell':
                    await showQuickSellModal(interaction);
                    break;
                    
                default:
                    // Handle token selection buttons
                    if (interaction.customId.startsWith('buy_more_')) {
                        await handleTokenSelection(interaction);
                    } else if (interaction.customId.startsWith('popular_token_')) {
                        await handlePopularTokenSelect(interaction);
                    } else if (interaction.customId.startsWith('slippage_')) {
                        await handleSlippageSelection(interaction);
                    } else if (interaction.customId.startsWith('fee_')) {
                        await handlePriorityFeeSelection(interaction);
                    }
                    break;
            }
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            console.log(`[DEBUG] Modal submission received with ID: ${interaction.customId}`);
            console.log(`[DEBUG] Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
            
            switch (interaction.customId) {
                case 'quick_buy_modal':
                    console.log('[DEBUG] Handling quick buy modal submission');
                    await handleQuickBuySubmission(interaction);
                    break;
                    
                case 'quick_sell_modal':
                    console.log('[DEBUG] Handling quick sell modal submission');
                    await handleQuickSellSubmission(interaction);
                    break;
                    
                case 'token_address_modal':
                case 'token_address_input_modal':
                    console.log(`[DEBUG] Handling token address modal submission: ${interaction.customId}`);
                    await handleTokenAddressSubmit(interaction);
                    break;
                    
                case 'purchase_amount_modal':
                    console.log('[DEBUG] Handling purchase amount modal submission');
                    await handlePurchaseAmountSubmit(interaction);
                    break;
                
                default:
                    console.log(`[DEBUG] Unknown modal submission: ${interaction.customId}`);
                    // Try to match partial IDs for robustness
                    if (interaction.customId.includes('token_address')) {
                        console.log('[DEBUG] Matched partial ID for token address - forwarding');
                        await handleTokenAddressSubmit(interaction);
                    }
                    break;
            }
        }

    } catch (error) {
        console.error('Top level error in application handler:', error);
        console.error('Error stack:', error.stack);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred. Please try again.',
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: '❌ An error occurred. Please try again.',
                ephemeral: true
            });
        }
    }
}

// This event handler can be registered elsewhere in your code where you setup the client/bot
export function setupBuyMoreButtonHandler(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('buy_more_')) {
            await handleTokenSelection(interaction);
        }
    });
}
