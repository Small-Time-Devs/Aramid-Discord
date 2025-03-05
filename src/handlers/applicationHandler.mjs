import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } from 'discord.js';
import { sendApplicationMenu, sendChainSelectionForApp } from '../utils/discordMessages.mjs';
import { checkUserWallet } from '../db/dynamo.mjs';
// Import the actions from settings.mjs directly instead of through solSpotTrading.mjs
import { 
    handleTradeSettings, 
    showQuickBuyModal, 
    showQuickSellModal,
    handleQuickBuySubmission,
    handleQuickSellSubmission
} from '../../applications/chains/solana/spotTrading/actions/settings.mjs';

// Import other handlers from solSpotTrading.mjs
import { 
    showSolanaSpotTradingMenu, 
    handleTokenAddressInput,
    handleTokenAddressSubmit,
    handleTokenSelection,
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

// Import the simplified settings handlers
import {
    showSimpleQuickBuyModal,
    handleSimpleQuickBuySubmit,
    showSimpleQuickSellModal,
    handleSimpleQuickSellSubmit,
    showSimpleSettingsDashboard
} from '../../applications/chains/solana/spotTrading/actions/simplifiedSettings.mjs';

// Import the standalone settings module
import { standaloneSettings } from '../../applications/chains/solana/spotTrading/actions/standaloneSettings.mjs';

/**
 * Handle application interactions
 */
export async function handleApplicationInteractions(interaction) {
    try {
        // STANDALONE SETTINGS HANDLER - Process these first with highest priority
        if (interaction.customId === 'trade_settings' || interaction.customId === 'settings') {
            console.log('[SETTINGS] Displaying settings dashboard');
            await standaloneSettings.displayDashboard(interaction);
            return;
        }
        
        if (interaction.customId === 'standalone_quick_buy_button') {
            console.log('[SETTINGS] Opening buy settings modal');
            await standaloneSettings.showBuyModal(interaction);
            return;
        }
        
        if (interaction.customId === 'standalone_quick_sell_button') {
            console.log('[SETTINGS] Opening sell settings modal');
            await standaloneSettings.showSellModal(interaction);
            return;
        }
        
        if (interaction.customId === 'standalone_buy_modal') {
            console.log('[SETTINGS] Processing buy settings submission');
            await standaloneSettings.handleBuySubmit(interaction);
            return;
        }
        
        if (interaction.customId === 'standalone_sell_modal') {
            console.log('[SETTINGS] Processing sell settings submission');
            await standaloneSettings.handleSellSubmit(interaction);
            return;
        }
        
        // General handler - only reached if not a settings interaction
        if (interaction.isModalSubmit()) {
            console.log(`[DEBUG] Processing modal submission: ${interaction.customId}`);
            
            // Handle existing modals
            switch (interaction.customId) {
                case 'quick_buy_modal':
                    console.log('[DEBUG] Routing to handleQuickBuySubmission');
                    await handleQuickBuySubmission(interaction);
                    return;
                
                case 'quick_sell_modal':
                    console.log('[DEBUG] Routing to handleQuickSellSubmission');
                    await handleQuickSellSubmission(interaction);
                    return;
                
                case 'token_address_modal':
                case 'token_address_input_modal':
                    console.log('[DEBUG] Routing to handleTokenAddressSubmit');
                    await handleTokenAddressSubmit(interaction);
                    return;
                
                case 'purchase_amount_modal':
                    console.log('[DEBUG] Routing to handlePurchaseAmountSubmit');
                    await handlePurchaseAmountSubmit(interaction);
                    return;
                
                default:
                    console.log(`[DEBUG] Unhandled modal submission: ${interaction.customId}`);
                    break;
            }
        }
        
        if (interaction.isButton()) {
            console.log(`[DEBUG] Processing button interaction: ${interaction.customId}`);
            
            // Handle existing buttons
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
                    return;

                case 'set_quick_buy':
                    await showQuickBuyModal(interaction);
                    return;

                case 'set_quick_sell':
                    await showQuickSellModal(interaction);
                    return;
                    
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

    } catch (error) {
        console.error('Error handling application interaction:', error);
        console.error('Error stack:', error.stack);
        try {
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
        } catch (followUpError) {
            console.error('Error sending error message:', followUpError);
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
