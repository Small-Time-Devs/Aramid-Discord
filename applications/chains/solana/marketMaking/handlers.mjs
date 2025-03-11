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
    showMarketMakingSettingsForToken
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
        }
        
        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            switch (interaction.customId) {
                case 'mm_token_address_modal':
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
                    await handleAllSettingsSubmit(interaction);
                    return true;
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
