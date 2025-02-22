import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Telegraf, Markup } from 'telegraf';

dotenv.config();
const logoPath = path.resolve('./images/botLogo.png');
const HELIUS_RPC = process.env.HELIUS_RPC;

const TOKEN_MAP_URL = 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json';
let tokenMap = new Map();

if (!HELIUS_RPC) {
  throw new Error('HELIUS_RPC is not defined in the .env file.');
}

/**
 * Fetches the SOL balance of a wallet using Helius RPC.
 * @param {string} publicKey - The public key of the wallet.
 * @returns {Promise<number>} - The confirmed SOL balance.
 */
export async function fetchSolBalance(publicKey) {
    try {
      const url = `${HELIUS_RPC}`;
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [publicKey],
      };
  
      const response = await axios.post(url, payload);
  
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
  
      const balance = response.data.result?.value || 0;
      //console.log(`Fetched SOL balance for wallet ${publicKey}: ${balance} lamports`);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error(`Error fetching SOL balance for ${publicKey}:`, error);
      return 0; // Return 0 SOL if there's an error
    }
}

// Fetch and cache the token map
async function fetchTokenMap() {
  if (tokenMap.size > 0) return tokenMap;

  try {
    const response = await axios.get(TOKEN_MAP_URL);
    const tokens = response.data.tokens;
    tokens.forEach((token) => {
      tokenMap.set(token.address, token.symbol); // Map mint address to token symbol
    });
    console.log('Token map loaded successfully.');
  } catch (error) {
    console.error('Error loading token map:', error.message);
  }
  return tokenMap;
}

/**
 * Fetch token balances from Helius RPC and map token names.
 * @param {string} publicKey - Wallet public key in Base58 format.
 * @returns {Promise<Array>} - Token balances with symbol and amount.
 */
export async function fetchTokenBalances(publicKey) {
  try {
    const url = `${process.env.HELIUS_RPC}`;
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        publicKey,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' },
      ],
    };

    const response = await axios.post(url, payload);

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    const tokenAccounts = response.data.result?.value || [];
    const tokensWithMintAddresses = tokenAccounts.map((account) => {
      const mint = account.account.data.parsed.info.mint;
      const rawAmount = account.account.data.parsed.info.tokenAmount.amount;
      const decimals = account.account.data.parsed.info.tokenAmount.decimals;
      const amount = parseFloat(rawAmount) / Math.pow(10, decimals);

      return {
        mint,
        amount,
        decimals,
      };
    });

    // Fetch token names using the Raydium API
    const mintAddresses = tokensWithMintAddresses.map((token) => token.mint).join(',');
    const raydiumApiResponse = await axios.get(`https://api-v3.raydium.io/mint/ids?mints=${mintAddresses}`);
    const raydiumTokenData = raydiumApiResponse.data.data;

    // Map token names to balances
    const tokenBalances = tokensWithMintAddresses.map((token) => {
      const raydiumToken = raydiumTokenData.find((item) => item.address === token.mint);
      return {
        name: raydiumToken?.symbol || token.mint, // Use the symbol from Raydium if available; otherwise, fallback to mint address
        amount: token.amount,
        decimals: token.decimals,
        mint: token.mint,
      };
    });

    console.log(`Fetched token balances for wallet ${publicKey}:`, tokenBalances);
    return tokenBalances;
  } catch (error) {
    console.error(`Error fetching token balances for ${publicKey}:`, error.message);
    return [];
  }
}

/**
 * Fetches wallet details including SOL balance and token balances.
 * @param {string} publicKey - The public key of the wallet.
 * @returns {Promise<string>} - Formatted wallet details.
 */
export async function fetchWalletDetails(publicKey) {
  try {
    const solBalance = await fetchSolBalance(publicKey);
    const tokenBalances = await fetchTokenBalances(publicKey);

    let details = `💰 SOL Balance: ${solBalance.toFixed(2)} SOL\n`;

    if (tokenBalances.length > 0) {
      details += '📦 Token Balances:\n';
      tokenBalances.forEach((token) => {
        details += `  - 🪙 Mint: ${token.mint}\n    Amount: ${token.amount.toFixed(token.decimals)}\n`;
      });
    } else {
      details += '📦 Token Balances: None\n';
    }

    return details;
  } catch (error) {
    console.error('Error fetching wallet details:', error);
    return 'Error fetching wallet details. Please try again.';
  }
}


/**
 * Formats wallet details for display.
 * @param {string} publicKey - The public key of the wallet.
 * @param {number} balance - The balance of the wallet in SOL.
 * @returns {string} - Formatted wallet details.
 */
export function formatWalletDetails(publicKey, balance) {
    return `*Wallet Details:*\n\n` +
           `- 🌐 Public Key: [${publicKey}](https://solscan.io/account/${publicKey})\n` +
           `- 💰 Balance: *${balance.toFixed(2)} SOL*\n`; // Ensure `balance` is a number
}

/**
 * Formats wallet details for display.
 * @param {string} publicKey - The public key of the wallet.
 * @returns {string} - Formatted wallet details.
 */
export function formatWalletDetailsNoBlance(publicKey) {
    return `*Wallet Details:*\n\n` +
           `- 🌐 Public Key: [${publicKey}](https://solscan.io/account/${publicKey})\n`
}

export async function sendMessageWithLogo(ctx, message, buttons = []) {
    if (fs.existsSync(logoPath)) {
        const sentMessage = await ctx.replyWithPhoto(
            { source: logoPath },
            {
                caption: message,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons),
            }
        );
        return sentMessage; // Return the sent message object
    } else {
        // Fallback if the logo is missing
        const sentMessage = await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons),
        });
        return sentMessage; // Return the sent message object
    }
}

// Store last message IDs for each chat
const lastMessageIds = new Map();

// Utility: Send a message and delete the last one
export async function sendAndDeletePrevious(ctx, message, buttons = []) {
    const chatId = ctx.chat.id;

    // Delete the last message if it exists
    if (lastMessageIds.has(chatId)) {
        const lastMessageId = lastMessageIds.get(chatId);
        try {
            await ctx.deleteMessage(lastMessageId);
        } catch (error) {
            console.error(`Error deleting message ${lastMessageId}:`, error.message);
        }
    }

    // Send the new message with the bot logo and update the last message ID
    const sentMessage = await sendMessageWithLogo(ctx, message, buttons);
    if (sentMessage?.message_id) {
        lastMessageIds.set(chatId, sentMessage.message_id);
    }
}