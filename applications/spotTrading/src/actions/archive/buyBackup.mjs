import axios from 'axios';
import { Scenes, Markup } from 'telegraf';
import { storeTrade } from '../../db/dynamo.mjs';

const RAYDIUM_API_URL = 'https://api-v3.raydium.io/pools/info/mint';

/**
 * Fetch token details using the specified Raydium API URL.
 * @param {string} mint2 - The mint address of the token to be purchased.
 * @returns {object|null} - Token details or null if not found.
 */
async function fetchTokenDetails(mint2) {
  try {
    const mint1 = 'So11111111111111111111111111111111111111112'; // Default SOL mint address
    const url = `${RAYDIUM_API_URL}?mint1=${mint1}&mint2=${mint2}&poolType=all&poolSortField=default&sortType=desc&pageSize=1&page=1`;

    console.log(`Fetching token details from: ${url}`);

    const response = await axios.get(url);

    console.log('Full response from Raydium API:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data?.data?.data?.length > 0) {
      return response.data.data.data[0]; // Adjusted to match nested data structure
    }

    console.error(`Token details not found for mint address: ${mint2}`);
    return null;
  } catch (error) {
    console.error(`Error fetching token details for ${mint2}:`, error.message);
    return null;
  }
}

/**
 * Fetch token price using the Raydium API.
 * @param {string} mint - The mint address of the token.
 * @returns {number|null} - The price of the token in USD or null if not found.
 */
async function fetchTokenPrice(mint) {
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

/**
 * Display token details and actionable buttons with DexScreener embed.
 * @param {object} ctx - Telegram context.
 * @param {object} tokenData - Token information from Raydium API.
 */
async function displayTokenDetails(ctx, tokenData) {
  const mintB = tokenData.mintB || {};
  const name = mintB.name || 'Unknown Token';
  const symbol = mintB.symbol || 'N/A';
  const tvl = tokenData.tvl;
  const day = tokenData.day || {};
  const month = tokenData.month || {};
  const dailyVolume = day.volume || 0;
  const monthlyVolume = month.volume || 0;
  const mintAddress = mintB.address;

  const price = await fetchTokenPrice(mintAddress);

  const dexScreenerUrl = `https://dexscreener.com/solana/${mintAddress}`;

  const message = `💎 *${name} (${symbol})*\n\n` +
      `💰 *Price Per Token (USD):* ${price ? `$${price.toFixed(6)}` : 'N/A'}\n` +
      `📊 *Daily Volume (USD):* ${dailyVolume ? `$${dailyVolume.toLocaleString()}` : 'N/A'}\n` +
      `📅 *Monthly Volume (USD):* ${monthlyVolume ? `$${monthlyVolume.toLocaleString()}` : 'N/A'}\n` +
      `💸 *TVL (USD):* ${tvl ? `$${tvl.toLocaleString()}` : 'N/A'}\n\n` +
      `🔗 [View on DexScreener](${dexScreenerUrl})\n\n` +
      `Select an amount to purchase:`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('0.5 SOL', 'BUY_0.5'), Markup.button.callback('1 SOL', 'BUY_1')],
      [Markup.button.callback('3 SOL', 'BUY_3'), Markup.button.callback('Custom Amount', 'CUSTOM_AMOUNT')],
      [Markup.button.callback('🏠 Home', 'HOME')],
    ]),
  });
}

/**
 * Handle custom amount input.
 * @param {object} ctx - Telegram context.
 */
async function handleCustomAmount(ctx) {
  ctx.session.state = 'WAITING_FOR_CUSTOM_AMOUNT';
  await ctx.reply('✏️ Enter the amount of SOL you want to spend:');
}

/**
 * Wizard Scene for buying tokens.
 */
export const buyTokenWizard = new Scenes.WizardScene(
  'buy_token',
  async (ctx) => {
    await ctx.reply('🛒 Enter the token contract address you want to buy:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    const contractAddress = ctx.message?.text?.trim();

    if (!contractAddress) {
      await ctx.reply('❌ Invalid contract address. Please try again.');
      return;
    }

    ctx.session.mintAddress = contractAddress;
    const tokenData = await fetchTokenDetails(contractAddress);

    if (tokenData) {
      ctx.session.tokenData = tokenData;
      await displayTokenDetails(ctx, tokenData);
    } else {
      await ctx.reply('❌ Failed to fetch token details. Please try again.');
    }

    return ctx.scene.leave();
  }
);

/**
 * Confirm buy action with Non Jito and With Jito options.
 * @param {object} ctx - Telegram context.
 * @param {string} solPublicKey - User's public key.
 * @param {string} solPrivateKey - User's private key.
 * @param {string} mintAddress - Token mint address.
 * @param {number} amount - SOL amount.
 */
export async function confirmBuyHandler(ctx, solPublicKey, solPrivateKey, mintAddress, amount) {
  console.log('Confirming purchase:', { solPublicKey, solPrivateKey, mintAddress, amount });
  try {
      const tokenData = ctx.session.tokenData || {};
      const confirmationMessage = `🔍 *Confirm Purchase*\n\n` +
          `- 🪙 *Token:* [${tokenData.name || mintAddress}](https://dexscreener.com/solana/${mintAddress})\n` +
          `- 💰 *Amount to Spend:* ${amount} SOL\n\n` +
          `Click one of the options below to proceed or Cancel to abort.`;

      await ctx.reply(confirmationMessage, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
              [
                  Markup.button.callback('✅ Confirm Non Jito', `CONFIRM_BUY_${amount}_false`),
                  Markup.button.callback('✅ Confirm With Jito', `CONFIRM_BUY_${amount}_true`)
              ],
              [Markup.button.callback('❌ Cancel', 'CANCEL_BUY')],
          ]),
      });
  } catch (error) {
      console.error('Error in confirmBuyHandler:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
  }
}

export async function executeBuy(ctx, solPublicKey, solPrivateKey, amount, mintAddress, useJito) {
  try {
      if (!amount || isNaN(amount)) {
          throw new Error('Invalid amount provided.');
      }

      console.log('API Payload:', {
          private_key: solPrivateKey,
          public_key: solPublicKey,
          mint: mintAddress,
          amount,
          useJito,
      });

      const response = await axios.post(`${process.env.API_BASE_URL}/buy`, {
          private_key: solPrivateKey,
          public_key: solPublicKey,
          mint: mintAddress,
          amount, // Ensure this is passed correctly
          useJito, // Pass the useJito parameter
      });

      if (response.data.message === 'Transaction confirmed') {
          const { tokensPurchased, txid } = response.data;
          const tradeID = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

          const successMessage = `✅ *Purchase Successful!*\n\n` +
              `- 🪙 *Tokens Purchased:* ${tokensPurchased}\n` +
              `- 📝 *Transaction ID:* [${txid}](https://solscan.io/tx/${txid})\n\n` +
              `🎉 Congratulations on your purchase!\n\n` +
              `🌐 [Discord](https://discord.gg/smalltimedevs) | [Telegram](https://t.me/SmallTimeDevs) | [Website](https://www.smalltimedevs.com)\n`;

          await ctx.reply(successMessage, {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Home', 'HOME')]]),
          });

          // Record the trade in DynamoDB
          await storeTrade({
              userName: ctx.from.username,
              tradeId: tradeID,
              type: "BUY",
              tokenMint: mintAddress,
              amount,
              tokenAmount: tokensPurchased,
              pricePerToken: amount / tokensPurchased,
              totalValue: amount,
              txId: txid,
              useJito, // Save whether Jito was used
              timestamp: new Date().toISOString(),
          });
      } else {
          await ctx.reply(`❌ ${response.data.message}`);
      }
  } catch (error) {
      console.error('Error in executeBuy:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
  }
}


/**
 * Cancel the purchase process.
 * @param {object} ctx - Telegram context.
 */
export async function cancelBuyHandler(ctx) {
  await ctx.reply('✅ *Purchase canceled.*', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Home', 'HOME')]]),
  });
}

/**
 * Register buy-related actions for the bot.
 * @param {object} bot - Telegram bot instance.
 */
export function registerBuyActions(bot) {
  bot.action(/BUY_(\d+(\.\d+)?)/, async (ctx) => {
    const amount = parseFloat(ctx.match[1]);
    const { solPublicKey, solPrivateKey } = ctx.session;
    const mintAddress = ctx.session.mintAddress;

    if (!solPublicKey || !solPrivateKey || !mintAddress) {
      await ctx.reply('❌ Wallet details are missing. Please restart the process.');
      return;
    }

    await confirmBuyHandler(ctx, solPublicKey, solPrivateKey, mintAddress, amount);
  });

  bot.action('CUSTOM_AMOUNT', async (ctx) => {
    console.log('Custom Amount button clicked'); // Debugging
    await handleCustomAmount(ctx); // Call the custom amount handler
  });

  bot.on('text', async (ctx) => {
    console.log('Received text:', ctx.message.text); // Debugging
    if (ctx.session.state === 'WAITING_FOR_CUSTOM_AMOUNT') {
      const amount = parseFloat(ctx.message.text);
      const { solPublicKey, solPrivateKey, mintAddress } = ctx.session;

      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Invalid amount. Please enter a positive number.');
        return;
      }

      console.log('Valid custom amount received:', amount); // Debugging
      ctx.session.state = null; // Clear the session state after input
      await confirmBuyHandler(ctx, solPublicKey, solPrivateKey, mintAddress, amount);
    }
  });

  bot.action('CANCEL_BUY', async (ctx) => {
    await cancelBuyHandler(ctx);
  });
}


