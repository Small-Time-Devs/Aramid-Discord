import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } from 'discord.js';
import { sendApplicationMenu, sendChainSelectionForApp } from '../utils/discordMessages.mjs';
import { checkUserWallet } from '../db/dynamo.mjs';

// Import all handlers directly from settings.mjs (not through directSettings.mjs which doesn't exist)
import { 
    handleTradeSettings, 
    showQuickBuyModal, 
    showQuickSellModal,
    handleQuickBuySubmission, 
    handleQuickSellSubmission,
    // Import the functions that were in directSettings directly from settings.mjs
    handleSettingsButton, 
    handleSetBuyButton, 
    handleSetSellButton,
    handleBuyModalSubmit,
    handleSellModalSubmit,
    // Import the exported objects for backward compatibility
    directSettings,
    standaloneSettings
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

// Remove any imports from non-existent files
// Remove: import { settingsHandler } from '../utils/settingsHandler.mjs';

/**
 * Handle application interactions
 */
export async function handleApplicationInteractions(interaction) {
    try {
        // Debug logging for all interactions
        if (interaction.isButton()) {
            console.log(`[DEBUG] Button interaction: ${interaction.customId}`);
        } else if (interaction.isModalSubmit()) {
            console.log(`[DEBUG] Modal submission: ${interaction.customId}`);
            console.log(`[DEBUG] Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        }
        
        // SETTINGS HANDLERS - highest priority
        // These handle both button clicks and modal submissions related to settings
        
        if (interaction.isButton()) {
            // Handle settings buttons
            if (interaction.customId === 'trade_settings' || interaction.customId === 'settings') {
                console.log('[DEBUG] Using settings button handler');
                await handleSettingsButton(interaction);
                return;
            }
            
            if (interaction.customId === 'direct_set_buy') {
                console.log('[DEBUG] Using buy settings button handler');
                await handleSetBuyButton(interaction);
                return;
            }
            
            if (interaction.customId === 'direct_set_sell') {
                console.log('[DEBUG] Using sell settings button handler');
                await handleSetSellButton(interaction);
                return;
            }
            
            if (interaction.customId === 'set_quick_buy') {
                console.log('[DEBUG] Using quick buy button handler');
                await showQuickBuyModal(interaction);
                return;
            }
            
            if (interaction.customId === 'set_quick_sell') {
                console.log('[DEBUG] Using quick sell button handler');
                await showQuickSellModal(interaction);
                return;
            }
        }
        
        if (interaction.isModalSubmit()) {
            // Handle settings modal submissions
            if (interaction.customId === 'direct_buy_modal') {
                console.log('[DEBUG] Processing direct buy modal submission');
                await handleBuyModalSubmit(interaction);
                return;
            }
            
            if (interaction.customId === 'direct_sell_modal') {
                console.log('[DEBUG] Processing direct sell modal submission');
                await handleSellModalSubmit(interaction);
                return;
            }
            
            if (interaction.customId === 'quick_buy_modal') {
                console.log('[DEBUG] Processing quick buy modal submission');
                await handleQuickBuySubmission(interaction);
                return;
            }
            
            if (interaction.customId === 'quick_sell_modal') {
                console.log('[DEBUG] Processing quick sell modal submission');
                await handleQuickSellSubmission(interaction);
                return;
            }
            
            // All other modal submissions
            switch (interaction.customId) {
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
        
        // Handle all other button interactions
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
