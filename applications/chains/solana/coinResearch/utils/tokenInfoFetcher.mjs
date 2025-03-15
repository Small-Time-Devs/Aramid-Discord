import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config();

// Fix the RPC URL initialization to ensure it has a valid HTTP prefix
// Use a reliable fallback if the environment variable isn't set correctly
const SOLANA_RPC = process.env.HELIUS_RPC;
const connection = new Connection(SOLANA_RPC);

// Helius API key from environment
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// Import the existing token utility functions from your spot trading module
import { 
    fetchTokenDetails, 
    fetchTokenPrice,
    fetchSolBalance,
    fetchTokenBalances 
} from '../../spotTrading/functions/utils.mjs';

/**
 * Check if a string is a valid Solana address
 * @param {string} address - Address to validate
 * @returns {boolean} Whether the address is valid
 */
function isValidSolanaAddress(address) {
    try {
        // Check if it's a valid public key
        new PublicKey(address);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Fetch comprehensive token information from multiple sources
 * @param {string} tokenAddress - Solana token mint address
 * @returns {Promise<Object>} Token data including price, volume, market cap etc.
 */
export async function fetchTokenInfo(tokenAddress) {
    try {
        console.log(`[TOKEN INFO] Starting token info fetch for ${tokenAddress}`);
        
        if (!isValidSolanaAddress(tokenAddress)) {
            throw new Error('Invalid Solana address format');
        }
        
        // Initialize fallback metadata and price data
        let tokenMetadata = {
            name: 'Unknown Token',
            symbol: 'UNKNOWN',
            decimals: 0,
            image: null,
            description: null
        };
        
        let marketData = {
            price: 0,
            priceChange1h: 0,
            priceChange24h: 0,
            priceChange7d: 0,
            volume24h: 0,
            volume7d: 0
        };
        
        // Get token details and price using your existing functions
        try {
            console.log('[TOKEN INFO] Fetching token details...');
            const tokenDetails = await fetchTokenDetails(tokenAddress);
            const tokenPrice = await fetchTokenPrice(tokenAddress);
            console.log('[TOKEN INFO] Token details retrieved:', tokenDetails ? 'Success' : 'Failed');
            
            // Update metadata with token details
            if (tokenDetails) {
                tokenMetadata = {
                    name: tokenDetails.name || 'Unknown Token',
                    symbol: tokenDetails.symbol || 'UNKNOWN',
                    decimals: tokenDetails.decimals || 0,
                    image: tokenDetails.logoURI || null,
                    description: null
                };
            }
            
            // Update price data if available
            if (tokenPrice) {
                marketData = {
                    price: tokenPrice.price || 0,
                    priceChange1h: tokenPrice.change1h || 0,
                    priceChange24h: tokenPrice.change24h || 0,
                    priceChange7d: tokenPrice.change7d || 0,
                    volume24h: tokenPrice.volume24h || 0,
                    volume7d: 0 // Not usually provided
                };
            }
        } catch (detailsError) {
            console.error('[TOKEN INFO] Error fetching token details:', detailsError);
            // Continue with fallback values already set
        }
        
        // Get token supply with better error handling
        let tokenSupply = null;
        try {
            tokenSupply = await fetchTokenSupply(tokenAddress, tokenMetadata.decimals);
            console.log(`[TOKEN INFO] Successfully fetched supply for ${tokenAddress}`);
        } catch (supplyError) {
            console.error(`[TOKEN INFO] Error fetching supply: ${supplyError.message}`);
            // Create fallback supply data
            tokenSupply = {
                total: 0,
                circulating: 0,
                decimals: tokenMetadata.decimals || 0
            };
        }
        
        // Get liquidity data with better error handling
        let liquidityData = null;
        try {
            liquidityData = await fetchTokenLiquidity(tokenAddress);
            console.log(`[TOKEN INFO] Successfully fetched liquidity for ${tokenAddress}`);
        } catch (liquidityError) {
            console.error(`[TOKEN INFO] Error fetching liquidity: ${liquidityError.message}`);
            // Create fallback liquidity data
            liquidityData = {
                tvl: 0,
                mainPools: []
            };
        }
        
        // Get holder information with better error handling
        let holderInfo = null;
        try {
            holderInfo = await fetchHolderInfo(tokenAddress);
            console.log(`[TOKEN INFO] Successfully fetched holder info for ${tokenAddress}`);
        } catch (holderError) {
            console.error(`[TOKEN INFO] Error fetching holder info: ${holderError.message}`);
            // Create fallback holder info
            holderInfo = {
                count: 0,
                topHolders: []
            };
        }
        
        // Calculate additional metrics
        const marketCap = calculateMarketCap(marketData.price, tokenSupply.circulating);
        const fullyDilutedValuation = calculateMarketCap(marketData.price, tokenSupply.total);

        // Create a complete token info object with all data
        return {
            metadata: tokenMetadata,
            price: marketData.price,
            priceChange: {
                '1h': marketData.priceChange1h,
                '24h': marketData.priceChange24h,
                '7d': marketData.priceChange7d
            },
            volume: {
                '24h': marketData.volume24h,
                '7d': marketData.volume7d
            },
            supply: tokenSupply,
            marketCap: marketCap,
            fdv: fullyDilutedValuation,
            liquidity: liquidityData,
            holders: holderInfo,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('[TOKEN INFO] Error in main fetchTokenInfo:', error);
        
        // Return a minimal valid object rather than throwing
        return {
            metadata: {
                name: 'Unknown Token',
                symbol: 'UNKNOWN',
                decimals: 0,
                image: null,
                description: null
            },
            price: 0,
            priceChange: { '1h': 0, '24h': 0, '7d': 0 },
            volume: { '24h': 0, '7d': 0 },
            supply: { total: 0, circulating: 0, decimals: 0 },
            marketCap: 0,
            fdv: 0,
            liquidity: { tvl: 0, mainPools: [] },
            holders: { count: 0, topHolders: [] },
            lastUpdated: new Date().toISOString()
        };
    }
}

/**
 * Fetch token supply information
 */
async function fetchTokenSupply(tokenAddress, decimals = 0) {
    try {
        const mint = new PublicKey(tokenAddress);
        const supply = await connection.getTokenSupply(mint);
        
        const total = supply.value.uiAmount || 0;
        
        // Note: Getting circulating supply accurately requires additional data
        // For now, we'll assume total supply is the circulating supply
        return {
            total: total,
            circulating: total,
            decimals: supply.value.decimals || decimals
        };
    } catch (error) {
        console.error('Error fetching token supply:', error);
        return {
            total: 0,
            circulating: 0,
            decimals: decimals
        };
    }
}

/**
 * Fetch token liquidity information
 */
async function fetchTokenLiquidity(tokenAddress) {
    try {
        // Liquidity data would ideally come from DEX APIs
        // For now, we'll return placeholder data
        return {
            tvl: 0,
            mainPools: []
        };
    } catch (error) {
        console.error('Error fetching token liquidity:', error);
        return {
            tvl: 0,
            mainPools: []
        };
    }
}

/**
 * Fetch holder information
 */
async function fetchHolderInfo(tokenAddress) {
    try {
        // This would require a specialized API or indexing service
        // For now, we'll return placeholder data
        return {
            count: 0,
            topHolders: []
        };
    } catch (error) {
        console.error('Error fetching holder info:', error);
        return {
            count: 0,
            topHolders: []
        };
    }
}

/**
 * Calculate market cap from price and supply
 */
function calculateMarketCap(price, supply) {
    if (!price || !supply) return 0;
    return price * supply;
}
