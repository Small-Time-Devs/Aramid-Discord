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

// Import the standalone settings module
import { standaloneSettings } from '../../applications/chains/solana/spotTrading/actions/standaloneSettings.mjs';

// Import direct settings handlers
import { 
    handleSettingsButton, 
    handleSetBuyButton, 
    handleSetSellButton,
    handleBuyModalSubmit,
    handleSellModalSubmit
} from '../../applications/chains/solana/spotTrading/actions/directSettings.mjs';

// Import the simple settings handler
import { settingsHandler } from '../utils/settingsHandler.mjs';

/**
 * Handle application interactions
 */
export async function handleApplicationInteractions(interaction) {
    try {
        // Add detailed logging for modal submissions to help diagnose issues
        if (interaction.isModalSubmit()) {
            console.log(`[DEBUG] Processing modal submission: ${interaction.customId}`);
            console.log(`[DEBUG] Available fields:`, Array.from(interaction.fields.fields.keys()));
        }
        
        // Handle button interactions
        if (interaction.isButton()) {
            // ... existing button handling code ...
            
            // Special case for settings button - make sure we're handling it correctly
            if (interaction.customId === 'trade_settings') {
                console.log('[DEBUG] Trade settings button clicked');
                await handleTradeSettings(interaction);
                return;
            }
            
            if (interaction.customId === 'set_quick_buy') {
                console.log('[DEBUG] Set quick buy button clicked');
                await showQuickBuyModal(interaction);
                return;
            }
            
            if (interaction.customId === 'set_quick_sell') {
                console.log('[DEBUG] Set quick sell button clicked');
                await showQuickSellModal(interaction);
                return;
            }
            
            // ... rest of button handling ...
        }
        
        // Handle modal submissions - make sure we're handling the quick buy/sell modals correctly
        if (interaction.isModalSubmit()) {
            // Direct access to modal fields for debugging purposes
            console.log(`[DEBUG] Modal submission fields:`, 
                Array.from(interaction.fields.fields.entries())
                    .map(([id, field]) => `${id}: ${field.value}`));
            
            if (interaction.customId === 'quick_buy_modal') {
                console.log('[DEBUG] Quick buy modal submitted');
                // Call the handler directly without any wrapping
                await handleQuickBuySubmission(interaction);
                return;
            }
            
            if (interaction.customId === 'quick_sell_modal') {
                console.log('[DEBUG] Quick sell modal submitted');
                // Call the handler directly without any wrapping
                await handleQuickSellSubmission(interaction);
                return;
            }
            
            // ... rest of modal handling ...
        }
        
        // --- SETTINGS HANDLERS ---
        // These come first to ensure they take priority
        
        // Handle settings buttons
        if (interaction.isButton()) {
            if (interaction.customId === 'trade_settings' || interaction.customId === 'settings') {
                await settingsHandler.showSettings(interaction);
                return;
            }
            
            if (interaction.customId === 'settings_edit_buy') {
                await settingsHandler.showBuyAmountsModal(interaction);
                return;
            }
            
            if (interaction.customId === 'settings_edit_sell') {
                await settingsHandler.showSellAmountsModal(interaction);
                return;
            }
        }
        
        // Handle settings modals
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'settings_buy_modal') {
                await settingsHandler.handleBuyModalSubmit(interaction);
                return;
            }
            
            if (interaction.customId === 'settings_sell_modal') {
                await settingsHandler.handleSellModalSubmit(interaction);
                return;
            }
        }
        
        // --- REGULAR HANDLERS ---
        // Rest of your existing handlers

        // Log all interactions for debugging
        if (interaction.isButton()) {
            console.log(`[DEBUG] Button interaction: ${interaction.customId}`);
        } else if (interaction.isModalSubmit()) {
            console.log(`[DEBUG] Modal submission: ${interaction.customId}`);
            console.log(`[DEBUG] Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        }
        
        // DIRECT SETTINGS HANDLERS - Process with highest priority
        if (interaction.isButton()) {
            if (interaction.customId === 'trade_settings' || interaction.customId === 'settings') {
                await handleSettingsButton(interaction);
                return;
            }
            
            if (interaction.customId === 'direct_set_buy') {
                await handleSetBuyButton(interaction);
                return;
            }
            
            if (interaction.customId === 'direct_set_sell') {
                await handleSetSellButton(interaction);
                return;
            }
        }
        
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'direct_buy_modal') {
                await handleBuyModalSubmit(interaction);
                return;
            }
            
            if (interaction.customId === 'direct_sell_modal') {
                await handleSellModalSubmit(interaction);
                return;
            }
        }
        
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
