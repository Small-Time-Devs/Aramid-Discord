import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } from 'discord.js';
import { sendApplicationMenu, sendChainSelectionForApp } from '../utils/discordMessages.mjs';
import { checkUserWallet } from '../db/dynamo.mjs';

// Update imports to reference settingsConfig.mjs instead of settings.mjs
import { 
    handleTradeSettings, 
    showQuickBuyModal, 
    showQuickSellModal,
    handleQuickBuySubmission, 
    handleQuickSellSubmission,
    handleBackToSpotTrading
} from '../../applications/chains/solana/spotTrading/actions/settingsConfig.mjs';

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
    handleQuickBuySelection  // Add this new import
} from '../../applications/chains/solana/spotTrading/solSpotTrading.mjs';

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
            console.log(`[DEBUG] Modal user: ${interaction.user.id} (${interaction.user.tag})`);
            console.log(`[DEBUG] Modal fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
            
            // Log the actual values for debugging (redact if sensitive)
            const fieldValues = {};
            interaction.fields.fields.forEach((value, key) => {
                fieldValues[key] = value.value;
            });
            console.log(`[DEBUG] Modal values: ${JSON.stringify(fieldValues)}`);
        }
        
        // IMPORTANT: Handle modals first, before any other processing
        if (interaction.isModalSubmit()) {
            console.log(`[MODAL DEBUG] Routing modal: ${interaction.customId}`);
            
            // Direct routing based on modal ID without any nested conditions
            switch(interaction.customId) {
                case 'quick_buy_modal':
                    console.log('[MODAL DEBUG] Processing quick buy modal');
                    await handleQuickBuySubmission(interaction);
                    return;
                    
                case 'quick_sell_modal':
                    console.log('[MODAL DEBUG] Processing quick sell modal');
                    await handleQuickSellSubmission(interaction);
                    return;
                    
                case 'token_address_modal':
                case 'token_address_input_modal':
                    console.log('[MODAL DEBUG] Processing token address modal');
                    await handleTokenAddressSubmit(interaction);
                    return;
                    
                case 'purchase_amount_modal':
                    console.log('[MODAL DEBUG] Processing purchase amount modal');
                    await handlePurchaseAmountSubmit(interaction);
                    return;
                    
                default:
                    console.log(`[MODAL DEBUG] Unhandled modal: ${interaction.customId}`);
                    await interaction.reply({
                        content: `Unknown form type: ${interaction.customId}`,
                        ephemeral: true
                    });
                    return;
            }
        }
        
        // Now handle buttons and other interaction types
        if (interaction.isButton()) {
            // Handle settings buttons
            if (interaction.customId === 'trade_settings' || interaction.customId === 'settings') {
                console.log('[DEBUG] Routing to handleTradeSettings');
                await handleTradeSettings(interaction);
                return;
            }
            
            if (interaction.customId === 'set_quick_buy') {
                console.log('[DEBUG] Routing to showQuickBuyModal');
                await showQuickBuyModal(interaction);
                return;
            }
            
            if (interaction.customId === 'set_quick_sell') {
                console.log('[DEBUG] Routing to showQuickSellModal');
                await showQuickSellModal(interaction);
                return;
            }
            
            // Quick buy buttons
            if (interaction.customId.startsWith('quick_buy_')) {
                console.log('[DEBUG] Routing to handleQuickBuySelection');
                await handleQuickBuySelection(interaction);
                return;
            }
            
            // Add explicit logging for quick buy buttons to verify they're being recognized
            if (interaction.customId.startsWith('quick_buy_')) {
                console.log('[DEBUG] Detected quick buy button click:', interaction.customId);
                await handleQuickBuySelection(interaction);
                return;
            }
            
            // ...other button handlers...
        }
        
        // SETTINGS HANDLERS - highest priority
        // These handle both button clicks and modal submissions related to settings
        
        if (interaction.isButton()) {
            // Handle settings buttons
            if (interaction.customId === 'trade_settings' || interaction.customId === 'settings') {
                console.log('[DEBUG] Routing to handleTradeSettings');
                await handleTradeSettings(interaction);
                return;
            }
            
            if (interaction.customId === 'set_quick_buy') {
                console.log('[DEBUG] Routing to showQuickBuyModal');
                await showQuickBuyModal(interaction);
                return;
            }
            
            if (interaction.customId === 'set_quick_sell') {
                console.log('[DEBUG] Routing to showQuickSellModal');
                await showQuickSellModal(interaction);
                return;
            }
            
            // ...other button handlers...
        }
        
        if (interaction.isModalSubmit()) {
            // Log all modal fields for debugging
            console.log(`[MODAL DEBUG] Modal ${interaction.customId} submission fields:`, 
                Array.from(interaction.fields.fields.entries())
                    .map(([id, value]) => `${id}: ${value.value}`).join(', '));
            
            // Handle settings modal submissions with more specific error handling
            if (interaction.customId === 'quick_buy_modal') {
                console.log('[DEBUG] Found quick_buy_modal submission, routing to handleQuickBuySubmission');
                try {
                    await handleQuickBuySubmission(interaction);
                    console.log('[DEBUG] handleQuickBuySubmission completed successfully');
                } catch (modalError) {
                    console.error('[DEBUG] Error in handleQuickBuySubmission:', modalError);
                    console.error('[DEBUG] Error stack:', modalError.stack);
                    // Only reply if we haven't already
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: `❌ Error processing settings: ${modalError.message}`,
                            ephemeral: true
                        });
                    }
                }
                return;
            }
            
            if (interaction.customId === 'quick_sell_modal') {
                console.log('[DEBUG] Found quick_sell_modal submission, routing to handleQuickSellSubmission');
                try {
                    await handleQuickSellSubmission(interaction);
                    console.log('[DEBUG] handleQuickSellSubmission completed successfully');
                } catch (modalError) {
                    console.error('[DEBUG] Error in handleQuickSellSubmission:', modalError);
                    console.error('[DEBUG] Error stack:', modalError.stack);
                    // Only reply if we haven't already
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: `❌ Error processing settings: ${modalError.message}`,
                            ephemeral: true
                        });
                    }
                }
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
                    
                // Add explicit cases for quick buy buttons
                case 'quick_buy_min':
                case 'quick_buy_med':
                case 'quick_buy_large':
                    console.log('[DEBUG] Routing to handleQuickBuySelection via case statement');
                    await handleQuickBuySelection(interaction);
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
        
        // Add additional context for debugging
        console.error('Interaction type:', interaction.type);
        console.error('Interaction ID:', interaction.id);
        console.error('User:', `${interaction.user.tag} (${interaction.user.id})`);
        
        if (interaction.isModalSubmit()) {
            console.error('Modal fields:', Array.from(interaction.fields.fields.keys()));
        }
        
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
