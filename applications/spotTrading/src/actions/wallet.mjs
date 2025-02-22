import { generateSolanaWallet, checkUserWallet, updateSolanaWithdrawAddress, updateXrpWithdrawAddress, getWithdrawAddresses, get2FASecret } from '../../../../src/db/dynamo.mjs';
import { require2FASetup, verify2FACode } from '../../../../src/2fa/2fa.mjs';
import { globalStaticConfig } from '../../../../src/globals/globals.mjs';
import { fetchSolBalance, fetchTokenBalances, fetchTokenPrice, withdrawSol, fetchMinimumRentExemptionBalance } from '../chains/solana/functions/utils.mjs';
import { fetchXrpBalance, initializeXrpClient } from '../chains/xrp/functions/utils.mjs';
import xrpl from "xrpl";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

// This is the show wallet button
export async function showWalletDetails(ctx) {
  try {
    const userID = ctx.from.id;
    const userName = ctx.from.username || ctx.from.first_name;
    const xrpEndPoint = globalStaticConfig.rpcNodeXrp;
    const client = await initializeXrpClient(xrpEndPoint);
    const { exists, solPublicKey, solPrivateKey, xrpPublicKey, xrpPrivateKey } = await checkUserWallet(userID, userName);
    const { solanaWithdrawAddress, xrpWithdrawAddress } = await getWithdrawAddresses(userID);

    // Solana Balance Checks
    const solBalance = await fetchSolBalance(solPublicKey);
    const solanaTokenBalances = await fetchTokenBalances(solPublicKey); // Sol tokens only for now
    const solPrice = await fetchTokenPrice(globalStaticConfig.solMint);
    const totalDollarAmountSol = solBalance * solPrice;

    // XRP Balance Checks
    let xrpBalance = 0;
    try {
      const wallet = xrpl.Wallet.fromSeed(xrpPrivateKey);
      console.log(`XRPL Wallet Address: ${wallet.classicAddress}`);

      xrpBalance = await fetchXrpBalance(wallet, client);
      console.log(`Fetched XRP Balance: ${xrpBalance}`);
    } catch (error) {
      console.warn(`Failed to fetch XRP balance for ${xrpPublicKey}:`, error.message);
    }
    const xrpPrice = await fetchTokenPrice(globalStaticConfig.xrpMint);
    const totalDollarAmountXrp = xrpBalance * xrpPrice;

    const walletDetails = formatWalletDetailsNoBlance(solPublicKey, xrpPublicKey);

    let message = `💵 *Your Wallet Details:*\n\n`;
    message += `- 🌐 Solana Bot Wallet: ${solPublicKey})\n`;
    if (solanaWithdrawAddress) {
      message += `- 🏦 *Solana Withdraw Address:* ${solanaWithdrawAddress})\n\n`;
    } else {
      message += `\n`;
    }

    message += `- 🌐 XRPL Bot Wallet: ${xrpPublicKey})\n`;
    if (xrpWithdrawAddress) {
      message += `- 🏦 *XRP Withdraw Address:* ${xrpWithdrawAddress})\n\n`;
    } else {
      message += `\n`;
    }

    let totalTokenValueInUSD = totalDollarAmountSol;
    let totalTokenValueInSol = solBalance;

    // Figure out all solana balances
    const filteredTokenBalances = solanaTokenBalances.filter(token => token.amount > 0);
    if (filteredTokenBalances.length > 0) {
      message += `- 📦 Solana Token Balances:\n\n`;
      for (const token of filteredTokenBalances) {
        const tokenLink = `https://dexscreener.com/solana/${token.mint}`;
        const tokenPrice = await fetchTokenPrice(token.mint);
        const tokenValueInUSD = token.amount * tokenPrice;
        const tokenValueInSol = tokenValueInUSD / solPrice;
        totalTokenValueInUSD += tokenValueInUSD;
        totalTokenValueInSol += tokenValueInSol;
        message += `  • [${token.name}](${tokenLink}): ${token.amount.toFixed(token.decimals)} (${tokenValueInUSD.toFixed(2)} USD, ${tokenValueInSol.toFixed(6)} SOL)\n`;
        message += `    - Token Price: ${tokenPrice.toFixed(4)} USD\n\n`;
      }
    } else {
      message += `- 📦 Solana Token Balances: No tokens found\n`;
    }

    message += `💵 *Total Solana Wallet Balance:* **${totalTokenValueInSol.toFixed(2)}** SOL (**${totalTokenValueInUSD.toFixed(2)} USD**)\n`;
    message += `💰 *Solana Wallet Balance:* **${solBalance.toFixed(2)}** SOL (**${totalDollarAmountSol.toFixed(2)} USD**)\n`;

    message += `💰 *XRP Wallet Balance:* **${xrpBalance.toFixed(2)}** XRP (**${totalDollarAmountXrp.toFixed(2)} USD**)\n`;

    const connection = new Connection(globalStaticConfig.rpcNode);
    const rentExemptionBalance = await fetchMinimumRentExemptionBalance(connection);
    const rentExemptionBalanceInSol = rentExemptionBalance / LAMPORTS_PER_SOL;

    message += `- 🌐 [Discord](https://discord.gg/smalltimedevs)` + ` | ` + `[Telegram](https://t.me/SmallTimeDevs)` + ` | ` + `[Website](https://www.smalltimedevs.com)\n`;
    message += `\n⚠️ *Disclaimer:*\n`;
    message += `To keep your Solana account open and usable, a minimum balance of **${rentExemptionBalanceInSol.toFixed(6)} SOL** is required. This amount is needed to cover the rent exemption fee.\n`;
    message += `\nClick the buttons below for further actions.`;

    await sendAndDeletePreviousWithoutLogo(ctx, message, [
      [Markup.button.callback('Show Private Key', 'SHOW_PRIVATE_KEY'), Markup.button.callback('Generate New Wallet', 'GENERATE_NEW_WALLET')],
      [Markup.button.callback('Send Solana', 'send_solana'), Markup.button.callback('Send Token', 'SEND_TOKEN')],
      [Markup.button.callback('Set Solana Withdraw Address', 'SET_SOLANA_WITHDRAW_ADDRESS'), Markup.button.callback('Set XRP Withdraw Address', 'SET_XRP_WITHDRAW_ADDRESS')],
      [Markup.button.callback('🔄 Refresh', 'REFRESH_WALLET'), Markup.button.callback('🏠 Home', 'HOME')],
    ]);
  } catch (error) {
    console.error('Error showing wallet details:', error);
    await sendAndDeletePreviousWithoutLogo(ctx, '❌ An error occurred while fetching your wallet details. Please try again later.');
  }
}  

export async function handleCopyPublicKey(ctx, publicKey) {
  try {
    await ctx.telegram.sendMessage(ctx.chat.id, `🔑 Public Key copied to clipboard: \`${publicKey}\``);
  } catch (error) {
    console.error('Error copying public key:', error);
    await sendAndDeletePrevious(ctx, '❌ An error occurred while copying the public key. Please try again.');
  }
}

// --------------------------------------------------------------------------------------------- //
// TODO: Need to add all chains for the wallet generation when picking to generate a new wallet  //
// --------------------------------------------------------------------------------------------- //

export async function handleShowPrivateKey(ctx) {
  const userID = ctx.from.id;
  const secret = await get2FASecret(userID);
  if (!secret) {
    await sendAndDeletePrevious(ctx, '❌ 2FA is not enabled. Please enable 2FA first by using the /enable2fa command.', [
      [Markup.button.callback('Back to Wallet Details', 'SHOW_WALLET')],
    ]);
    return;
  }
  await ctx.reply('🔒 Please enter your 2FA code:');
  ctx.session.awaiting2FA = true;
  ctx.session.next = async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('❌ Invalid input. Please try again.');
      return;
    }
    const isValid = await verify2FACode(userID, ctx.message.text);
    if (!isValid) {
      await ctx.reply('❌ Invalid 2FA code. Returning to wallet details.');
      await showWalletDetails(ctx);
      return;
    }
    try {
      const { exists } = await checkUserWallet(userID);

      if (exists) {
        await sendAndDeletePrevious(
          ctx,
          `⚠️ *Warning: Do not share this private key with anyone, not even support!*\n\n` +
          `Are you sure you want to view your private key?`,
          [
            [Markup.button.callback('OK, Show Private Key', 'CONFIRM_SHOW_PRIVATE_KEY')],
            [Markup.button.callback('Cancel', 'SHOW_WALLET')],
          ]
        );
      } else {
        await ctx.reply('❌ No wallet found. Please generate a wallet first.');
      }
    } catch (error) {
      console.error('Error in handleShowPrivateKey:', error);
      await ctx.reply('❌ An error occurred while fetching your private keys. Please try again later.');
    }
  };
}

export async function confirmShowPrivateKey(ctx) {
  try {
    const userID = ctx.from.id;
    const { exists, solPrivateKey, xrpPrivateKey } = await checkUserWallet(userID);

    if (!exists) {
      await sendAndDeletePrevious(ctx, '❌ No wallet found. Please generate a wallet first.', [
        [Markup.button.callback('Back to Wallet Details', 'SHOW_WALLET')],
      ]);
      return;
    }

    const message = `🔐 *Your Private Key:*\n\n` +
      ` Your solana private key is: \n` +
      `\`${solPrivateKey}\`\n\n` +
      ` Your XRP Ledger private key is: \n` +
      `\`${xrpPrivateKey}\`\n\n` +
      `*Do not share this key with anyone!*`;

    await sendAndDeletePrevious(ctx, message, [
      [Markup.button.callback('Back to Wallet Details', 'SHOW_WALLET')],
    ]);
  } catch (error) {
    console.error('Error in confirmShowPrivateKey:', error);
    await sendAndDeletePrevious(ctx, '❌ An error occurred. Please try again.');
  }
}

export async function handleGenerateNewWallet(ctx) {
  try {
    const userID = ctx.from.id;
    const secret = await get2FASecret(userID);
    if (!secret) {
      await sendAndDeletePrevious(ctx, '❌ 2FA is not enabled. Please enable 2FA first by using the /enable2fa command.', [
        [Markup.button.callback('Back to Wallet Details', 'SHOW_WALLET')],
      ]);
      return;
    }
    await ctx.reply('🔒 Please enter your 2FA code:');
    ctx.session.awaiting2FA = true;
    ctx.session.next = async () => {
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('❌ Invalid input. Please try again.');
        return;
      }
      const isValid = await verify2FACode(userID, ctx.message.text);
      if (!isValid) {
        await ctx.reply('❌ Invalid 2FA code. Returning to wallet details.');
        await showWalletDetails(ctx);
        return;
      }
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
    };
  } catch (error) {
    console.error('Error in handleGenerateNewWallet:', error);
    await sendAndDeletePrevious(ctx, '❌ An error occurred. Please try again.');
  }
}

// TODO Need to add XRP wallet generation
export async function confirmGenerateNewWallet(ctx) {
    try {
      const userID = ctx.from.id;
      const newSolanaWallets = generateSolanaWallet(userID);
      const solBalance = await fetchSolBalance(newSolanaWallets.solPublicKey);
  
      const message = `🎉 *Your new wallet has been created successfully!*\n\n` +
        `🔑 *Save this private key securely!*\n` +
        `New Private Key (Base58):\n\`${newSolanaWallets.solPrivateKey}\`\n\n` +
        `Your private key is crucial for accessing your wallet. If lost, it cannot be recovered.\n\n` +
        `New Public Key: [${newSolanaWallets.solPublicKey}](https://solscan.io/account/${newSolanaWallets.solPublicKey})\n` +
        `Balance: ${solBalance.toFixed(2)} SOL\n\n`;
        `🌐 [Discord](https://discord.gg/smalltimedevs)` + `|` + `[Telegram](https://t.me/SmallTimeDevs)` +`[Website](https://www.smalltimedevs.com)\n`;
  
      await sendAndDeletePrevious(ctx, message, [
        [Markup.button.callback('Home', 'HOME')],
      ]);
    } catch (error) {
      console.error('Error in confirmGenerateNewWallet:', error);
      await sendAndDeletePrevious(ctx, '❌ An error occurred while generating your wallet. Please try again.');
    }
}

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

export async function handleSetSolanaWithdrawAddress(ctx) {
  try {
    const userID = ctx.from.id;
    const userName = ctx.from.username || ctx.from.first_name;
    console.log('Entering handleSetSolanaWithdrawAddress', userName); // Debug log
    const secret = await get2FASecret(userID);
    if (!secret) {
      await ctx.reply('❌ 2FA is not enabled. Please enable 2FA first by using the /enable2fa command.');
      return;
    }
    ctx.scene.enter('set_solana_withdraw_address');
  } catch (error) {
    if (error.message === '2FA is not enabled for this user.') {
      await ctx.reply('❌ 2FA is not enabled. Please enable 2FA first by using the /enable2fa command.');
    } else {
      console.error('Error in handleSetSolanaWithdrawAddress:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }
}

export const setSolanaWithdrawAddressWizard = new Scenes.WizardScene('set_solana_withdraw_address', async (ctx) => {
    await ctx.reply('🔒 Please enter your 2FA code:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    const userID = ctx.from.id;
    const userName = ctx.from.username || ctx.from.first_name;
    const isValid = await verify2FACode(userID, ctx.message.text);

    if (isValid) {
      await ctx.reply('✅ 2FA verified successfully. Please enter the Solana address to set as your withdraw address or type "exit" to cancel:');
      return ctx.wizard.next();
    } else {
      await ctx.reply('❌ Invalid 2FA code. Please try again.');
      return ctx.wizard.selectStep(0);
    }
  },
  async (ctx) => {
    try {
      const userID = ctx.from.id;
      const userName = ctx.from.username || ctx.from.first_name;
      const withdrawAddress = ctx.message?.text?.trim();

      if (withdrawAddress.toLowerCase() === 'exit') {
        await ctx.reply('❌ Withdraw address setup canceled.');
        await showWalletDetails(ctx);
        return ctx.scene.leave();
      }

      console.log(`[${userName}] Entered Solana withdraw address: ${withdrawAddress}`); // Debug log

      if (!withdrawAddress || !PublicKey.isOnCurve(withdrawAddress)) {
        await ctx.reply('❌ Invalid address. Please try again.');
        return ctx.wizard.selectStep(1);
      }

      await updateSolanaWithdrawAddress(userID, withdrawAddress);
      await ctx.reply('✅ Solana withdraw address updated.');
      await showWalletDetails(ctx);
      return ctx.scene.leave();
    } catch (error) {
      console.error('Error in setSolanaWithdrawAddressWizard:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }
);

export async function handleSetXrpWithdrawAddress(ctx) {
  try {
    const userID = ctx.from.id;
    const userName = ctx.from.username || ctx.from.first_name;
    console.log('Entering handleSetXrpWithdrawAddress', userName); // Debug log
    const secret = await get2FASecret(userID);
    if (!secret) {
      await ctx.reply('❌ 2FA is not enabled. Please enable 2FA first by using the /enable2fa command.');
      return;
    }
    ctx.scene.enter('set_xrp_withdraw_address');
  } catch (error) {
    if (error.message === '2FA is not enabled for this user.') {
      await ctx.reply('❌ 2FA is not enabled. Please enable 2FA first by using the /enable2fa command.');
    } else {
      console.error('Error in handleSetXrpWithdrawAddress:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }
}

export const setXrpWithdrawAddressWizard = new Scenes.WizardScene('set_xrp_withdraw_address',
  async (ctx) => {
    await ctx.reply('🔒 Please enter your 2FA code:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    const userID = ctx.from.id;
    const userName = ctx.from.username || ctx.from.first_name;
    const isValid = await verify2FACode(userID, ctx.message.text);

    if (isValid) {
      await ctx.reply('✅ 2FA verified successfully. Please enter the XRPL address to set as your withdraw address or type "exit" to cancel:');
      return ctx.wizard.next();
    } else {
      await ctx.reply('❌ Invalid 2FA code. Please try again.');
      return ctx.wizard.selectStep(0);
    }
  },
  async (ctx) => {
    try {
      const userID = ctx.from.id;
      const userName = ctx.from.username || ctx.from.first_name;
      const withdrawAddress = ctx.message?.text?.trim();

      if (withdrawAddress.toLowerCase() === 'exit') {
        await ctx.reply('❌ Withdraw address setup canceled.');
        await showWalletDetails(ctx);
        return ctx.scene.leave();
      }

      console.log(`[${userName}] Entered XRPL withdraw address: ${withdrawAddress}`); // Debug log

      // Validate XRP address
      if (!xrpl.isValidClassicAddress(withdrawAddress)) {
        await ctx.reply('❌ Invalid XRP address. Please try again.');
        return ctx.wizard.selectStep(1);
      }

      await updateXrpWithdrawAddress(userID, withdrawAddress);
      await ctx.reply('✅ XRP withdraw address updated.');
      await showWalletDetails(ctx);
      return ctx.scene.leave();
    } catch (error) {
      console.error('Error in setXrpWithdrawAddressWizard:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }
);

export async function handleSendSolana(ctx) {
  try {
    const userID = ctx.from.id;
    const userName = ctx.from.username || ctx.from.first_name;
    const secret = await get2FASecret(userID);
    if (!secret) {
      await ctx.reply('❌ 2FA is not enabled. Please enable 2FA first by using the /enable2fa command.');
      return;
    }
    await ctx.reply('🔒 Please enter your 2FA code:');
    ctx.session.awaiting2FA = true;
    ctx.session.next = async (ctx) => {
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('❌ Invalid input. Please try again.');
        return;
      }
      const isValid = await verify2FACode(userID, ctx.message.text);
      if (!isValid) {
        await ctx.reply('❌ Invalid 2FA code. Returning to wallet details.');
        await showWalletDetails(ctx);
        return;
      }

      const { solPublicKey } = await checkUserWallet(userID);
      const solBalance = await fetchSolBalance(solPublicKey);
      const connection = new Connection(globalStaticConfig.rpcNode);
      const rentExemptionBalance = await fetchMinimumRentExemptionBalance(connection);
      const rentExemptionBalanceInSol = rentExemptionBalance / LAMPORTS_PER_SOL;
      const availableBalance = solBalance - rentExemptionBalanceInSol;

      await ctx.reply(`(Available: ${availableBalance.toFixed(2)} SOL)`);

      ctx.scene.enter('send_solana');
    };
  } catch (error) {
    if (error.message === '2FA is not enabled for this user.') {
      await ctx.reply('❌ 2FA is not enabled. Please enable 2FA first by using the /enable2fa command.');
    } else {
      console.error('Error in handleSendSolana:', error);
      await sendAndDeletePrevious(ctx, '❌ An error occurred. Please try again.');
    }
  }
}

export const sendSolanaWizard = new Scenes.WizardScene('send_solana',
  async (ctx) => {
    await ctx.reply(`🛠️ Please enter the amount of Solana you want to send to your withdraw address or type "exit" to cancel:`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    try {
      const userID = ctx.from.id;
      const userName = ctx.from.username || ctx.from.first_name;
      const amountText = ctx.message?.text?.trim();

      if (amountText.toLowerCase() === 'exit') {
        await ctx.reply('❌ Withdraw canceled.');
        await showWalletDetails(ctx);
        return ctx.scene.leave();
      }

      const amount = parseFloat(amountText);
      console.log(`[${userName}] Entered amount to send: ${amount}`); // Debug log

      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Invalid amount. Please enter a valid number.');
        return ctx.wizard.selectStep(0);
      }

      const { solPrivateKey, solPublicKey } = await checkUserWallet(userID);
      const { solanaWithdrawAddress } = await getWithdrawAddresses(userID);

      if (!solanaWithdrawAddress) {
        await ctx.reply('❌ Withdraw address not set. Please set your Solana withdraw address first.');
        return ctx.scene.leave();
      }

      const solBalance = await fetchSolBalance(solPublicKey);
      const connection = new Connection(globalStaticConfig.rpcNode);
      const rentExemptionBalance = await fetchMinimumRentExemptionBalance(connection);
      const rentExemptionBalanceInSol = rentExemptionBalance / LAMPORTS_PER_SOL;
      const availableBalance = solBalance - rentExemptionBalanceInSol;

      if (amount > availableBalance) {
        await ctx.reply(`❌ Insufficient balance. You can only withdraw up to ${availableBalance.toFixed(2)} SOL.`);
        return ctx.wizard.selectStep(0);
      }

      const txHash = await withdrawSol(solPrivateKey, solanaWithdrawAddress, amount);
      await ctx.reply(`✅ Successfully sent ${amount} SOL to ${solanaWithdrawAddress}.\n\n🔗 [View Transaction on Solscan](https://solscan.io/tx/${txHash})`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Buy Tokens', 'SOLANA_TOKEN_BUY'), Markup.button.callback('Sell Tokens', 'SOLANA_TOKEN_SELL')],
          [Markup.button.callback('Wallet Details', 'SHOW_WALLET'), Markup.button.callback('Home', 'HOME')],
        ]),
      });
      return ctx.scene.leave();
    } catch (error) {
      console.error('Error in sendSolanaWizard:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }
);

export function registerWalletHandlers(bot) {
  // Generate New Wallet
  bot.action('GENERATE_NEW_WALLET', async (ctx) => {
    await ctx.deleteMessage();
    const userName = ctx.from.username || ctx.from.first_name;
    await handleGenerateNewWallet(ctx, userName);
  });

  // Confirm Generate New Wallet
  bot.action('CONFIRM_GENERATE_NEW_WALLET', async (ctx) => {
    await ctx.deleteMessage();
    const userName = ctx.from.username || ctx.from.first_name;
    await confirmGenerateNewWallet(ctx, userName);
  });

  // Cancel Generate New Wallet
  bot.action('CANCEL_GENERATE_NEW_WALLET', async (ctx) => {
    await ctx.deleteMessage();
    await cancelGenerateNewWallet(ctx);
  });

  // Show Private Key
  bot.action('SHOW_PRIVATE_KEY', async (ctx) => {
    await ctx.deleteMessage();
    const userName = ctx.from.username || ctx.from.first_name;
    await handleShowPrivateKey(ctx, userName);
  });

  // Confirm Show Private Key
  bot.action('CONFIRM_SHOW_PRIVATE_KEY', async (ctx) => {
    await ctx.deleteMessage();
    const userName = ctx.from.username || ctx.from.first_name;
    await confirmShowPrivateKey(ctx, userName);
  });

  // Set Solana Withdraw Address
  bot.action('SET_SOLANA_WITHDRAW_ADDRESS', async (ctx) => {
    await ctx.deleteMessage();
    await handleSetSolanaWithdrawAddress(ctx);
  });

  // Set XRP Withdraw Address
  bot.action('SET_XRP_WITHDRAW_ADDRESS', async (ctx) => {
    await ctx.deleteMessage();
    await handleSetXrpWithdrawAddress(ctx);
  });

  // Send Solana
  bot.action('send_solana', async (ctx) => {
    await ctx.deleteMessage();
    await handleSendSolana(ctx);
  });

  // Refresh Wallet
  bot.action('REFRESH_WALLET', async (ctx) => {
    await ctx.deleteMessage();
    const userID = ctx.from.id;
    const userName = ctx.from.username || ctx.from.first_name;
    try {
      const { exists, solPublicKey } = await checkUserWallet(userID, userName);
      if (exists) {
        await showWalletDetails(ctx, solPublicKey); // Refresh wallet details
      } else {
        await sendAndDeletePrevious(ctx,
          `❌ *No wallet found.*\n\nPlease generate a wallet first.`,
          [[Markup.button.callback('Generate Wallet', 'GENERATE_WALLET')]]
        );
      }
    } catch (error) {
      console.error('Error refreshing wallet details:', error);
      await ctx.reply('❌ An error occurred while refreshing your wallet details. Please try again later.');
    }
  });
}

export async function showWalletDetails(interaction) {
    try {
        const { exists, solPublicKey, xrpPublicKey } = await checkUserWallet(
            interaction.user.id,
            interaction.user.username
        );

        if (!exists) {
            const embed = new EmbedBuilder()
                .setTitle('No Wallet Found')
                .setDescription('Please generate a wallet first.')
                .setColor(0xFF0000);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('GENERATE_WALLET')
                        .setLabel('Generate Wallet')
                        .setStyle(ButtonStyle.Primary)
                );

            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        const solBalance = await fetchSolBalance(solPublicKey);
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        const { solanaWithdrawAddress, xrpWithdrawAddress } = await getWithdrawAddresses(interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle('Your Wallet Details')
            .setColor(0x0099FF)
            .addFields(
                { name: 'Solana Wallet', value: solPublicKey },
                { name: 'SOL Balance', value: `${solBalance.toFixed(4)} SOL` },
                { name: 'XRP Wallet', value: xrpPublicKey }
            );

        if (solanaWithdrawAddress) {
            embed.addFields({ name: 'Solana Withdraw Address', value: solanaWithdrawAddress });
        }
        if (xrpWithdrawAddress) {
            embed.addFields({ name: 'XRP Withdraw Address', value: xrpWithdrawAddress });
        }

        // Add token balances if any
        if (tokenBalances.length > 0) {
            const tokenList = tokenBalances
                .map(token => `${token.name}: ${token.amount.toFixed(token.decimals)}`)
                .join('\n');
            embed.addFields({ name: 'Token Balances', value: tokenList });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('SHOW_PRIVATE_KEY')
                    .setLabel('Show Private Key')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('GENERATE_NEW_WALLET')
                    .setLabel('Generate New Wallet')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('REFRESH_WALLET')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
        console.error('Error showing wallet details:', error);
        await interaction.reply({
            content: '❌ An error occurred while fetching your wallet details.',
            ephemeral: true
        });
    }
}

export async function handleWithdrawAddress(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('withdraw_address_modal')
        .setTitle('Set Withdraw Address');

    const addressInput = new TextInputBuilder()
        .setCustomId('address_input')
        .setLabel('Enter the withdraw address')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(addressInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

export async function handleSendSolana(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('send_solana_modal')
        .setTitle('Send Solana');

    const amountInput = new TextInputBuilder()
        .setCustomId('amount_input')
        .setLabel('Enter amount to send')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(amountInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// Replace function registrations with Discord event handlers
export function registerWalletHandlers(client) {
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;

        switch (interaction.customId) {
            case 'GENERATE_NEW_WALLET':
                await handleGenerateNewWallet(interaction);
                break;
            case 'SHOW_PRIVATE_KEY':
                await handleShowPrivateKey(interaction);
                break;
            case 'SET_SOLANA_WITHDRAW_ADDRESS':
                await handleWithdrawAddress(interaction);
                break;
            case 'SEND_SOLANA':
                await handleSendSolana(interaction);
                break;
            // Add other button handlers...
        }
    });

    // Handle modal submissions
    client.on('interactionCreate', async interaction => {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === 'withdraw_address_modal') {
            const address = interaction.fields.getTextInputValue('address_input');
            // Handle withdraw address submission
            await updateSolanaWithdrawAddress(interaction.user.id, address);
            await interaction.reply({ content: 'Withdraw address updated!', ephemeral: true });
        }

        if (interaction.customId === 'send_solana_modal') {
            const amount = interaction.fields.getTextInputValue('amount_input');
            // Handle send Solana submission
            // Add your send Solana logic here
            await interaction.reply({ content: `Sending ${amount} SOL...`, ephemeral: true });
        }
    });
}
