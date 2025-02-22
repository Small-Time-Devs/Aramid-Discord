import { generateWallet, checkUserWallet } from '../../db/dynamo.mjs';
import { fetchSolBalance, fetchTokenBalances } from '../../functions/utils.mjs';
import { sendMessageWithLogo, sendAndDeletePrevious, formatWalletDetailsNoBlance } from '../../functions/utils.mjs';
import { Markup } from 'telegraf';
import fs from 'fs';

/**
 * Show wallet details including SOL and token balances.
 * @param {object} ctx - Telegram context.
 * @param {string} publicKey - User's wallet public key.
 */
export async function showWalletDetails(ctx, publicKey) {
  try {
    const solBalance = await fetchSolBalance(publicKey);
    const tokenBalances = await fetchTokenBalances(publicKey);
    const walletDetails = formatWalletDetailsNoBlance(publicKey);

    let message = `💵 *Your Wallet Details:*\n\n`;
    message += `${walletDetails}\n`;

    if (tokenBalances.length > 0) {
      message += `- 📦 Token Balances:\n\n`;
      for (const token of tokenBalances) {
        const tokenLink = `https://dexscreener.com/solana/${token.mint}`;
        message += `  • [${token.name}](${tokenLink}): ${token.amount.toFixed(token.decimals)}\n\n`;
      }
    } else {
      message += `- 📦 Token Balances: No tokens found\n`;
    }
    message += `- 🌐 [Discord](https://discord.gg/smalltimedevs)` + ` | ` + `[Telegram](https://t.me/SmallTimeDevs)` + ` | ` + `[Website](https://www.smalltimedevs.com)\n`;

    message += `\nClick the buttons below for further actions.`;

    await sendAndDeletePrevious(ctx, message, [
      [Markup.button.callback('Show Private Key', 'SHOW_PRIVATE_KEY'), Markup.button.callback('Generate New Wallet', 'GENERATE_NEW_WALLET')],
      [Markup.button.callback('🔄 Refresh', 'REFRESH_WALLET'), Markup.button.callback('🏠 Home', 'HOME')],
    ]);
  } catch (error) {
    console.error('Error showing wallet details:', error);
    await sendAndDeletePrevious(ctx, '❌ An error occurred while fetching your wallet details. Please try again later.');
  }
}
  
  /**
   * Show the private key after confirmation.
   * @param {object} ctx - Telegram context.
   * @param {string} userName - User's Telegram username.
   */
  export async function handleShowPrivateKey(ctx, userName) {
    try {
      const { exists, publicKey, privateKey } = await checkUserWallet(userName);
  
      if (!exists) {
        await sendAndDeletePrevious(ctx, '❌ No wallet found. Please generate a wallet first.', [
          [Markup.button.callback('Back to Wallet Details', 'SHOW_WALLET')],
        ]);
        return;
      }
  
      await sendAndDeletePrevious(
        ctx,
        `⚠️ *Warning: Do not share this private key with anyone, not even support!*\n\n` +
        `Are you sure you want to view your private key?`,
        [
          [Markup.button.callback('OK, Show Private Key', 'CONFIRM_SHOW_PRIVATE_KEY')],
          [Markup.button.callback('Cancel', 'SHOW_WALLET')],
        ]
      );
    } catch (error) {
      console.error('Error in handleShowPrivateKey:', error);
      await sendAndDeletePrevious(ctx, '❌ An error occurred. Please try again.');
    }
  }
  
  /**
   * Confirm and display the private key.
   * @param {object} ctx - Telegram context.
   * @param {string} userName - User's Telegram username.
   */
  export async function confirmShowPrivateKey(ctx, userName) {
    try {
      const { exists, solPrivateKey } = await checkUserWallet(userName);
  
      if (!exists) {
        await sendAndDeletePrevious(ctx, '❌ No wallet found. Please generate a wallet first.', [
          [Markup.button.callback('Back to Wallet Details', 'SHOW_WALLET')],
        ]);
        return;
      }
  
      const message = `🔐 *Your Private Key:*\n\n` +
        `\`${solPrivateKey}\`\n\n` +
        `*Do not share this key with anyone!*`;
  
      await sendAndDeletePrevious(ctx, message, [
        [Markup.button.callback('Back to Wallet Details', 'SHOW_WALLET')],
      ]);
    } catch (error) {
      console.error('Error in confirmShowPrivateKey:', error);
      await sendAndDeletePrevious(ctx, '❌ An error occurred. Please try again.');
    }
  }

/**
 * Handle wallet generation confirmation and process.
 * @param {object} ctx - Telegram context.
 * @param {string} userName - User's Telegram username.
 */
export async function handleGenerateNewWallet(ctx, userName) {
    try {
      await sendAndDeletePrevious(
        ctx,
        `⚠️ *This action cannot be undone.*\n\n` +
        `If you generate a new wallet, your current wallet will be lost, and the team will not be able to recover it.\n\n` +
        `Are you sure you want to proceed?`,
        [
          [Markup.button.callback('Yes, Generate New Wallet', 'CONFIRM_GENERATE_NEW_WALLET')],
          [Markup.button.callback('Cancel', 'CANCEL_GENERATE_NEW_WALLET')],
        ]
      );
    } catch (error) {
      console.error('Error in handleGenerateNewWallet:', error);
      await sendAndDeletePrevious(ctx, '❌ An error occurred. Please try again.');
    }
}

/**
 * Confirm and generate a new wallet.
 * @param {object} ctx - Telegram context.
 * @param {string} userName - User's Telegram username.
 */
// TODO: Need to add all chains for the wallet generation when picking to generate a new wallet
export async function confirmGenerateNewWallet(ctx, userName) {
    try {
      const newWallet = await generateWallet(userName);
      const solBalance = await fetchSolBalance(newWallet.solPublicKey);
  
      const message = `🎉 *Your new wallet has been created successfully!*\n\n` +
        `🔑 *Save this private key securely!*\n` +
        `New Private Key (Base58):\n\`${newWallet.solPrivateKey}\`\n\n` +
        `Your private key is crucial for accessing your wallet. If lost, it cannot be recovered.\n\n` +
        `New Public Key: [${newWallet.solPublicKey}](https://solscan.io/account/${newWallet.solPublicKey})\n` +
        `Balance: ${solBalance.toFixed(2)} SOL\n\n`;
        `🌐 [Discord](https://discord.gg/smalltimedevs)` + `|` + `[Telegram](https://t.me/SmallTimeDevs)` + `|` +`[Website](https://www.smalltimedevs.com)\n`;
  
      await sendAndDeletePrevious(ctx, message, [
        [Markup.button.callback('Home', 'HOME')],
      ]);
    } catch (error) {
      console.error('Error in confirmGenerateNewWallet:', error);
      await sendAndDeletePrevious(ctx, '❌ An error occurred while generating your wallet. Please try again.');
    }
}

/**
 * Cancel wallet generation process.
 * @param {object} ctx - Telegram context.
 */
export async function cancelGenerateNewWallet(ctx) {
  try {
    await sendAndDeletePrevious(
      ctx,
      `✅ *Wallet generation canceled.*\n\nYou can continue using your existing wallet.`,
      [
        [Markup.button.callback('Back to Wallet Details', 'SHOW_WALLET')],
        [Markup.button.callback('Home', 'HOME')],
      ]
    );
  } catch (error) {
    console.error('Error in cancelGenerateNewWallet:', error);
    await sendAndDeletePrevious(ctx, '❌ An error occurred. Please try again.');
  }
}
