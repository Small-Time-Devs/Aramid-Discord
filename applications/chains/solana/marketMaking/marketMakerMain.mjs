import { showMarketMakerDashboard } from './ui/dashboard.mjs';
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

// Export everything for backward compatibility
export {
    showMarketMakerDashboard,
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

// Export shared state that needs to be accessible across files
export const state = {
    marketMakerConfig: {},
    activeSessions: {},
    tokenBalancesCache: {}
};
