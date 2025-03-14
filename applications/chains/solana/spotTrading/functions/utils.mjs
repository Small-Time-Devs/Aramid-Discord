import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bs58 from 'bs58';
import promiseRetry from 'promise-retry';
import fetch from "node-fetch";
import { globalStaticConfig, globalURLS } from '../../../../../src/globals/global.mjs';
import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, createAssociatedTokenAccountInstruction, getOrCreateAssociatedTokenAccount, AccountLayout, 
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createCloseAccountInstruction  } from '@solana/spl-token';
import { EmbedBuilder } from 'discord.js';

dotenv.config();
const logoPath = path.resolve('./images/botLogo.png');
const HELIUS_RPC = process.env.HELIUS_RPC;

const TOKEN_MAP_URL = 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json';
let tokenMap = new Map();

const POPULAR_TOKENS = {
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { name: 'Jupiter', symbol: 'JUP' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { name: 'Bonk', symbol: 'BONK' },
  'YtfMZ4jg2ubdz4GsNdJWpJk3YTM5pUdMrFN7N6yvqZA': { name: 'Racoon', symbol: 'RAC' },
  // Add more tokens as needed
};

if (!HELIUS_RPC) {
  throw new Error('HELIUS_RPC is not defined in the .env file.');
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

export async function fetchTokenPrice(mint) {
  try {
    const url = `https://api-v3.raydium.io/mint/price?mints=${mint}`;
    console.log(`Fetching token price from: ${url}`);

    const response = await axios.get(url);

    if (response.status === 200 && response.data?.data?.[mint]) {
      const price = parseFloat(response.data.data[mint]);
      console.log(`Token price for ${mint}: ${price}`);
      return price;
    }

    console.error(`Token price not found for mint address: ${mint}`);
    return null;
  } catch (error) {
    console.error(`Error fetching token price for ${mint}:`, error.message);
    return null;
  }
}

export async function fetchTokenDetails(mint2) {
  try {
    // Try to get token details from our mapping first
    if (POPULAR_TOKENS[mint2]) {
      console.log(`Found token details in local mapping: ${POPULAR_TOKENS[mint2].name}`);
      return POPULAR_TOKENS[mint2];
    }
    
    const mint1 = 'So11111111111111111111111111111111111111112'; // Default SOL mint address
    const url = `${globalURLS.raydiumMintAPI}?mint1=${mint1}&mint2=${mint2}&poolType=all&poolSortField=default&sortType=desc&pageSize=1&page=1`;

    console.log(`Fetching token details from: ${url}`);

    const response = await axios.get(url);
    console.log('API response status:', response.status);
    
    // For debugging, print first part of the response data
    let responseSnippet = JSON.stringify(response.data).substring(0, 200) + '...';
    console.log('Response snippet:', responseSnippet);

    if (response.status === 200) {
      if (response.data?.data?.data?.length > 0) {
        // Main path - token found in API
        const tokenData = response.data.data.data[0];
        console.log('Token data found:', tokenData.name || 'No name in data');
        return {
          name: tokenData.name || tokenData.symbol || 'Unknown Token',
          symbol: tokenData.symbol || 'Unknown'
        };
      } else if (response.data?.data?.tokens) {
        // Alternative path - check if token is in tokens list
        const token = response.data.data.tokens.find(t => t.mint === mint2);
        if (token) {
          console.log('Token found in tokens list:', token.name);
          return {
            name: token.name || token.symbol || 'Unknown Token',
            symbol: token.symbol || 'Unknown'
          };
        }
      }
      
      // If no data from API, try to fetch from Jupiter API as fallback
      console.log('No token details found in Raydium API, trying Jupiter API');
      const jupiterResponse = await axios.get(`https://token.jup.ag/all`);
      
      if (jupiterResponse.status === 200 && jupiterResponse.data) {
        const jupToken = jupiterResponse.data.find(t => t.address === mint2);
        if (jupToken) {
          console.log('Token found in Jupiter API:', jupToken.name);
          return {
            name: jupToken.name || jupToken.symbol || 'Unknown Token',
            symbol: jupToken.symbol || 'Unknown'
          };
        }
      }
    }

    // Last resort - check if it's one of the well-known tokens
    if (mint2 === 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN') {
      return { name: 'Jupiter', symbol: 'JUP' };
    } else if (mint2 === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
      return { name: 'Bonk', symbol: 'BONK' };
    } else if (mint2 === 'YtfMZ4jg2ubdz4GsNdJWpJk3YTM5pUdMrFN7N6yvqZA') {
      return { name: 'RAC', symbol: 'RAC' };
    }

    // If no token information was found from any source
    console.error(`Token details not found for mint address: ${mint2}`);
    return { name: 'Unknown Token', symbol: 'Unknown' };
  } catch (error) {
    console.error(`Error fetching token details for ${mint2}:`, error.message);
    // Return default token info with the mint
    return { name: 'Unknown Token', symbol: 'Unknown' };
  }
}

export async function fetchTokenBalance(solPublicKey, mint) {
  try {
    // Solana rpc node URL
    const url = `${globalStaticConfig.rpcNode}/getBalance?publicKey=${solPublicKey}&mint=${mint}`;
    console.log(`Fetching token balance from: ${url}`);
    
    const response = await axios.get(url);
    
    if (response.status === 200 && response.data?.balance) {
      return parseFloat(response.data.balance);
    }
    
    console.error(`Token balance not found for mint address: ${mint}`);
    return null;
  } catch (error) {
    console.error(`Error fetching token balance for ${mint}:`, error.message);
    return null;
  }
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

    //console.log(`Fetched token balances for wallet ${publicKey}:`, tokenBalances);
    console.log(`Fetched token balances for wallet ${publicKey}:`);
    return tokenBalances;
  } catch (error) {
    console.error(`Error fetching token balances for ${publicKey}:`, error.message);
    return [];
  }
}

/**
 * Fetches the minimum balance required to exempt an account from rent.
 * @param {Connection} connection - The Solana connection object.
 * @returns {Promise<number>} - The minimum balance in lamports.
 */
export async function fetchMinimumRentExemptionBalance(connection) {
  try {
    const rentExemptionBalance = await connection.getMinimumBalanceForRentExemption(0);
    return rentExemptionBalance;
  } catch (error) {
    console.error('Error fetching minimum rent exemption balance:', error);
    throw new Error('Failed to fetch minimum rent exemption balance');
  }
}

/**
 * Withdraw SOL from one wallet to another.
 * @param {string} fromPrivateKey - The private key of the wallet to withdraw from.
 * @param {string} toPublicKey - The public key of the wallet to withdraw to.
 * @param {number} amount - The amount of SOL to withdraw.
 * @returns {Promise<string>} - The transaction signature.
 */
export async function withdrawSol(fromPrivateKey, toPublicKey, amount) {
  try {
    const connection = new Connection(globalStaticConfig.rpcNode);
    
    // Create keypair for the source wallet
    const fromWallet = Keypair.fromSecretKey(bs58.decode(fromPrivateKey));
    const toWalletPubkey = new PublicKey(toPublicKey);

    // Fetch the current balance of the source wallet
    const fromWalletBalance = await connection.getBalance(fromWallet.publicKey);

    // Fetch the minimum rent exemption balance
    const rentExemptionBalance = await fetchMinimumRentExemptionBalance(connection);

    // Ensure the withdrawal does not reduce the balance below the rent exemption amount
    const lamportsToWithdraw = amount * LAMPORTS_PER_SOL;
    if (fromWalletBalance - lamportsToWithdraw < rentExemptionBalance) {
      throw new Error('Insufficient balance to maintain rent exemption');
    }

    // Create a transaction to transfer SOL
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: toWalletPubkey,
        lamports: lamportsToWithdraw, // Convert SOL to lamports
      })
    );

    // Send and confirm the transaction
    const signature = await connection.sendTransaction(transaction, [fromWallet], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 5,
    });

    // Wait for confirmation using transactionConfirmationWaiter
    const confirmation = await transactionConfirmationWaiter(signature, connection);
    if (!confirmation) {
      throw new Error('Transaction failed to confirm');
    }

    console.log(`Withdrawn ${amount} SOL from ${fromWallet.publicKey.toBase58()} to ${toWalletPubkey.toBase58()}`);
    return signature;
  } catch (error) {
    console.error('Error withdrawing SOL:', error);
    throw new Error('Failed to withdraw SOL');
  }
}

async function transactionConfirmationWaiter(txid, connection) {
  try {
    const response = await promiseRetry(
      async (retry, number) => {
        const response = await connection.getTransaction(txid, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        
        if (!response) {
          console.log('info', `Transaction ${txid} not yet confirmed, retrying... (${number})`);
          retry(new Error(`Transaction ${txid} not yet confirmed`));  // Pass an error to trigger retry
        }
        
        console.log( 'info', `Transaction https://solscan.io/tx/${txid} confirmed after ${number} retries`);
        return response; // Transaction is confirmed, return the response
      },
      {
        retries: globalStaticConfig.confirmationRetries,
        minTimeout: 500, // was set to 1000
        factor: 2, // Exponential backoff (doubles delay each retry) ( was set to 2)
      }
    );
    
    return response; // Transaction confirmed and returned
  } catch (err) {
    // Retries exhausted, handle error appropriately
    console.log( 'error', `Transaction ${txid} failed to confirm after ${globalStaticConfig.confirmationRetries} retries!`);

    return null;  // Returning null or handling as per your use case
  }
}

export async function transferTokens(walletPrivateKey, destinationAddress, tokenToSend) {
  const connection = new Connection(globalStaticConfig.rpcNode);

  // Convert the private key string to a Keypair
  let wallet;
  try {
    wallet = Keypair.fromSecretKey(bs58.decode(walletPrivateKey));
    console.log(`Using Wallet Public Key: ${wallet.publicKey.toBase58()}`);
  } catch (error) {
    console.error('Invalid wallet private key');
    throw new Error('Invalid wallet private key');
  }

  // Validate the destination public key
  let destinationPublicKey;
  try {
    destinationPublicKey = new PublicKey(destinationAddress);
    console.log(`Destination Wallet Public Key: ${destinationPublicKey.toBase58()}`);
  } catch (error) {
    console.error(`Invalid destination wallet public key: ${destinationAddress}`);
    throw new Error('Invalid destination wallet public key');
  }

  // Get the output token mint from the session
  const outputMint = new PublicKey(tokenToSend);

  let success = false;
  const hardRetries = 100; // Reduce the number of retries to avoid long delays
  let attempts = 0;

  while (!success && attempts < hardRetries) {
    attempts++;

    const isCongested = await checkNetworkCongestion(sessionID);

    // Adjust fees based on network congestion and failed trade count
    const rioritizationFeeLamports = 270000;
    const jitoTipLamports = 50000;

    // Instruction to set the compute unit price for priority fee
    const PRIORITY_FEE_INSTRUCTIONS = ComputeBudgetProgram.setComputeUnitPrice({microLamports: prioritizationFeeLamports});

    console.log(`Prioritization fee inside transfer token function: ${prioritizationFeeLamports}`);
    console.log(`Jito tip amount inside transfer token function: ${jitoTipLamports}`);

    console.log(`Retry Attempt: ${attempts}`);

    try {
      console.log(`Attempting to send token transfer transaction... Attempt #${attempts}`);

      const walletPublicKey = wallet.publicKey;
      console.log(`Processing Wallet Public Key: ${walletPublicKey.toBase58()}`);

      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        outputMint,
        walletPublicKey
      );

      console.log(`Sender Token Account: ${senderTokenAccount.address.toBase58()}`);

      // Get or create the receiver's token account
      const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        outputMint,
        destinationPublicKey
      );

      console.log(`Receiver Token Account: ${receiverTokenAccount.address.toBase58()}`);

      const tokenBalanceResult = await connection.getTokenAccountBalance(senderTokenAccount.address);

      const tokenBalance = tokenBalanceResult.value.uiAmount;
      console.log(`Token balance for wallet ${walletPublicKey.toBase58()}: ${tokenBalance}`);

      if (tokenBalance === 0) {
        console.log(`No tokens to transfer from ${walletPublicKey.toBase58()} to ${destinationPublicKey.toBase58()}`);
        return;
      }

      const amountToTransfer = tokenBalance;
      if (amountToTransfer <= 0) {
        console.log(`Not enough tokens to transfer.`);
        break;
      }

      // TODO: Get the decimals from the token mint dynamically instead of static value
      // Left off here need to read through this to make sure everything works.      
      const decimals = 9;
      const transferAmount = Math.floor(amountToTransfer * Math.pow(10, decimals));

      const transferInstruction = createTransferInstruction(
        senderTokenAccount.address,
        receiverTokenAccount.address,
        walletPublicKey,
        transferAmount
      );

      const jitoTipInstruction = SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: new PublicKey(globalStaticConfig.jitoTipAddress),
        lamports: jitoTipLamports,
      });

      const { blockhash } = await connection.getLatestBlockhash('finalized');
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: walletPublicKey,
      }).add(PRIORITY_FEE_INSTRUCTIONS).add(transferInstruction).add(jitoTipInstruction);

      transaction.sign(wallet);
      const serializedTx = transaction.serialize();
      const base58EncodedTx = bs58.encode(serializedTx);
      const jitoRpcUrl = globalStaticConfig.jitoSendTransaction;

      logWithSession(sessionID, `Serialized Transaction: ${base58EncodedTx}`);
      logWithSession(sessionID, `Sender Wallet: ${walletPublicKey.toBase58()}`);
      logWithSession(sessionID, `Receiver Wallet: ${destinationPublicKey.toBase58()}`);
      logWithSession(sessionID, `Jito Tip Address: ${globalStaticConfig.jitoTipAddress}`);

      const response = await axios.post(jitoRpcUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [base58EncodedTx]
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const signature = response.data.result;
      logWithSession(sessionID, `Token transfer successful with txid: ${signature}`);
      logWithSession(sessionID, `Token transfer of ${transferAmount / Math.pow(10, decimals)} tokens sent to ${destinationPublicKey.toBase58()}`);

      // Wait for transaction confirmation
      const confirmationResponse = await transactionConfirmationWaiter(sessionID, signature, connection);
      if (!confirmationResponse) {
        throw new Error(`Transaction ${signature} failed to confirm.`);
      }

      // Log the transaction ID only if the transaction is confirmed
      logWithSession(sessionID, `Transaction ID: https://solscan.io/tx/${signature}`);

      // Verify the token balance of the destination wallet after the transfer      
      //const postTransferBalanceResult = await connection.getTokenAccountBalance(destinationPublicKey);
      // Uncomment if issues come up with not checking the tokenaccount creation
      await sleep(5000);
      const postTransferBalanceResult = await connection.getTokenAccountBalance(receiverTokenAccount.address);
      console.log(`Post-transfer token balance for wallet ${destinationPublicKey.toBase58()}: ${postTransferBalanceResult.value.uiAmount}`);

      if (postTransferBalanceResult.value.uiAmount >= amountToTransfer) {
        success = true;
      } else {
        console.error(`Transfer to ${destinationPublicKey.toBase58()} failed. Retrying...`);
      }
    } catch (error) {
      console.error(`Failed to transfer tokens from wallet ${wallet.publicKey.toBase58()}: ${error.message}`);
      logWithSession(sessionID, `Error during token transfer transaction: ${error.message}`);
    }
  }

  if (!success) {
    throw new Error(`Failed to transfer tokens after ${hardRetries} attempts.`);
  }
}

export async function getSolanaPriorityFee() {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "qn_estimatePriorityFees",
    "params": {
      "last_n_blocks": 100,
      "account": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
    }
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch('https://thrilling-twilight-film.solana-mainnet.quiknode.pro/f6cbdbd359290e75c9fc57b545b1b944eb264c3a', requestOptions);

    const data = await response.json();

    if (data && data.result && data.result.per_compute_unit) {
      const highFee = data.result.per_compute_unit.high;
      const mediumFee = data.result.per_compute_unit.medium;
      const lowFee = data.result.per_compute_unit.low;

      return { highFee, mediumFee, lowFee }; // Return an object with the fees
    } else {
      console.error("Expected data not found in response:", data);
      return null; // Return null if data structure is unexpected
    }
  } catch (error) {
    console.error("Error fetching high priority fee:", error);
    return null;
  }
};

export async function createWalletEmbed(publicKey, balance, tokenBalances) {
  const embed = new EmbedBuilder()
      .setTitle('Wallet Details')
      .setColor(0x0099FF)
      .addFields(
          { name: 'Wallet Address', value: publicKey },
          { name: 'SOL Balance', value: `${balance.toFixed(4)} SOL` }
      );

  if (tokenBalances && tokenBalances.length > 0) {
      const tokenList = tokenBalances
          .map(token => `${token.name}: ${token.amount.toFixed(token.decimals)}`)
          .join('\n');
      embed.addFields({ name: 'Token Balances', value: tokenList });
  } else {
      embed.addFields({ name: 'Token Balances', value: 'No tokens found' });
  }

  return embed;
}

export async function createTransactionEmbed(type, amount, txId, tokenDetails) {
  const embed = new EmbedBuilder()
      .setTitle(`${type} Transaction Successful`)
      .setColor(0x00FF00)
      .addFields(
          { name: 'Amount', value: amount.toString() },
          { name: 'Transaction ID', value: `[View on Solscan](https://solscan.io/tx/${txId})` }
      );

  if (tokenDetails) {
      embed.addFields(
          { name: 'Token', value: tokenDetails.name || 'Unknown' },
          { name: 'Price', value: tokenDetails.price ? `$${tokenDetails.price}` : 'Unknown' }
      );
  }

  return embed;
}

export async function createErrorEmbed(error) {
  return new EmbedBuilder()
      .setTitle('Error')
      .setDescription(error.message || 'An unknown error occurred')
      .setColor(0xFF0000);
}

export async function createPriorityFeeEmbed(fees) {
  return new EmbedBuilder()
      .setTitle('Priority Fees')
      .setColor(0x0099FF)
      .addFields(
          { name: 'High', value: `${(fees.highFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`, inline: true },
          { name: 'Medium', value: `${(fees.mediumFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`, inline: true },
          { name: 'Low', value: `${(fees.lowFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`, inline: true }
      );
}

export function formatTokenDetails(token, price) {
  return new EmbedBuilder()
      .setTitle(`Token Details: ${token.name || 'Unknown Token'}`)
      .setColor(0x0099FF)
      .addFields(
          { name: 'Contract Address', value: token.mint || 'N/A' },
          { name: 'Price', value: price ? `$${price}` : 'N/A' },
          { name: 'Balance', value: `${token.amount.toFixed(token.decimals)}` }
      );
}