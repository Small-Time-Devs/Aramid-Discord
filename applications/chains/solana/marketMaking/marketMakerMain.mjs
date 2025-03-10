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
    handleBackToMarketMaker
};

// Export shared state
export const state = {
    marketMakerConfig: {},
    activeSessions: {},
    tokenBalancesCache: {}
};
