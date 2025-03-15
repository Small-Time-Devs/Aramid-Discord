import { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} from 'discord.js';
import { state } from './marketMakerMain.mjs';
import { showMarketMakerDashboard } from './ui/dashboard.mjs';
import { 
    handleTokenSelection,
    handlePopularTokenSelect,
    handleTokenAddressInput,
    handleTokenAddressSubmit,
    handlePreviousTokenSelect,
    handleUserTokenSelect
} from './actions/tokenSelection.mjs';

import { 
    handleMarketMakerSettings,
    showSpreadSettingsModal,
    handleSpreadSettingsSubmit,
    handleRangeSettingsModal,
    handleRangeSettingsSubmit,
    handleToggleAutoAdjust,
    handleSaveMarketMakingConfig,
    showSlippageModal,
    handleSlippageSubmit,
    showWalletsModal,
    handleWalletsSubmit,
    showMinTradesModal,
    handleMinTradesSubmit,
    showMaxTradesModal,
    handleMaxTradesSubmit
} from './actions/settingsConfig.mjs';

import {
    handleStartMarketMaking,
    handleStopMarketMaking,
    handleViewMarketMakingStats,
    handleBackToMarketMaker
} from './actions/marketMakingControl.mjs';

import {
    showAllSettingsModal,
    handleAllSettingsSubmit,
    handleSaveSettings,
    showMarketMakingSettingsForToken,
    handleSellTypeSelection,
    handleStaticSellSubmit,
    handleRangeSellSubmit,
    handleBuyTypeSelection,
    handleStaticBuySubmit,
    handleRangeBuySubmit
} from './ui/settingsMenu.mjs';

/**
 * Handle market making related interactions
 */
export async function handleMarketMakingInteractions(interaction) {
    try {
        console.log(`[MM] Processing interaction: ${interaction.customId}`);

        // Handle button clicks
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'select_mm_token':
                    await handleTokenSelection(interaction);
                    return true;
                    
                case 'mm_settings':
                    await handleMarketMakerSettings(interaction);
                    return true;
                    
                case 'mm_enter_token_address':
                    const { handleTokenAddressInput } = await import('./actions/tokenSelection.mjs');
                    await handleTokenAddressInput(interaction);
                    return true;
                    
                case 'back_to_mm_dashboard':
                    await handleBackToMarketMaker(interaction);
                    return true;
                    
                case 'start_market_making':
                    await handleStartMarketMaking(interaction);
                    return true;
                    
                case 'stop_market_making':
                    await handleStopMarketMaking(interaction);
                    return true;
                    
                case 'view_mm_stats':
                    await handleViewMarketMakingStats(interaction);
                    return true;
                    
                case 'set_mm_spread':
                    await showSpreadSettingsModal(interaction);
                    return true;
                    
                case 'set_mm_range':
                    await handleRangeSettingsModal(interaction);
                    return true;
                    
                case 'toggle_auto_adjust':
                    await handleToggleAutoAdjust(interaction);
                    return true;
                    
                case 'save_mm_config':
                    await handleSaveMarketMakingConfig(interaction);
                    return true;
                    
                case 'mm_save_settings':
                    await handleSaveSettings(interaction);
                    return true;
                    
                case 'mm_set_all_settings':
                    await showAllSettingsModal(interaction);
                    return true;
                    
                case 'mm_set_slippage':
                    await showSlippageModal(interaction);
                    return true;
                    
                case 'mm_set_wallets':
                    await showWalletsModal(interaction);
                    return true;
                    
                case 'mm_set_min_trades':
                    await showMinTradesModal(interaction);
                    return true;
                    
                case 'mm_set_max_trades':
                    await showMaxTradesModal(interaction);
                    return true;
            }
            
            // Handle token buttons
            if (interaction.customId.startsWith('mm_popular_token_')) {
                await handlePopularTokenSelect(interaction);
                return true;
            }
            
            if (interaction.customId.startsWith('mm_prev_token_')) {
                await handlePreviousTokenSelect(interaction);
                return true;
            }
            
            if (interaction.customId.startsWith('mm_token_')) {
                await handleUserTokenSelect(interaction);
                return true;
            }
            
            // Add these new cases for the updated settings flow
            if (interaction.customId === 'mm_sell_type_static' || 
                interaction.customId === 'mm_sell_type_range') {
                await handleSellTypeSelection(interaction);
                return true;
            }
            
            if (interaction.customId === 'mm_buy_type_static' || 
                interaction.customId === 'mm_buy_type_range') {
                await handleBuyTypeSelection(interaction);
                return true;
            }

            // Add new handlers for showing modals on button click
            if (interaction.customId === 'show_static_sell_modal') {
                try {
                    const userId = interaction.user.id;
                    const config = state.marketMakerConfig[userId];
                    
                    const modal = new ModalBuilder()
                        .setCustomId('mm_static_sell_modal')
                        .setTitle('Static Sell Percentage');
                        
                    const sellPercentInput = new TextInputBuilder()
                        .setCustomId('static_sell_percent')
                        .setLabel('Sell Percentage (1-100)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('100')
                        .setValue(config.staticSellPercentage?.toString() || '100')
                        .setRequired(true);
                        
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(sellPercentInput)
                    );
                    
                    await interaction.showModal(modal);
                    return true;
                } catch (error) {
                    console.error('Error showing static sell modal:', error);
                    await interaction.reply({
                        content: `❌ Error: ${error.message}`,
                        ephemeral: true
                    });
                    return true;
                }
            }
            
            if (interaction.customId === 'show_range_sell_modal') {
                try {
                    const userId = interaction.user.id;
                    const config = state.marketMakerConfig[userId];
                    
                    const modal = new ModalBuilder()
                        .setCustomId('mm_range_sell_modal')
                        .setTitle('Range Sell Percentage');
                        
                    const minSellInput = new TextInputBuilder()
                        .setCustomId('min_sell_percent')
                        .setLabel('Minimum Sell Percentage (1-100)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('50')
                        .setValue(config.rangeMinSellPercentage?.toString() || '50')
                        .setRequired(true);
                        
                    const maxSellInput = new TextInputBuilder()
                        .setCustomId('max_sell_percent')
                        .setLabel('Maximum Sell Percentage (1-100)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('100')
                        .setValue(config.rangeMaxSellPercentage?.toString() || '100')
                        .setRequired(true);
                        
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(minSellInput),
                        new ActionRowBuilder().addComponents(maxSellInput)
                    );
                    
                    await interaction.showModal(modal);
                    return true;
                } catch (error) {
                    console.error('Error showing range sell modal:', error);
                    await interaction.reply({
                        content: `❌ Error: ${error.message}`,
                        ephemeral: true
                    });
                    return true;
                }
            }
            
            if (interaction.customId === 'show_static_buy_modal') {
                try {
                    const userId = interaction.user.id;
                    const config = state.marketMakerConfig[userId];
                    
                    const modal = new ModalBuilder()
                        .setCustomId('mm_static_buy_modal')
                        .setTitle('Static Purchase Amount');
                        
                    const buyAmountInput = new TextInputBuilder()
                        .setCustomId('static_purchase_amount')
                        .setLabel('Purchase Amount (SOL)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0.1')
                        .setValue(config.staticPurchaseAmount?.toString() || '0.1')
                        .setRequired(true);
                        
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(buyAmountInput)
                    );
                    
                    await interaction.showModal(modal);
                    return true;
                } catch (error) {
                    console.error('Error showing static buy modal:', error);
                    await interaction.reply({
                        content: `❌ Error: ${error.message}`,
                        ephemeral: true
                    });
                    return true;
                }
            }
            
            if (interaction.customId === 'show_range_buy_modal') {
                try {
                    const userId = interaction.user.id;
                    const config = state.marketMakerConfig[userId];
                    
                    const modal = new ModalBuilder()
                        .setCustomId('mm_range_buy_modal')
                        .setTitle('Range Purchase Amount');
                        
                    const minBuyInput = new TextInputBuilder()
                        .setCustomId('min_purchase_amount')
                        .setLabel('Minimum Purchase Amount (SOL)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0.1')
                        .setValue(config.rangeMinPurchaseAmount?.toString() || '0.1')
                        .setRequired(true);
                        
                    const maxBuyInput = new TextInputBuilder()
                        .setCustomId('max_purchase_amount')
                        .setLabel('Maximum Purchase Amount (SOL)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0.5')
                        .setValue(config.rangeMaxPurchaseAmount?.toString() || '0.5')
                        .setRequired(true);
                        
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(minBuyInput),
                        new ActionRowBuilder().addComponents(maxBuyInput)
                    );
                    
                    await interaction.showModal(modal);
                    return true;
                } catch (error) {
                    console.error('Error showing range buy modal:', error);
                    await interaction.reply({
                        content: `❌ Error: ${error.message}`,
                        ephemeral: true
                    });
                    return true;
                }
            }

            if (interaction.customId === 'show_buy_type_modal') {
                try {
                    const userId = interaction.user.id;
                    const config = state.marketMakerConfig[userId];
                    
                    const modal = new ModalBuilder()
                        .setCustomId('mm_buy_type_modal')
                        .setTitle('Buy Type Settings');
                        
                    const buyTypeInput = new TextInputBuilder()
                        .setCustomId('mm_buy_type')
                        .setLabel('Buy Type (Static or Range only)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Range')
                        .setValue(config.tradeInvestmentType || 'Range')
                        .setRequired(true);
                        
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(buyTypeInput)
                    );
                    
                    await interaction.showModal(modal);
                    return true;
                } catch (error) {
                    console.error('Error showing buy type modal:', error);
                    await interaction.reply({
                        content: `❌ Error: ${error.message}`,
                        ephemeral: true
                    });
                    return true;
                }
            }
        }
        
        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            console.log(`[MM] Processing modal submission: ${interaction.customId}`);
            
            switch (interaction.customId) {
                case 'mm_token_address_modal':
                    const { handleTokenAddressSubmit } = await import('./actions/tokenSelection.mjs');
                    await handleTokenAddressSubmit(interaction);
                    return true;
                    
                case 'mm_spread_modal':
                    await handleSpreadSettingsSubmit(interaction);
                    return true;
                    
                case 'mm_range_modal':
                    await handleRangeSettingsSubmit(interaction);
                    return true;
                    
                case 'mm_slippage_modal':
                    await handleSlippageSubmit(interaction);
                    return true;
                    
                case 'mm_wallets_modal':
                    await handleWalletsSubmit(interaction);
                    return true;
                    
                case 'mm_min_trades_modal':
                    await handleMinTradesSubmit(interaction);
                    return true;
                    
                case 'mm_max_trades_modal':
                    await handleMaxTradesSubmit(interaction);
                    return true;
                    
                case 'mm_all_settings_modal':
                    console.log('[MM] Handling all settings modal submit');
                    await handleAllSettingsSubmit(interaction);
                    return true;
                    
                // Add these new cases for the updated settings flow
                case 'mm_static_sell_modal':
                    await handleStaticSellSubmit(interaction);
                    return true;
                    
                case 'mm_range_sell_modal':
                    await handleRangeSellSubmit(interaction);
                    return true;
                    
                case 'mm_static_buy_modal':
                    await handleStaticBuySubmit(interaction);
                    return true;
                    
                case 'mm_range_buy_modal':
                    await handleRangeBuySubmit(interaction);
                    return true;

                case 'mm_buy_type_modal':
                    await handleBuyTypeModalSubmit(interaction);
                    return true;
                    
                default:
                    console.log(`[MM] Unhandled modal submission: ${interaction.customId}`);
                    break;
            }
        }
        
        return false; // Not handled by this handler
    } catch (error) {
        console.error('Error handling market making interaction:', error);
        // Attempt to reply with the error
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Error processing market making request: ${error.message}`,
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: `❌ Error processing market making request: ${error.message}`,
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Error sending error response:', replyError);
        }
        return true; // We handled it (with an error)
    }
}

/**
 * Handle Buy Type modal submission
 */
export async function handleBuyTypeModalSubmit(interaction) {
    try {
        const userId = interaction.user.id;
        await interaction.deferReply({ ephemeral: true });
        
        const buyType = interaction.fields.getTextInputValue('mm_buy_type').trim();
        
        // Validate buy type
        const validBuyType = buyType.toLowerCase() === 'static' ? 'Static' : 
                          buyType.toLowerCase() === 'range' ? 'Range' : null;
        if (!validBuyType) {
            await interaction.editReply({
                content: '❌ Buy Type must be either "Static" or "Range"'
            });
            return;
        }
        
        // Update config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        state.marketMakerConfig[userId].tradeInvestmentType = validBuyType;
        
        // Set default values based on type
        if (validBuyType === 'Static' && !state.marketMakerConfig[userId].staticPurchaseAmount) {
            state.marketMakerConfig[userId].staticPurchaseAmount = 0.1;
        }
        
        if (validBuyType === 'Range') {
            if (!state.marketMakerConfig[userId].rangeMinPurchaseAmount) {
                state.marketMakerConfig[userId].rangeMinPurchaseAmount = 0.1;
            }
            if (!state.marketMakerConfig[userId].rangeMaxPurchaseAmount) {
                state.marketMakerConfig[userId].rangeMaxPurchaseAmount = 0.5;
            }
        }
        
        // Show the appropriate next step based on buy type and sell type
        const sellType = state.marketMakerConfig[userId].sellPercentageType;
        
        if (sellType === 'Static') {
            // Import and call the showStaticSellModal function
            const { showStaticSellModal } = await import('./ui/settingsMenu.mjs');
            await showStaticSellModal(interaction);
        } else {
            // Import and call the showRangeSellModal function
            const { showRangeSellModal } = await import('./ui/settingsMenu.mjs');
            await showRangeSellModal(interaction);
        }
        
    } catch (error) {
        console.error('Error handling buy type modal submission:', error);
        await interaction.editReply({
            content: `❌ Error: ${error.message}. Please try again.`
        });
    }
}
