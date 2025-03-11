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
    handleQuickBuySelection
} from '../../applications/chains/solana/spotTrading/solSpotTrading.mjs';

// Update this import to import directly from tokenSelling.mjs instead of through solSpotTrading.mjs
import { 
    handleSellToken,
    handleTokenSellSelection,
    handleSetSellPercentage,
    handleSellPercentageSubmit,
    handleQuickSellSelection,
    handleExecuteSell
} from '../../applications/chains/solana/spotTrading/actions/tokenSelling.mjs';

// Add this import at the top with other imports
import { developmentFlags, devFeatureMessage, isWhitelistedForDevFeatures, isFeatureAvailable, logFeatureStatus } from '../globals/global.mjs';

// Update this import to get the function directly from the dashboard file
import { showSolanaSpotTradingMenu } from '../../applications/chains/solana/spotTrading/ui/dashboard.mjs';

// Add these imports at the top with other imports
import { 
    showChannelsManagementMenu,
    handleRegisterChannel,
    handleUnregisterChannel,
    handleSetPrimaryChannel,
    handleBackToSettings
} from '../utils/settingsMenu.mjs';
import { registerUserChannel } from '../utils/channelManager.mjs';

// Import the market making functions
import {
    handleMarketMakerSettings,
    handleTokenSelection as handleMarketMakerTokenSelection,  // Rename to avoid conflicts
    showSpreadSettingsModal,
    handleSpreadSettingsSubmit,
    handleRangeSettingsModal,
    handleRangeSettingsSubmit,
    handleTokenAddressInput as handleMarketMakerTokenAddressInput,  // Rename to avoid conflicts
    handleTokenAddressSubmit as handleMarketMakerTokenAddressSubmit,  // Rename to avoid conflicts
    handleBackToMarketMaker,
    handlePopularTokenSelect as handleMarketMakerPopularTokenSelect,  // Rename to avoid conflicts
    handleStartMarketMaking,
    handleStopMarketMaking,
    handleViewMarketMakingStats
} from '../../applications/chains/solana/marketMaking/marketMakerMain.mjs';

// Import dashboard separately to avoid duplicate declaration
import { showMarketMakerDashboard } from '../../applications/chains/solana/marketMaking/ui/dashboard.mjs';

// Add this import at the top of the file
import { handleMarketMakingInteractions } from '../../applications/chains/solana/marketMaking/handlers.mjs';

/**
 * Handle application interactions
 */
export async function handleApplicationInteractions(interaction) {
    try {
        const userId = interaction.user.id;
        
        // Auto-register the current channel for the user when they interact with the bot
        // This helps build the channel list automatically over time
        await registerUserChannel(userId, interaction.channelId);

        // Debug logging for all interactions
        if (interaction.isButton()) {
            console.log(`[DEBUG] Button interaction: ${interaction.customId}`);
            logFeatureStatus(userId);
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

        // Try to handle with market making handler first
        if ((interaction.isButton() || interaction.isModalSubmit()) && 
            (interaction.customId.startsWith('mm_') || 
             interaction.customId === 'select_mm_token' || 
             interaction.customId === 'back_to_mm_dashboard' ||
             interaction.customId === 'start_market_making' ||
             interaction.customId === 'stop_market_making' ||
             interaction.customId === 'view_mm_stats' ||
             interaction.customId === 'set_mm_spread' ||
             interaction.customId === 'set_mm_range' ||
             interaction.customId === 'toggle_auto_adjust' ||
             interaction.customId === 'save_mm_config')) {
            
            const handled = await handleMarketMakingInteractions(interaction);
            if (handled) return;
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
                    
                case 'sell_percentage_modal':
                    await handleSellPercentageSubmit(interaction);
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
            
            // Add handlers for sell-related buttons
            switch (interaction.customId) {
                case 'SOLANA_TOKEN_SELL':
                    await handleSellToken(interaction);
                    return;
                    
                case 'set_sell_percentage':
                    await handleSetSellPercentage(interaction);
                    return;
                    
                case 'execute_sell':
                    await handleExecuteSell(interaction);
                    return;
                    
                // ...other button handlers...
            }
            
            // Handle pattern-matched button IDs
            if (interaction.customId.startsWith('sell_token_')) {
                await handleTokenSellSelection(interaction);
                return;
            }
            
            if (interaction.customId.startsWith('quick_sell_')) {
                await handleQuickSellSelection(interaction);
                return;
            }
        }
        
        // Handle modal submissions related to settings
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
                
                case 'sell_percentage_modal':
                    await handleSellPercentageSubmit(interaction);
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
                    // Check if spot trading is in development mode and user is not whitelisted
                    if (!isFeatureAvailable('applications', 'spotTrading', userId)) {
                        await interaction.reply({
                            content: devFeatureMessage('Spot Trading'),
                            ephemeral: true
                        });
                        return;
                    }
                    await sendChainSelectionForApp(interaction, 'spot');
                    break;

                case 'market_maker':
                    // Check if market making is in development mode and user is not whitelisted
                    if (!isFeatureAvailable('applications', 'marketMaker', userId)) {
                        await interaction.reply({
                            content: devFeatureMessage('Market Making'),
                            ephemeral: true
                        });
                        return;
                    }
                    
                    console.log('[DEBUG] Handling market maker button click');
            
                    // Show chain selection for market making
                    const embed = new EmbedBuilder()
                        .setTitle('Select Blockchain for Market Making')
                        .setDescription('Choose which blockchain you want to use for market making:')
                        .setColor(0x6E0DAD); // Purple for market making
                        
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('market_solana')
                                .setLabel('Solana')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('💫'),
                            new ButtonBuilder()
                                .setCustomId('back_to_applications')
                                .setLabel('Back')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('↩️')
                        );
                        
                    await interaction.reply({
                        embeds: [embed],
                        components: [row],
                        ephemeral: true
                    });
                    
                    return;

                case 'spot_solana':
                    // Check if Solana chain is in development mode and user is not whitelisted
                    if (!isFeatureAvailable('chains', 'solChain', userId)) {
                        await interaction.reply({
                            content: devFeatureMessage('Solana Spot Trading'),
                            ephemeral: true
                        });
                        return;
                    }
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
                    console.log('[DEBUG] Routing to handleBackToBuyOptions');
                    await handleBackToBuyOptions(interaction);
                    break;
                    
                case 'back_to_spot_trading':
                    await handleBackToSpotTrading(interaction);
                    break;

                case 'spot_xrp':
                    console.log(`[DEBUG] Handling spot_xrp button. XRP Chain dev status: ${developmentFlags.chains.xrpChain}`);
                    console.log(`[DEBUG] User ${userId} whitelisted: ${isWhitelistedForDevFeatures(userId)}`);
                    console.log(`[DEBUG] Feature available: ${isFeatureAvailable('chains', 'xrpChain', userId)}`);
                    
                    // Check if XRP chain is in development mode and user is not whitelisted
                    if (!isFeatureAvailable('chains', 'xrpChain', userId)) {
                        console.log(`[DEBUG] Showing development message for XRP spot trading`);
                        await interaction.reply({
                            content: devFeatureMessage('XRP Spot Trading'),
                            ephemeral: true
                        });
                        return;
                    }
                    
                    console.log(`[DEBUG] User ${userId} accessing XRP spot trading`);
                    // Existing XRP spot trading code
                    await interaction.update({
                        content: 'Starting XRP spot trading...',
                        components: [],
                        embeds: []
                    });
                    break;

                case 'market_solana':
                    // Check if Solana chain is in development mode and user is not whitelisted
                    if (!isFeatureAvailable('chains', 'solChain', userId) || 
                        !isFeatureAvailable('applications', 'marketMaker', userId)) {
                        await interaction.reply({
                            content: devFeatureMessage('Solana Market Making'),
                            ephemeral: true
                        });
                        return;
                    }
                    
                    console.log('[DEBUG] Opening Solana market making dashboard');
            
                    // First defer the reply to prevent timeout during processing
                    await interaction.deferUpdate().catch(err => {
                        console.error('Error deferring update:', err);
                    });
                    
                    // Show market maker dashboard with the followUp flag set to true
                    // This ensures we don't try to update an already-replied interaction
                    await showMarketMakerDashboard(interaction, true);
                    
                    return;

                case 'market_xrp':
                    // Check if XRP chain is in development mode and user is not whitelisted
                    if (!isFeatureAvailable('chains', 'xrpChain', userId) || 
                        !isFeatureAvailable('applications', 'marketMaker', userId)) {
                        await interaction.reply({
                            content: devFeatureMessage('XRP Market Making'),
                            ephemeral: true
                        });
                        return;
                    }
                    
                    console.log(`[DEBUG] User ${userId} accessing XRP market making`);
                    // Existing XRP market making code
                    await interaction.update({
                        content: 'Starting XRP market making...',
                        components: [],
                        embeds: []
                    });
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
                    
                // Add new cases for channel management
                case 'manage_channels':
                    await showChannelsManagementMenu(interaction);
                    break;
                    
                case 'register_current_channel':
                    await handleRegisterChannel(interaction);
                    break;
                    
                case 'unregister_current_channel':
                    await handleUnregisterChannel(interaction);
                    break;
                    
                case 'set_primary_channel':
                    await handleSetPrimaryChannel(interaction);
                    break;
                    
                case 'back_to_settings':
                    await handleBackToSettings(interaction);
                    break;
                    
                // Market Making Module
                case 'SOLANA_MARKET_MAKING':
                    await showMarketMakerDashboard(interaction);
                    break;
                
                case 'select_mm_token':
                    await handleMarketMakerTokenSelection(interaction);
                    break;
                    
                case 'mm_settings':
                    await handleMarketMakerSettings(interaction);
                    break;
                    
                case 'mm_enter_token_address':
                    await handleMarketMakerTokenAddressInput(interaction);
                    break;
                    
                case 'back_to_mm_dashboard':
                    await handleBackToMarketMaker(interaction);
                    break;
                    
                case 'set_mm_spread':
                    await showSpreadSettingsModal(interaction);
                    break;
                    
                case 'set_mm_range':
                    await handleRangeSettingsModal(interaction);
                    break;
                    
                case 'start_market_making':
                    await handleStartMarketMaking(interaction);
                    break;
                    
                case 'stop_market_making':
                    await handleStopMarketMaking(interaction);
                    break;
                    
                case 'view_mm_stats':
                    await handleViewMarketMakingStats(interaction);
                    break;
                
                // Handle popular token selections for market making
                // These buttons have a prefix of mm_popular_token_
                case interaction.customId.startsWith('mm_popular_token_') ? interaction.customId : '':
                    await handleMarketMakerPopularTokenSelect(interaction);
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
            switch (interaction.customId) {
                // ... existing modal cases ...
                
                case 'mm_token_address_modal':
                    await handleMarketMakerTokenAddressSubmit(interaction);
                    break;
                    
                case 'mm_spread_modal':
                    await handleSpreadSettingsSubmit(interaction);
                    break;
                    
                case 'mm_range_modal':
                    await handleRangeSettingsSubmit(interaction);
                    break;
                    
                // ... more modal cases ...
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
