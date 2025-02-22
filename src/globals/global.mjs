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
};

export const globalURLS = {
    // Main RPC Node
    smallTimeDevsRaydiumTradeAPI: 'https://api.smalltimedevs.com/solana/raydium-api',
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
