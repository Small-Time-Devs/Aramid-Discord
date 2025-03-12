// Only import the dashboard, don't re-export it
import { showMarketMakerDashboard } from './ui/dashboard.mjs';

// Import the action handlers
import { 
    handleMarketMakerSettings,
    showSpreadSettingsModal,
    handleSpreadSettingsSubmit,
    handleRangeSettingsModal,
    handleRangeSettingsSubmit,
    handleSaveMarketMakingConfig
} from './actions/settingsConfig.mjs';

import {
    handleTokenSelection,
    handleTokenAddressInput,
    handleTokenAddressSubmit,
    handlePopularTokenSelect,
    showTokenSelectionOptions
} from './actions/tokenSelection.mjs';

import {
    handleStartMarketMaking,
    handleStopMarketMaking,
    handleViewMarketMakingStats,
    handleBackToMarketMaker
} from './actions/marketMakingControl.mjs';

// Import the handlers from settings menu
import {
    handleSellTypeSelection,
    handleStaticSellSubmit,
    handleRangeSellSubmit,
    handleBuyTypeSelection,
    handleStaticBuySubmit,
    handleRangeBuySubmit,
    showAllSettingsModal,
    handleAllSettingsSubmit,
    handleSaveSettings
} from './ui/settingsMenu.mjs';

// Import handlers from handlers.mjs - use the correct function name
import { 
    handleMarketMakingInteractions,
    handleBuyTypeModalSubmit
} from './handlers.mjs';

// Export actions but NOT the dashboard
export {
    handleMarketMakerSettings,
    showSpreadSettingsModal,
    handleSpreadSettingsSubmit,
    handleRangeSettingsModal,
    handleRangeSettingsSubmit,
    handleSaveMarketMakingConfig,
    handleTokenSelection,
    handleTokenAddressInput,
    handleTokenAddressSubmit,
    handlePopularTokenSelect,
    showTokenSelectionOptions,
    handleStartMarketMaking,
    handleStopMarketMaking,
    handleViewMarketMakingStats,
    handleBackToMarketMaker,
    handleSellTypeSelection,
    handleStaticSellSubmit,
    handleRangeSellSubmit,
    handleBuyTypeSelection,
    handleStaticBuySubmit,
    handleRangeBuySubmit,
    showAllSettingsModal,
    handleAllSettingsSubmit,
    handleSaveSettings,
    // Also export the handlers from handlers.mjs 
    handleMarketMakingInteractions,
    handleBuyTypeModalSubmit
};

// Export shared state
export const state = {
    marketMakerConfig: {},
    activeSessions: {},
    tokenBalancesCache: {}
};
