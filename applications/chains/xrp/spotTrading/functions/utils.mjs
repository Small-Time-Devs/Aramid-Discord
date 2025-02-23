import axios from 'axios';
import dotenv from 'dotenv';
import { EmbedBuilder } from 'discord.js';
import xrpl from "xrpl";
import { globalStaticConfig } from '../../../../../../src/globals/globals.mjs'; 

dotenv.config();
const logoPath = path.resolve('./images/botLogo.png');

const TOKEN_MAP_URL = 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json';
let tokenMap = new Map();

/**
 * Initializes an HTTP RPC client connection.
 * @param {string} endpoint - The RPC endpoint URL.
 * @returns {Object} - The initialized client.
 */
export async function initializeXrpClient(endpoint) {
  console.log("Using HTTP RPC connection.");
  return {
    request: async (payload) => {
      const formattedPayload = {
        method: payload.method,
        params: [payload.params || {}],
      };
      const response = await axios.post(endpoint, formattedPayload, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error_message}`);
      }
      return response.data.result;
    },
  };
}

export function createTokenEmbed(tokenInfo, price) {
    return new EmbedBuilder()
        .setTitle(`${tokenInfo.tokenName || 'Token Info'}`)
        .setColor(0x0099FF)
        .addFields(
            { name: 'Price', value: `${price.tokenPrice} XRP`, inline: true },
            { name: '24h High', value: `${price.tokenPriceHigh} XRP`, inline: true },
            { name: '24h Low', value: `${price.tokenPriceLow} XRP`, inline: true },
            { name: 'Volume (USD)', value: `$${price.volumeUSD.toLocaleString()}`, inline: true },
            { name: 'Trend', value: price.tokenPriceTrend.toUpperCase(), inline: true }
        )
        .setThumbnail(tokenInfo.logoFileURL || null)
        .setTimestamp();
}

export function createBalanceEmbed(wallet, balance, tokenBalances) {
    const embed = new EmbedBuilder()
        .setTitle('XRP Wallet Details')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Wallet Address', value: wallet.classicAddress, inline: false },
            { name: 'XRP Balance', value: `${balance} XRP`, inline: true }
        );

    if (tokenBalances && tokenBalances.length > 0) {
        const tokenFields = tokenBalances.map(token => ({
            name: token.currency,
            value: `${token.balance}`,
            inline: true
        }));
        embed.addFields(tokenFields);
    }

    return embed;
}

/**
 * Fetches token information for the given token mint address.
 * @param {string} tokenMint - The token mint address.
 * @returns {Object} - The token information.
 */
export async function fetchTokenInfo(tokenMint) {
  try {
    const response = await axios.get(`https://api.onthedex.live/public/v1/token/meta/${tokenMint}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching token info for ${tokenMint}:`, error.message);
    throw new Error('Failed to fetch token info.');
  }
}

export async function fetchXrpBalance(wallet, client) {
  try {
    const accountInfo = await client.request({
      method: "account_info",
      params: { account: wallet.classicAddress },
    });
    // Uncomment this to see what all accountInfo is able to be passed with.
    //console.log(accountInfo);

    const walletBalance = parseFloat(xrpl.dropsToXrp(accountInfo.account_data.Balance)); // Convert drops to XRP
    console.log(`Wallet Balance: ${walletBalance} XRP`);

    return walletBalance;
  } catch (error) {
    console.error("Error calculating wallet balance:", error.message);
    throw new Error("Failed to calculate wallet balance.");
  }
}

async function getWalletFromKey(key) {
  try {
    console.log(`Key provided: ${key}`);
    if (key.startsWith("s")) {
      // Derive wallet from seed
      const wallet = xrpl.Wallet.fromSeed(key);
      console.log(`Derived wallet from seed: ${wallet.classicAddress}`);
      return wallet;
    } else if (/^[A-Fa-f0-9]{64}$/.test(key)) {
      // Derive wallet from raw entropy (hex private key)
      const entropy = Buffer.from(key, "hex");
      const wallet = xrpl.Wallet.fromEntropy(entropy);
      console.log(`Derived wallet from raw entropy: ${wallet.classicAddress}`);
      return wallet;
    } else {
      // Derive wallet from private key
      const wallet = xrpl.Wallet.fromSecret(key);
      console.log(`Derived wallet from private key: ${wallet.classicAddress}`);
      return wallet;
    }
  } catch (error) {
    console.error("Error deriving wallet:", error.message);
    throw new Error("Invalid key format. Ensure it is a valid seed, private key, or raw entropy.");
  }
}

export async function fetchXrpTokenBalances(xrpPublicKey) {
  try {
    const response = await axios.post(globalStaticConfig.rpcNodeXrp, {
      method: "account_lines",
      params: [{ account: xrpPublicKey }]
    });

    const tokenBalances = response.data.result.lines.map(line => ({
      currency: line.currency,
      balance: parseFloat(line.balance),
      issuer: line.account,
    }));

    return tokenBalances;
  } catch (error) {
    console.error(`Error fetching token balances for ${xrpPublicKey}:`, error.message);
    throw new Error('Failed to fetch token balances.');
  }
}

/**
 * Fetches token balances for the given XRP public key.
 * @param {string} xrpPublicKey - The XRP public key.
 * @returns {Array} - An array of token balances.
 */
export async function fetchTokenBalances(xrpPublicKey) {
  try {
    const response = await axios.post(globalStaticConfig.rpcNodeXrp, {
      method: "account_lines",
      params: [{ account: xrpPublicKey }]
    });

    const tokenBalances = response.data.result.lines.map(line => ({
      name: line.currency, // Assuming 'currency' is the ticker symbol
      amount: parseFloat(line.balance),
      mint: line.account,
      decimals: 6, // Assuming 6 decimals for simplicity, adjust as needed
    }));

    return tokenBalances;
  } catch (error) {
    console.error(`Error fetching token balances for ${xrpPublicKey}:`, error.message);
    throw new Error('Failed to fetch token balances.');
  }
}

/**
 * Fetches the balance of a specific token for the given XRP public key.
 * @param {string} xrpPublicKey - The XRP public key.
 * @param {string} tokenMint - The token mint address.
 * @returns {number} - The balance of the specified token.
 */
export async function fetchTokenBalance(xrpPublicKey, tokenMint) {
  try {
    const tokenBalances = await fetchTokenBalances(xrpPublicKey);
    const token = tokenBalances.find(t => t.mint === tokenMint);
    return token ? token.amount : 0;
  } catch (error) {
    console.error(`Error fetching token balance for ${xrpPublicKey} and token ${tokenMint}:`, error.message);
    throw new Error('Failed to fetch token balance.');
  }
}

/**
 * Fetches the price of a specific token.
 * @param {string} tokenMint - The token mint address.
 * @returns {number} - The price of the specified token.
 */
export async function fetchTokenPrice(ticker, tokenMint) {
  try {
    //https://api.onthedex.live/public/v1/ticker/SOLO.rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz
    /*
    {"pairs":[{"base":{"currency":"SOLO","issuer":"rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz"},
    "quote":"XRP","ago24":0.1618123009019382,"last":0.16089908929865415,"num_trades":810,"pc24":-0.56,"price_hi":0.16750000000000015,"price_lo":0.15751599870085237,"price_mid":0.1606825719,"trend":"up","volume_base":281687,"volume_quote":45733,"volume_usd":143883,"time":1737727730},
    {"base":{"currency":"SOLO","issuer":"rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz"},
    "quote":{"currency":"CORE","issuer":"rcoreNywaoz2ZCQ8Lg2EbSLnGuRBmun6D"},
    "ago24":2.5199999999999987,"last":2.5200000000155383,"num_trades":118,"price_hi":2.5200000000155383,"price_lo":2.217786648924309,"price_mid":2.335005025,"trend":"up","volume_base":3228,"volume_quote":7181,"volume_usd":1569,"time":1737706141},
    {"base":{"currency":"SOLO","issuer":"rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz"},
    "quote":{"currency":"XAH","issuer":"rswh1fvyLqHizBS2awu1vs6QcmwTBd9qiv"},
    "ago24":5.949999999999998,"last":6.309000000000001,"num_trades":12,"pc24":6.03,"price_hi":6.309000000000001,"price_lo":6.3089999999999975,"price_mid":0,"trend":"up","volume_base":2500,"volume_quote":15772,"volume_usd":1303,"time":1737719920},
    {"base":{"currency":"SOLO","issuer":"rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz"},
    "quote":{"currency":"XCORE","issuer":"r3dVizzUAS3U29WKaaSALqkieytA2LCoRe"},
    "ago24":2.399999999999999,"last":2.705999999999091,"num_trades":1,"pc24":12.75,"price_hi":2.705999999999091,"price_lo":2.705999999999091,"price_mid":2.353,"volume_base":0.522615,"volume_quote":1.4142,"volume_usd":0.265917,"time":1737677521}]}
    */
    const response = await axios.get(`https://api.onthedex.live/public/v1/ticker/${ticker}.${tokenMint}`);
    const pair = response.data.pairs.find(pair => pair.quote === 'XRP');
    
    if (!pair) {
      throw new Error('No XRP trading pair found');
    }

    return {
      tokenPrice: pair.last,
      tokenPriceLow: pair.price_lo,
      tokenPriceHigh: pair.price_hi,
      tokenPriceMid: pair.price_mid,
      tokenPriceTrend: pair.trend,
      volumeUSD: pair.volume_usd
    };
  } catch (error) {
    console.error(`Error fetching token price for ${ticker}.${tokenMint}:`, error.message);
    throw new Error('Failed to fetch token price.');
  }
}

export async function fetchTokenDetails(ticker,tokenMint) {
  try {
    //https://api.onthedex.live/public/v1/token/meta/CSC.rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr
    //{"meta":[{"currency":"CSC","issuer":"rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr","token_name":"CasinoCoin","logo_file":"https://www.onthedex.live/tokens/logo/csc_rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr.svg"}]}
    const response = await axios.get(`https://api.onthedex.live/public/v1/token/meta/${ticker}.${tokenMint}`);
    const tokenName = response.data.meta[0].token_name;
    const logoFileURL = response.data.meta[0].logo_file;
    return { tokenName, logoFileURL };
  } catch (error) {
    console.error(`Error fetching token details for ${tokenMint}:`, error.message);
    throw new Error('Failed to fetch token details.');
  }
}

export async function fetchIssuerCurrencies(issuerAddress, rpcEndpoint) {
  // Make an HTTP POST to the XRPL JSON-RPC endpoint
  const response = await axios.post(rpcEndpoint, {
    method: "account_lines",
    params: [
      {
        account: issuerAddress
      }
    ]
  });

  // If there's an error in the response
  if (response.data.error) {
    throw new Error(response.data.error_message || "RPC error while fetching issuer lines");
  }

  // "lines" is an array of trust line objects; each line has a "currency" field
  const lines = response.data.result?.lines || [];
  const currencies = lines.map(line => line.currency);

  // Deduplicate by converting the array to a Set, then back to an array
  const currencyHex = Array.from(new Set(currencies));
  const decodedCurrencyHex = await decodeHexCurrency(currencyHex);

  return {currencyHex, decodedCurrencyHex};
}

async function decodeHexCurrency(hexString) {
  const bytes = Buffer.from(hexString, "hex")
  let ascii = bytes.toString("ascii")
  // remove trailing nulls (\x00)
  return ascii.replace(/\x00+$/, "")
}

export function handleXrpError(error, interaction) {
    const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(error.message || 'An unknown error occurred')
        .setColor(0xFF0000);

    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
}

export function createTransactionEmbed(txDetails) {
    return new EmbedBuilder()
        .setTitle('Transaction Details')
        .setColor(0x00FF00)
        .addFields(
            { name: 'Type', value: txDetails.type, inline: true },
            { name: 'Amount', value: `${txDetails.amount} ${txDetails.currency}`, inline: true },
            { name: 'Status', value: txDetails.status, inline: true },
            { name: 'Transaction Hash', value: txDetails.hash }
        )
        .setTimestamp();
}