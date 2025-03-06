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
    handleBackToBuyOptions
} from './actions/purchaseConfig.mjs';

// Re-export everything for backward compatibility
export {
    showSolanaSpotTradingMenu,
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
    handleBackToSpotTrading
};

// Export shared state that needs to be accessible across files
export const state = {
    solanaBuyTokenConfig: {},
    tokenBalancesCache: {}
};
