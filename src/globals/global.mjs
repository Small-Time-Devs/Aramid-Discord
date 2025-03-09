import dotenv from 'dotenv';
dotenv.config();

// Channel IDs for Discord
export const CHANNEL_IDS = {
    WELCOME: process.env.WELCOME_CHANNEL_ID,
    GENERAL: process.env.GENERAL_CHANNEL_ID,
    ADMIN: process.env.ADMIN_CHANNEL_ID
};

// Global static configuration
export const globalStaticConfig = {
    // Main RPC Node
    rpcNode: process.env.HELIUS_RPC,
    rpcNodeXrp: `https://orbital-special-field.xrp-mainnet.quiknode.pro/${process.env.XRP_QUICKNODE_RPC_KEY}`,
    rpcNodeXrpWss: `wss://orbital-special-field.xrp-testnet.quiknode.pro/${process.env.XRP_QUICKNODE_RPC_KEY}`,
    quickNodeRPC2: process.env.QUICKNODE_RPC2,
    solMint: "So11111111111111111111111111111111111111112",
    xrpMint: "rXRP",
    confirmationRetries: 3,
    
    // Fee configuration
    enablePlatformFee: true,  // Set to false to disable platform fees
    platformPublicKey: process.env.PLATFORM_PUBLIC_KEY || "8doV3bDFAxE6ENAAckbQYaVwNZwmdpkk5BmP7SHsmijQ", // Default to USDC mint if not set
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || "0.1"), // 0.5% default
    
    enableReferralFee: true,  // Set to false to disable referral fees
    defaultReferralPublicKey: process.env.DEFAULT_REFERRAL_KEY || "", // Default referral key if user doesn't have one
    referralFeePercentage: parseFloat(process.env.REFERRAL_FEE_PERCENTAGE || "0.2"), // 0.2% default
};

export const globalURLS = {
    smallTimeDevsJupiterBuy: 'https://api.smalltimedevs.com/solana/raydium-api/jupiterBuy',
    smallTimeDevsJupiterSell: 'https://api.smalltimedevs.com/solana/raydium-api/jupiterSell',
    smallTimeDevsTradeAPI: 'https://api.smalltimedevs.com/solana',
    smallTimeDevsXrpAPI: 'https://api.smalltimedevs.com/xrp/dex-api',
    raydiumMintAPI: 'https://api-v3.raydium.io/pools/info/mint/',
};

export const isValidChannel = (channelId) => {
    return Object.values(CHANNEL_IDS).includes(channelId);
};

// Development feature flags - control which features are in development mode
export const developmentFlags = {
    chains: {
        xrpChain: true,
        solChain: false
    },

    applications: {
        spotTrading: false,
        marketMaker: true
    },
};

export const globalDevModeWhiteList = [
    //'202145535086297088'
];

// Helper function to check if a user is whitelisted for dev features
export const isWhitelistedForDevFeatures = (userId) => {
    return globalDevModeWhiteList.includes(userId);
};

// Helper function to check if a feature is available for a specific user
export const isFeatureAvailable = (featureCategory, featureName, userId) => {
    // Allow access if:
    // 1. Feature is not in development mode OR
    // 2. User is in the whitelist
    
    // First check if the user is whitelisted
    if (isWhitelistedForDevFeatures(userId)) {
        return true;
    }
    
    // Then check if feature is in development
    // Handle nested structure correctly
    const isDevMode = developmentFlags[featureCategory]?.[featureName] === true;
    
    return !isDevMode;
};

export const devFeatureMessage = (featureName) => `🚧 ${featureName} is currently under development. Please check back later! 🚧`;

// Add this function to the exports
export const logFeatureStatus = (userId) => {
    console.log('[FEATURE STATUS DEBUG]', {
        userId,
        isWhitelisted: isWhitelistedForDevFeatures(userId),
        developmentFlags,
        xrpChainInDev: developmentFlags.chains?.xrpChain === true,
        solChainInDev: developmentFlags.chains?.solChain === true,
        spotTradingInDev: developmentFlags.applications?.spotTrading === true,
        marketMakerInDev: developmentFlags.applications?.marketMaker === true,
    });
};