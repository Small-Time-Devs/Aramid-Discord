import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
  } from 'discord.js';
  import { sendApplicationMenu, sendChainSelectionForApp } from '../utils/discordMessages.mjs';
  import { fetchTokenDetails, fetchTokenPrice } from '../../applications/chains/solana/spotTrading/functions/utils.mjs';
  import { checkUserWallet } from '../db/dynamo.mjs';
  import { fetchSolBalance, fetchTokenBalances } from '../../applications/chains/solana/spotTrading/functions/utils.mjs';
  import { getTradeSettings, saveTradeSettings } from '../db/dynamo.mjs';
  
  export async function handleApplicationInteractions(interaction) {
    try {
      // Handle button interactions
      if (interaction.isButton()) {
        switch (interaction.customId) {
          case 'applications':
            await sendApplicationMenu(interaction);
            break;
  
          case 'spot_trading':
            await sendChainSelectionForApp(interaction, 'spot');
            break;
  
          case 'market_maker':
            await sendChainSelectionForApp(interaction, 'market');
            break;
  
          case 'spot_solana':
            await showSolanaSpotTradingMenu(interaction);
            break;
  
          case 'spot_xrp':
            await interaction.update({
              content: 'Starting XRP spot trading...',
              components: [],
              embeds: []
            });
            break;
  
          case 'market_solana':
            await interaction.update({
              content: 'Starting Solana market making...',
              components: [],
              embeds: []
            });
            break;
  
          case 'market_xrp':
            await interaction.update({
              content: 'Starting XRP market making...',
              components: [],
              embeds: []
            });
            break;
  
          case 'back_to_applications':
            await sendApplicationMenu(interaction);
            break;
  
          case 'trade_settings':
            await handleTradeSettings(interaction);
            break;
  
          case 'set_quick_buy':
            await handleQuickBuyOptions(interaction);
            break;

          case 'set_quick_sell':
            await handleQuickSellOptions(interaction);
            break;

          // Quick buy amount selections
          case 'quick_buy_min':
            await saveTradeSettings(interaction.user.id, { minQuickBuy: 0.1 });
            await interaction.reply({ content: '✅ Minimum quick buy set to 0.1 SOL', ephemeral: true });
            break;

          case 'quick_buy_med':
            await saveTradeSettings(interaction.user.id, { mediumQuickBuy: 0.5 });
            await interaction.reply({ content: '✅ Medium quick buy set to 0.5 SOL', ephemeral: true });
            break;

          case 'quick_buy_large':
            await saveTradeSettings(interaction.user.id, { largeQuickBuy: 1.0 });
            await interaction.reply({ content: '✅ Large quick buy set to 1.0 SOL', ephemeral: true });
            break;

          // Quick sell amount selections
          case 'quick_sell_min':
            await saveTradeSettings(interaction.user.id, { minQuickSell: 0.1 });
            await interaction.reply({ content: '✅ Minimum quick sell set to 0.1 SOL', ephemeral: true });
            break;

          case 'quick_sell_med':
            await saveTradeSettings(interaction.user.id, { mediumQuickSell: 0.5 });
            await interaction.reply({ content: '✅ Medium quick sell set to 0.5 SOL', ephemeral: true });
            break;

          case 'quick_sell_large':
            await saveTradeSettings(interaction.user.id, { largeQuickSell: 1.0 });
            await interaction.reply({ content: '✅ Large quick sell set to 1.0 SOL', ephemeral: true });
            break;

          case 'set_min_buy':
            const minBuyModal = new ModalBuilder()
                .setCustomId('min_buy_modal')
                .setTitle('Set Minimum Quick Buy');

            minBuyModal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('min_buy_amount')
                        .setLabel('Enter amount in SOL')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0.1')
                        .setRequired(true)
                )
            );

            await interaction.showModal(minBuyModal);
            break;

          case 'set_med_buy':
            const medBuyModal = new ModalBuilder()
                .setCustomId('med_buy_modal')
                .setTitle('Set Medium Quick Buy');

            medBuyModal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('med_buy_amount')
                        .setLabel('Enter amount in SOL')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0.5')
                        .setRequired(true)
                )
            );

            await interaction.showModal(medBuyModal);
            break;

          case 'set_large_buy':
            const largeBuyModal = new ModalBuilder()
                .setCustomId('large_buy_modal')
                .setTitle('Set Large Quick Buy');

            largeBuyModal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('large_buy_amount')
                        .setLabel('Enter amount in SOL')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('1.0')
                        .setRequired(true)
                )
            );

            await interaction.showModal(largeBuyModal);
            break;
        }
      }
  
      // Handle modal submissions
      if (interaction.isModalSubmit()) {
        console.log('Modal submitted:', {
          customId: interaction.customId,
          fields: Array.from(interaction.fields.values()).map(f => f.value)
        });
  
        if (interaction.customId === 'quick_buy_modal') {
          try {
            const minBuy = interaction.fields.getTextInputValue('min_buy');
            const medBuy = interaction.fields.getTextInputValue('med_buy');
            const largeBuy = interaction.fields.getTextInputValue('large_buy');
  
            console.log('Processing quick buy values:', { minBuy, medBuy, largeBuy });
  
            const minBuyVal = parseFloat(minBuy);
            const medBuyVal = parseFloat(medBuy);
            const largeBuyVal = parseFloat(largeBuy);
  
            if (isNaN(minBuyVal) || isNaN(medBuyVal) || isNaN(largeBuyVal)) {
              throw new Error('One or more values are not valid numbers.');
            }
  
            // Database call commented out for testing
            // await saveTradeSettings(interaction.user.id, {
            //   minQuickBuy: minBuyVal,
            //   mediumQuickBuy: medBuyVal,
            //   largeQuickBuy: largeBuyVal
            // });
  
            console.log('Quick buy settings processed successfully');
  
            await interaction.reply({
              content: `✅ Quick buy settings processed:\n• Min: ${minBuyVal} SOL\n• Medium: ${medBuyVal} SOL\n• Large: ${largeBuyVal} SOL`,
              ephemeral: true
            });
          } catch (error) {
            console.error('Quick buy settings error:', error);
            await interaction.reply({
              content: `❌ Failed to process settings: ${error.message}`,
              ephemeral: true
            });
          }
        }
  
        if (interaction.customId === 'quick_sell_modal') {
          try {
            const minSell = interaction.fields.getTextInputValue('min_sell');
            const medSell = interaction.fields.getTextInputValue('med_sell');
            const largeSell = interaction.fields.getTextInputValue('large_sell');
  
            console.log('Processing quick sell values:', { minSell, medSell, largeSell });
  
            const minSellVal = parseFloat(minSell);
            const medSellVal = parseFloat(medSell);
            const largeSellVal = parseFloat(largeSell);
  
            if (isNaN(minSellVal) || isNaN(medSellVal) || isNaN(largeSellVal)) {
              throw new Error('One or more values are not valid numbers.');
            }
  
            // Database call commented out for testing
            // await saveTradeSettings(interaction.user.id, {
            //   minQuickSell: minSellVal,
            //   mediumQuickSell: medSellVal,
            //   largeQuickSell: largeSellVal
            // });
  
            console.log('Quick sell settings processed successfully');
  
            await interaction.reply({
              content: `✅ Quick sell settings processed:\n• Min: ${minSellVal} SOL\n• Medium: ${medSellVal} SOL\n• Large: ${largeSellVal} SOL`,
              ephemeral: true
            });
          } catch (error) {
            console.error('Quick sell settings error:', error);
            await interaction.reply({
              content: `❌ Failed to process settings: ${error.message}`,
              ephemeral: true
            });
          }
        }

        switch (interaction.customId) {
          case 'min_buy_modal':
              try {
                  const amount = parseFloat(interaction.fields.getTextInputValue('min_buy_amount'));
                  if (isNaN(amount)) throw new Error('Please enter a valid number');
                  
                  await saveTradeSettings(interaction.user.id, { minQuickBuy: amount });
                  await interaction.reply({
                      content: `✅ Minimum quick buy amount set to ${amount} SOL`,
                      ephemeral: true
                  });
              } catch (error) {
                  await interaction.reply({
                      content: `❌ Error: ${error.message}`,
                      ephemeral: true
                  });
              }
              break;
  
          case 'med_buy_modal':
              try {
                  const amount = parseFloat(interaction.fields.getTextInputValue('med_buy_amount'));
                  if (isNaN(amount)) throw new Error('Please enter a valid number');
                  
                  await saveTradeSettings(interaction.user.id, { mediumQuickBuy: amount });
                  await interaction.reply({
                      content: `✅ Medium quick buy amount set to ${amount} SOL`,
                      ephemeral: true
                  });
              } catch (error) {
                  await interaction.reply({
                      content: `❌ Error: ${error.message}`,
                      ephemeral: true
                  });
              }
              break;
  
          case 'large_buy_modal':
              try {
                  const amount = parseFloat(interaction.fields.getTextInputValue('large_buy_amount'));
                  if (isNaN(amount)) throw new Error('Please enter a valid number');
                  
                  await saveTradeSettings(interaction.user.id, { largeQuickBuy: amount });
                  await interaction.reply({
                      content: `✅ Large quick buy amount set to ${amount} SOL`,
                      ephemeral: true
                  });
              } catch (error) {
                  await interaction.reply({
                      content: `❌ Error: ${error.message}`,
                      ephemeral: true
                  });
              }
              break;
      }
      }
    } catch (error) {
      console.error('Top level error in application handler:', error);
      console.error('Error stack:', error.stack);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred. Please try again.',
          ephemeral: true
        });
      }
    }
  }
  
  async function showSolanaSpotTradingMenu(interaction) {
    try {
      const userId = interaction.user.id;
      const { exists, solPublicKey } = await checkUserWallet(userId);
  
      if (!exists) {
        const embed = new EmbedBuilder()
          .setTitle('No Wallet Found')
          .setDescription('You need to generate a wallet first.')
          .setColor(0xFF0000);
  
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('generate_wallet')
            .setLabel('Generate Wallet')
            .setStyle(ButtonStyle.Primary)
        );
  
        await interaction.update({
          embeds: [embed],
          components: [row]
        });
        return;
      }
  
      const solBalance = await fetchSolBalance(solPublicKey);
      const tokenBalances = await fetchTokenBalances(solPublicKey);
  
      const embed = new EmbedBuilder()
        .setTitle('🌟 Solana Spot Trading Dashboard')
        .setDescription('Manage your trades and view your portfolio')
        .setColor(0x0099FF)
        .addFields({
          name: 'Wallet Balance',
          value: [
            '```',
            `SOL Balance: ${solBalance.toFixed(4)} SOL`,
            `Address: ${solPublicKey}`,
            '```',
            `[View on Solscan](https://solscan.io/account/${solPublicKey})`
          ].join('\n'),
          inline: false
        });
  
      if (tokenBalances && tokenBalances.length > 0) {
        const tokensList = tokenBalances
          .filter(token => token.amount > 0)
          .map(token => `${token.name}: ${token.amount.toFixed(token.decimals)} (${token.mint})`)
          .join('\n');
  
        if (tokensList) {
          embed.addFields({
            name: '🪙 Token Holdings',
            value: '```\n' + tokensList + '\n```',
            inline: false
          });
        }
      }
  
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('SOLANA_TOKEN_BUY')
          .setLabel('Buy Token')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📈'),
        new ButtonBuilder()
          .setCustomId('SOLANA_TOKEN_SELL')
          .setLabel('Sell Token')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('📉'),
        new ButtonBuilder()
          .setCustomId('refresh_trading_view')
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );
  
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('trade_settings')
          .setLabel('Settings')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⚙️'),
        new ButtonBuilder()
          .setCustomId('back_to_applications')
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('↩️')
      );
  
      await interaction.update({
        embeds: [embed],
        components: [row1, row2]
      });
    } catch (error) {
      console.error('Error displaying Solana trading menu:', error);
      await interaction.reply({
        content: '❌ Error loading trading menu. Please try again.',
        ephemeral: true
      });
    }
  }
  
  export async function handleTokenAddressInput(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('token_address_modal')
      .setTitle('Enter Token Address');
  
    const tokenAddressInput = new TextInputBuilder()
      .setCustomId('token_address')
      .setLabel('Token Contract Address')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter Solana token address')
      .setRequired(true);
  
    const row = new ActionRowBuilder().addComponents(tokenAddressInput);
    modal.addComponents(row);
  
    await interaction.showModal(modal);
  }
  
  export async function handleTokenAddressSubmit(interaction) {
    const tokenAddress = interaction.fields.getTextInputValue('token_address');
  
    try {
      const tokenDetails = await fetchTokenDetails(tokenAddress);
      const tokenPrice = await fetchTokenPrice(tokenAddress);
  
      const embed = new EmbedBuilder()
        .setTitle(`Token Details: ${tokenDetails.symbol}`)
        .setColor(0x0099FF)
        .addFields(
          { name: 'Price', value: `$${tokenPrice || 'N/A'}`, inline: true },
          { name: 'Volume 24h', value: `$${tokenDetails.volume24h || 'N/A'}`, inline: true },
          { name: 'Contract', value: `\`${tokenAddress}\``, inline: false }
        );
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('buy_token')
          .setLabel('Buy')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('sell_token')
          .setLabel('Sell')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('refresh_token')
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Secondary)
      );
  
      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error fetching token details:', error);
      await interaction.reply({
        content: '❌ Error fetching token details. Please verify the address and try again.',
        ephemeral: true
      });
    }
  }
  
  async function handleTradeSettings(interaction) {
    const userId = interaction.user.id;
    try {
      const settings = await getTradeSettings(userId) || {
        minQuickBuy: 0.1,
        mediumQuickBuy: 0.5,
        largeQuickBuy: 1.0,
        minQuickSell: 0.1,
        mediumQuickSell: 0.5,
        largeQuickSell: 1.0
      };
  
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Trading Settings')
        .setDescription('Configure your quick trade amounts')
        .setColor(0x0099FF)
        .addFields(
          {
            name: '📈 Quick Buy Amounts (SOL)',
            value: [
              `Min: ${settings.minQuickBuy}`,
              `Medium: ${settings.mediumQuickBuy}`,
              `Large: ${settings.largeQuickBuy}`
            ].join('\n'),
            inline: true
          },
          {
            name: '📉 Quick Sell Amounts (SOL)',
            value: [
              `Min: ${settings.minQuickSell}`,
              `Medium: ${settings.mediumQuickSell}`,
              `Large: ${settings.largeQuickSell}`
            ].join('\n'),
            inline: true
          }
        );
  
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('set_quick_buy')
          .setLabel('Set Quick Buy')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('set_quick_sell')
          .setLabel('Set Quick Sell')
          .setStyle(ButtonStyle.Danger)
      );
  
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('back_to_spot_trading')
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('↩️')
      );
  
      if (interaction.deferred) {
        await interaction.editReply({
          embeds: [embed],
          components: [row1, row2]
        });
      } else {
        await interaction.update({
          embeds: [embed],
          components: [row1, row2]
        });
      }
    } catch (error) {
      console.error('Error displaying trade settings:', error);
      await interaction.reply({
        content: '❌ Error loading trade settings. Please try again.',
        ephemeral: true
      });
    }
  }

  async function handleQuickBuyOptions(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('Quick Buy Settings')
        .setDescription('Choose an option to configure:')
        .setColor(0x00FF00)
        .addFields({
            name: 'Instructions',
            value: 'Click a button below to set your preferred amount for each quick buy option.'
        });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('set_min_buy')
                .setLabel('Set Minimum Buy')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_med_buy')
                .setLabel('Set Medium Buy')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_large_buy')
                .setLabel('Set Large Buy')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

async function handleQuickSellOptions(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('Set Quick Sell Amounts')
        .setDescription('Choose the amount for quick sell:')
        .setColor(0xFF0000);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('quick_sell_min')
                .setLabel('0.1 SOL')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('quick_sell_med')
                .setLabel('0.5 SOL')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('quick_sell_large')
                .setLabel('1.0 SOL')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}
