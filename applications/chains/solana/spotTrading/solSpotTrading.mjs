// Main entry point that re-exports functionality from modular files

import { showSolanaSpotTradingMenu } from './ui/dashboard.mjs';
import { 
    handleTradeSettings,
    showQuickBuyModal,
    showQuickSellModal,
    handleQuickBuySubmission,
    handleQuickSellSubmission,
    handleBackToSpotTrading
} from './actions/settingsConfig.mjs';

import {
    handleTokenAddressInput,
    handleTokenAddressSubmit,
    handleTokenSelection,
    handleBuyNewToken,
    handleEnterTokenAddress,
    handlePopularTokenSelect
} from './actions/tokenSelection.mjs';

import {
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
} from './actions/purchaseConfig.mjs';

// Import the token selling handlers from the correct file
import {
    handleSellToken,
    handleTokenSellSelection,
    handleSetSellPercentage,
    handleSellPercentageSubmit,
    handleQuickSellSelection,
    handleExecuteSell
} from './actions/tokenSelling.mjs';

// Re-export everything for backward compatibility
export {
    showSolanaSpotTradingMenu,  // Re-export from dashboard.mjs
    handleTradeSettings,
    showQuickBuyModal,
    showQuickSellModal,
    handleQuickBuySubmission,
    handleQuickSellSubmission,
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
    handleBackToSpotTrading,
    handleQuickBuySelection,
    handleSellToken,
    handleTokenSellSelection,
    handleSetSellPercentage,
    handleSellPercentageSubmit,
    handleQuickSellSelection,
    handleExecuteSell
};

// Export shared state that needs to be accessible across files
export const state = {
    solanaBuyTokenConfig: {},
    solanaSellTokenConfig: {},
    tokenBalancesCache: {}
};
