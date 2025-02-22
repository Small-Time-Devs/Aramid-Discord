import axios from 'axios';
import { Markup } from 'telegraf';
import { storeTrade, checkUserWallet } from '../../../../db/dynamo.mjs';
import { fetchTokenBalances } from '../../functions/utils.mjs';
import { globalStaticConfig, globalURLS } from '../../../../globals/globals.mjs';

/**
 * Fetch token balance for the user.
 * @param {string} solPublicKey - User's public key.
 * @param {string} mint - Token mint address.
 * @returns {number|null} - Token balance or null if not found.
 */
async function fetchTokenBalance(solPublicKey, mint) {
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
 * Display token details and actionable buttons with percentage options.
 * @param {object} ctx - Telegram context.
 * @param {object} tokenData - Token information.
 * @param {number} balance - User's token balance.
 */
async function displayTokenSellOptions(ctx, tokenData, balance) {
  const mintAddress = tokenData.mint || 'Unknown';
  const name = tokenData.name || 'Unknown Token';
  const symbol = tokenData.symbol || 'N/A';

  const message = `��� *${name} (${symbol})*\n\n` +
    `💰 *Your Balance:* ${balance.toFixed(6)} ${symbol}\n\n` +
    `Select a percentage of your balance to sell:`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('25%', 'SELL_25'), Markup.button.callback('50%', 'SELL_50')],
      [Markup.button.callback('100%', 'SELL_100'), Markup.button.callback('Custom', 'CUSTOM_SELL')],
      [Markup.button.callback('🏠 Home', 'HOME')],
    ]),
  });
}

/**
 * Handle custom percentage input for selling.
 * @param {object} ctx - Telegram context.
 */
async function handleCustomSell(ctx) {
  ctx.session.state = 'WAITING_FOR_CUSTOM_PERCENTAGE';
  await ctx.reply('✏️ Enter the percentage of your balance to sell (e.g., 30):');
}

/**
 * Execute the sell transaction.
 * @param {object} ctx - Telegram context.
 * @param {string} solPublicKey - User's public key.
 * @param {string} solPrivateKey - User's private key.
 * @param {string} mint - Token mint address.
 * @param {number} amount - Token amount to sell.
 * @param {boolean} useJito - Whether to use Jito.
 */
export async function executeSell(ctx, solPublicKey, solPrivateKey, mint, amount, useJito) {
  console.log('Executing sell with:', { solPublicKey, solPrivateKey, mint, amount, useJito });

  try {
      if (!amount || isNaN(amount)) {
          throw new Error('Invalid amount provided.');
      }

      console.log('API Payload:', {
          private_key: solPrivateKey,
          public_key: solPublicKey,
          mint: mint,
          amount, // Pass the token format amount
          useJito,
      });

      const response = await axios.post(`${globalURLS.smallTimeDevsRaydiumTradeAPI}/sell`, {
          public_key: solPublicKey,
          private_key: solPrivateKey,
          mint,
          amount, // Pass the token amount directly
          useJito,
      });

      if (response.data.message === 'Transaction confirmed') {
          const { tokensSold, txid } = response.data;

          // Clear session state
          ctx.session.state = null;
          ctx.session.selectedToken = null;

          const successMessage = `✅ *Sell Successful!*\n\n` +
              `- 🪙 *Tokens Sold:* ${tokensSold}\n` +
              `- 📝 *Transaction ID:* [${txid}](https://solscan.io/tx/${txid})\n\n` +
              `🎉 Congratulations on your sale!`;

          await ctx.reply(successMessage, {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Home', 'HOME')]]),
          });
      } else {
          console.error('Sell failed:', response.data.message);
          await ctx.reply(`❌ Sell failed: ${response.data.message}`);
      }
  } catch (error) {
      console.error('Error in executeSell:', error.message);
      await ctx.reply('❌ An error occurred during the sell process. Please try again.');
  }
}

export async function confirmSellHandler(ctx, solPublicKey, solPrivateKey, mintAddress, amount) {
  console.log('Confirming sell:', { solPublicKey, solPrivateKey, mintAddress, amount });

  try {
      const tokenData = ctx.session.selectedToken || {};
      console.log('Inside confirm sell handler', tokenData);
      console.log('Token decimals:', tokenData.decimals || 'Not provided');
      console.log('Amount in tokens:', amount);

      const confirmationMessage = `🔍 *Confirm Sale*\n\n` +
          `- 🪙 *Token:* [${tokenData.name || mintAddress}](https://dexscreener.com/solana/${mintAddress})\n` +
          `- 💰 *Amount to Sell:* ${amount.toFixed(6)} ${tokenData.symbol}\n\n` +
          `Click one of the options below to proceed or Cancel to abort.`;

      await ctx.reply(confirmationMessage, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
              [
                  Markup.button.callback(`✅ Confirm Non Jito`, `CONFIRM_SELL_${tokenData.balance}_false`),
                  Markup.button.callback(`✅ Confirm With Jito`, `CONFIRM_SELL_${tokenData.balance}_true`),
              ],
              [Markup.button.callback('❌ Cancel', 'CANCEL_SELL')],
          ]),
      });
  } catch (error) {
      console.error('Error in confirmSellHandler:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Cancel the sell process.
 * @param {object} ctx - Telegram context.
 */
export async function cancelSellHandler(ctx) {
  try {
      // Clear session state
      ctx.session.state = null;
      ctx.session.selectedToken = null;

      await ctx.reply('✅ *Sale process canceled.*', {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Home', 'HOME')]]),
      });
  } catch (error) {
      console.error('Error in cancelSellHandler:', error.message);
      await ctx.reply('❌ An error occurred while canceling the sale process. Please try again.');
  }
}

export function registerSolanaSellHandlers(bot) {
    bot.action('SELL_TOKEN', async (ctx) => {
        const userName = ctx.from.username || ctx.from.first_name;

        try {
            const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userName);

            if (!exists) {
                await ctx.reply('❌ No wallet found. Please generate a wallet first.', {
                    ...Markup.inlineKeyboard([[Markup.button.callback('Generate Wallet', 'GENERATE_WALLET')]]),
                });
                return;
            }

            ctx.session.solPublicKey = solPublicKey;
            ctx.session.solPrivateKey = solPrivateKey;

            const tokenBalances = await fetchTokenBalances(solPublicKey);

            if (tokenBalances.length === 0) {
                await ctx.reply('❌ No tokens found in your wallet to sell.', {
                    ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Home', 'HOME')]]),
                });
                return;
            }

            const tokenButtons = tokenBalances.map((token) => 
                [Markup.button.callback(`${token.name} (${token.amount.toFixed(token.decimals)})`, `SELL_TOKEN_${token.mint}`)]
            );

            await ctx.reply('💰 *Select a token to sell:*', {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([...tokenButtons, [Markup.button.callback('🏠 Home', 'HOME')]]),
            });
        } catch (error) {
            console.error('Error in SELL_TOKEN action:', error.message);
            await ctx.reply('❌ An error occurred. Please try again.');
        }
    });

    bot.action(/SELL_TOKEN_(.+)/, async (ctx) => {
        const mintAddress = ctx.match[1];
        const solPublicKey = ctx.session.solPublicKey;

        try {
            const tokenBalances = await fetchTokenBalances(solPublicKey);
            const selectedToken = tokenBalances.find((token) => token.mint === mintAddress);

            if (!selectedToken) {
                await ctx.reply('❌ Token not found in your wallet.');
                return;
            }

            ctx.session.selectedToken = {
                mint: mintAddress,
                name: selectedToken.name,
                balance: selectedToken.amount,
                decimals: selectedToken.decimals,
                symbol: selectedToken.name // Using name as symbol if not provided
            };

            // Use the displayTokenSellOptions function
            await displayTokenSellOptions(ctx, ctx.session.selectedToken, selectedToken.amount);
        } catch (error) {
            console.error('Error in token selection handler:', error.message);
            await ctx.reply('❌ An error occurred. Please try again.');
        }
    });

    bot.action(/SELL_(\d+)/, async (ctx) => {
        const percentage = parseInt(ctx.match[1]);
        const { solPublicKey, solPrivateKey, selectedToken } = ctx.session;

        if (!solPublicKey || !solPrivateKey || !selectedToken) {
            await ctx.reply('❌ Wallet details are missing. Please restart the process.');
            return;
        }

        const amount = (selectedToken.balance * percentage) / 100;
        await confirmSellHandler(ctx, solPublicKey, solPrivateKey, selectedToken.mint, amount);
    });

    bot.action('CUSTOM_SELL', async (ctx) => {
        ctx.session.state = 'WAITING_FOR_CUSTOM_SELL';
        await ctx.reply('✏️ Enter the percentage of your balance to sell (e.g., 30):');
    });

    bot.action(/CONFIRM_SELL_(\d+(\.\d+)?)(_true|_false)/, async (ctx) => {
        const [_, amount, __, jitoFlag] = ctx.match;
        const useJito = jitoFlag === '_true';
        const { solPublicKey, solPrivateKey, selectedToken } = ctx.session;

        if (!amount || isNaN(parseFloat(amount))) {
            await ctx.reply('❌ Invalid amount. Please restart the process and enter a valid amount.');
            return;
        }

        if (solPublicKey && solPrivateKey && selectedToken) {
            await executeSell(ctx, solPublicKey, solPrivateKey, selectedToken.mint, parseFloat(amount), useJito);
        } else {
            await ctx.reply('❌ Wallet details are missing. Please restart the process.');
        }
    });

    // Custom sell percentage text handler
    bot.on('text', async (ctx) => {
        if (ctx.session.state === 'WAITING_FOR_CUSTOM_SELL') {
            const percentage = parseFloat(ctx.message.text);
            const { solPublicKey, solPrivateKey, selectedToken } = ctx.session;

            if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
                await ctx.reply('❌ Invalid percentage. Please enter a value between 1 and 100.');
                return;
            }

            const amount = (selectedToken.balance * percentage) / 100;
            ctx.session.state = null; // Clear session state
            await confirmSellHandler(ctx, solPublicKey, solPrivateKey, selectedToken.mint, amount);
        }
    });

    bot.action('CANCEL_SELL', async (ctx) => {
        await cancelSellHandler(ctx);
    });
}