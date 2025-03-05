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

export const globalSettings = {
    marketMakerDevMode: true, // Set to true if the bot is in DEV mode
    xrpDevMode: true,        // Set to true if XRP features are in DEV mode
    isBeta: true,            // Set to true if the bot is in BETA mode
};

// Discord developer/admin IDs (converted from Telegram IDs)
export const globalDevModeWhiteList = [
    '202145535086297088'  // Replace with actual Discord user IDs
];

export const isValidChannel = (channelId) => {
    return Object.values(CHANNEL_IDS).includes(channelId);
};

// Export everything as a single object for convenience
export const globals = {
    CHANNEL_IDS,
    globalStaticConfig,
    globalURLS,
    globalSettings,
    globalDevModeWhiteList,
    isValidChannel
};
