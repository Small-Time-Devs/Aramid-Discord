import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fetchSolBalance, fetchTokenBalances } from '../chains/solana/functions/utils.mjs';

dotenv.config();
const logoPath = path.resolve('./images/botLogo.png');
const HELIUS_RPC = process.env.HELIUS_RPC;

const TOKEN_MAP_URL = 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json';
let tokenMap = new Map();

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

export async function fetchWalletDetails(publicKey) {
  try {
    const solBalance = await fetchSolBalance(publicKey);
    const tokenBalances = await fetchTokenBalances(publicKey);

    return {
      solBalance,
      tokenBalances,
      formatted: createWalletEmbed(publicKey, solBalance, tokenBalances)
    };
  } catch (error) {
    console.error('Error fetching wallet details:', error);
    throw error;
  }
}

export function createWalletEmbed(solPublicKey, solBalance, xrpPublicKey = null, xrpBalance = 0) {
  const embed = new EmbedBuilder()
    .setTitle('Wallet Details')
    .setColor(0x0099FF)
    .addFields(
      {
        name: 'Solana Wallet',
        value: `[${solPublicKey}](https://solscan.io/account/${solPublicKey})`,
        inline: false
      },
      {
        name: 'SOL Balance',
        value: `${solBalance.toFixed(2)} SOL`,
        inline: true
      }
    );

  if (xrpPublicKey) {
    embed.addFields(
      {
        name: 'XRP Wallet',
        value: `[${xrpPublicKey}](https://xrpscan.com/account/${xrpPublicKey})`,
        inline: false
      },
      {
        name: 'XRP Balance',
        value: `${xrpBalance.toFixed(2)} XRP`,
        inline: true
      }
    );
  }

  return embed;
}

export function createTokenBalancesEmbed(tokenBalances) {
  const embed = new EmbedBuilder()
    .setTitle('Token Balances')
    .setColor(0x0099FF);

  if (tokenBalances.length > 0) {
    tokenBalances.forEach(token => {
      embed.addFields({
        name: token.name || 'Unknown Token',
        value: `Amount: ${token.amount.toFixed(token.decimals)}\nMint: ${token.mint}`,
        inline: true
      });
    });
  } else {
    embed.setDescription('No tokens found');
  }

  return embed;
}

export function createWalletButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('view_transactions')
        .setLabel('View Transactions')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('refresh_wallet')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
    );
}

// Helper function to handle message updates
export async function updateMessage(message, content) {
  try {
    if (message.editable) {
      await message.edit(content);
    } else {
      const newMessage = await message.channel.send(content);
      if (message.deletable) {
        await message.delete();
      }
      return newMessage;
    }
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

// Helper function to create error embeds
export function createErrorEmbed(error) {
  return new EmbedBuilder()
    .setTitle('Error')
    .setDescription(error.message || 'An unknown error occurred')
    .setColor(0xFF0000);
}

// Helper function to create success embeds
export function createSuccessEmbed(message) {
  return new EmbedBuilder()
    .setTitle('Success')
    .setDescription(message)
    .setColor(0x00FF00);
}