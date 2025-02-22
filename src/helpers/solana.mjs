import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const HELIUS_RPC = process.env.HELIUS_RPC;
const TOKEN_MAP_URL = 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json';
let tokenMap = new Map();

if (!HELIUS_RPC) {
    throw new Error('HELIUS_RPC is not defined in the .env file.');
}

export async function fetchTokenMap() {
    if (tokenMap.size > 0) return tokenMap;

    try {
        const response = await axios.get(TOKEN_MAP_URL);
        const tokens = response.data.tokens;
        tokens.forEach((token) => {
            tokenMap.set(token.address, token.symbol);
        });
        console.log('Token map loaded successfully.');
    } catch (error) {
        console.error('Error loading token map:', error.message);
    }
    return tokenMap;
}

export async function fetchSolBalance(walletAddress) {
    // Implement your Solana balance fetching logic here
    // Using Helius RPC
    return 0.0; // Placeholder
}

export async function fetchTokenBalances(walletAddress) {
    // Implement your token balance fetching logic here
    // Using Helius RPC
    return []; // Placeholder
}
