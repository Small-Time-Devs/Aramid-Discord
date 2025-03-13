import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';

// Use Mainnet Solana RPC endpoint - consider moving to .env
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC);

// Helius API key (as in your other code)
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 'db7ddf3b-662d-4890-969b-83f83350b749';

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
        if (!isValidSolanaAddress(tokenAddress)) {
            throw new Error('Invalid Solana address format');
        }
        
        // Get token metadata
        const tokenMetadata = await fetchTokenMetadata(tokenAddress);
        
        // Get market data 
        const marketData = await fetchTokenMarketData(tokenAddress);
        
        // Get token supply
        const tokenSupply = await fetchTokenSupply(tokenAddress);
        
        // Get liquidity data
        const liquidityData = await fetchTokenLiquidity(tokenAddress);
        
        // Get holder information
        const holderInfo = await fetchHolderInfo(tokenAddress);
        
        // Calculate additional metrics
        const marketCap = calculateMarketCap(marketData.price, tokenSupply.circulating);
        const fullyDilutedValuation = calculateMarketCap(marketData.price, tokenSupply.total);

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
        console.error('Error fetching token info:', error);
        throw new Error(`Could not fetch token information: ${error.message}`);
    }
}

/**
 * Fetch token metadata (name, symbol, decimals)
 */
async function fetchTokenMetadata(tokenAddress) {
    try {
        const response = await axios.get(`https://api.helius.xyz/v0/tokens/metadata?api-key=${HELIUS_API_KEY}`, {
            params: { 
                tokenAddresses: [tokenAddress]
            }
        });
        
        if (response.data && response.data.length > 0) {
            const metadata = response.data[0];
            return {
                name: metadata.name || 'Unknown',
                symbol: metadata.symbol || 'UNKNOWN',
                decimals: metadata.decimals || 0,
                image: metadata.image || null,
                description: metadata.description || null
            };
        }
        
        // Fallback to on-chain data if API doesn't return results
        const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
        if (tokenInfo?.value?.data?.parsed?.info) {
            const info = tokenInfo.value.data.parsed.info;
            return {
                name: info.name || 'Unknown',
                symbol: info.symbol || 'UNKNOWN',
                decimals: info.decimals || 0,
                image: null,
                description: null
            };
        }
        
        throw new Error('Token metadata not found');
    } catch (error) {
        console.error('Error fetching token metadata:', error);
        return {
            name: 'Unknown Token',
            symbol: 'UNKNOWN',
            decimals: 0,
            image: null,
            description: null
        };
    }
}

/**
 * Fetch token market data (price, volume)
 */
async function fetchTokenMarketData(tokenAddress) {
    try {
        // First try Coingecko or Jupiter API
        try {
            const response = await axios.get(`https://price.jup.ag/v4/price?ids=${tokenAddress}`);
            if (response.data?.data?.[tokenAddress]) {
                const data = response.data.data[tokenAddress];
                return {
                    price: data.price || 0,
                    priceChange1h: 0, // Jupiter doesn't provide this
                    priceChange24h: 0, // Jupiter doesn't provide this
                    priceChange7d: 0, // Jupiter doesn't provide this
                    volume24h: data.volume24h || 0,
                    volume7d: 0 // Jupiter doesn't provide this
                };
            }
        } catch (jupiterError) {
            console.error('Error fetching from Jupiter:', jupiterError);
            // Continue to fallback
        }
        
        // Fallback to Birdeye API if available
        try {
            // Note: Birdeye requires API key now, so we're using a mock response for now
            // In production, use the actual API with a proper key
            return {
                price: 0,
                priceChange1h: 0,
                priceChange24h: 0,
                priceChange7d: 0,
                volume24h: 0,
                volume7d: 0
            };
        } catch (birdeyeError) {
            console.error('Error fetching from Birdeye:', birdeyeError);
        }
        
        // Return default values as last resort
        return {
            price: 0,
            priceChange1h: 0,
            priceChange24h: 0,
            priceChange7d: 0,
            volume24h: 0,
            volume7d: 0
        };
    } catch (error) {
        console.error('Error fetching token market data:', error);
        return {
            price: 0,
            priceChange1h: 0,
            priceChange24h: 0,
            priceChange7d: 0,
            volume24h: 0,
            volume7d: 0
        };
    }
}

/**
 * Fetch token supply information
 */
async function fetchTokenSupply(tokenAddress) {
    try {
        const mint = new PublicKey(tokenAddress);
        const supply = await connection.getTokenSupply(mint);
        
        const total = supply.value.uiAmount || 0;
        
        // Note: Getting circulating supply accurately requires additional data
        // For now, we'll assume total supply is the circulating supply
        return {
            total: total,
            circulating: total,
            decimals: supply.value.decimals
        };
    } catch (error) {
        console.error('Error fetching token supply:', error);
        return {
            total: 0,
            circulating: 0,
            decimals: 0
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
