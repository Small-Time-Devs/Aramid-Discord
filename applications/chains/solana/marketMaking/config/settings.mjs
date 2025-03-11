import { state } from '../marketMakerMain.mjs';
import { saveMarketMakingConfig } from '../../../../../src/db/dynamo.mjs';

// Default market making configuration
export const defaultMarketMakingConfig = {
  outputMint: '', // Token contract address
  slippage: 0.5, // Default slippage percentage
  useGeneratedWallets: 'True', // Static
  walletGenerationType: 'Range', // Static
  numberOfWallets: 5, // Number of wallets to use
  minTrades: 1, // Minimum trades per wallet
  maxTrades: 10, // Maximum trades per wallet
  leaveDust: 'No', // Whether to leave dust
  dustAmountType: 'Static', // Static
  staticDustAmount: 0, // Amount of dust to leave
  minSolBalance: 0.05, // Min SOL balance to trigger sells
  sellPercentageType: 'Static', // Static or Range
  staticSellPercentage: 100, // Static sell percentage
  rangeMinSellPercentage: 50, // Min sell percentage for range
  rangeMaxSellPercentage: 100, // Max sell percentage for range
  retryAmount: 5, // Static
  tradeInvestmentType: 'Range', // Static or Range
  staticPurchaseAmount: 0.1, // Static purchase amount
  rangeMinPurchaseAmount: 0.1, // Min purchase amount for range
  rangeMaxPurchaseAmount: 0.5, // Max purchase amount for range
  platform: 'Raydium', // Static
  isRunning: false, // Whether market maker is running
};

/**
 * Initialize market making config for a user
 * @param {string} userId - The Discord user ID
 * @param {string} solPublicKey - The user's Solana public key
 * @returns {Object} The initialized config object
 */
export function initializeMarketMakingConfig(userId, solPublicKey) {
  // Create a copy of the default config and set the user-specific values
  const config = { 
    ...defaultMarketMakingConfig,
    userId,
    finalWalletAddress: solPublicKey
  };
  
  // Store in state
  state.marketMakerConfig[userId] = config;
  
  return config;
}

/**
 * Save the current market making configuration to the database
 * @param {string} userId - The Discord user ID
 * @returns {Promise<boolean>} Success indicator
 */
export async function saveCurrentMarketMakingConfig(userId) {
  try {
    const config = state.marketMakerConfig[userId];
    
    if (!config) {
      throw new Error("No configuration exists for this user");
    }
    
    if (!config.outputMint) {
      throw new Error("Token field is required");
    }
    
    // Save to database
    await saveMarketMakingConfig(userId, config);
    return true;
  } catch (error) {
    console.error('Error saving market making config:', error);
    throw error;
  }
}
