import axios from 'axios';
import { fetchSolBalance, fetchTokenBalances, fetchTokenMap } from '../helpers/solana.mjs';

// Token map caching
let tokenMap = new Map();

// Fetch and maintain token map
export const getTokenMap = async () => {
    if (tokenMap.size > 0) return tokenMap;
    tokenMap = await fetchTokenMap();
    return tokenMap;
};

export const fetchCoinGeckoDefiData = async () => {
    const url = 'https://pro-api.coingecko.com/api/v3/global/decentralized_finance_defi';
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'x-cg-pro-api-key': process.env.COIN_GECKO_API_KEY
        }
    };

    try {
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        console.error('Error fetching CoinGecko DeFi data:', error);
        throw error;
    }
};

export const fetchWalletDetails = async (userId) => {
    try {
        const solBalance = await fetchSolBalance(userId);
        const tokenBalances = await fetchTokenBalances(userId);
        return {
            solBalance,
            tokenBalances,
            formattedTokens: tokenBalances.length > 0 ? 
                tokenBalances.map(token => ({
                    mint: token.mint,
                    amount: token.amount.toFixed(token.decimals)
                })) : []
        };
    } catch (error) {
        console.error('Error fetching wallet details:', error);
        throw error;
    }
};

export const formatWalletDetailsData = (solPublicKey, solBalance, xrpPublicKey, xrpBalance = 0) => {
    return {
        solana: {
            publicKey: solPublicKey,
            balance: solBalance.toFixed(2)
        },
        xrp: {
            publicKey: xrpPublicKey,
            balance: xrpBalance.toFixed(2)
        }
    };
};

export const formatWalletFields = (walletDetails) => {
    const fields = [
        {
            name: 'SOL Balance',
            value: `${walletDetails.solBalance.toFixed(2)} SOL`,
            inline: true
        }
    ];

    if (walletDetails.tokenBalances.length > 0) {
        const tokenList = walletDetails.tokenBalances.map(token => 
            `${token.mint}: ${token.amount.toFixed(token.decimals)}`
        ).join('\n');
        
        fields.push({
            name: 'Token Balances',
            value: tokenList,
            inline: true
        });
    } else {
        fields.push({
            name: 'Token Balances',
            value: 'None',
            inline: true
        });
    }

    return fields;
};
