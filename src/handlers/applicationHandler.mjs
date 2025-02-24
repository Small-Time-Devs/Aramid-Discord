import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } from 'discord.js';
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
                    // Handle XRP spot trading
                    await interaction.update({
                        content: 'Starting XRP spot trading...',
                        components: [],
                        embeds: []
                    });
                    // Add logic to start XRP spot trading
                    break;

                case 'market_solana':
                    // Handle Solana market making
                    await interaction.update({
                        content: 'Starting Solana market making...',
                        components: [],
                        embeds: []
                    });
                    // Add logic to start Solana market making
                    break;

                case 'market_xrp':
                    // Handle XRP market making
                    await interaction.update({
                        content: 'Starting XRP market making...',
                        components: [],
                        embeds: []
                    });
                    // Add logic to start XRP market making
                    break;

                case 'back_to_applications':
                    await sendApplicationMenu(interaction);
                    break;

                case 'trade_settings':
                    await handleTradeSettings(interaction);
                    break;

                case 'set_quick_buy':
                    const modal = new ModalBuilder()
                        .setCustomId('quick_buy_modal')
                        .setTitle('Set Quick Buy Amounts');

                    // Add components to modal
                    const minInput = new TextInputBuilder()
                        .setCustomId('min_buy')
                        .setLabel('Minimum Buy Amount (SOL)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0.1')
                        .setRequired(true);

                    const medInput = new TextInputBuilder()
                        .setCustomId('med_buy')
                        .setLabel('Medium Buy Amount (SOL)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0.5')
                        .setRequired(true);

                    const largeInput = new TextInputBuilder()
                        .setCustomId('large_buy')
                        .setLabel('Large Buy Amount (SOL)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('1.0')
                        .setRequired(true);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(minInput),
                        new ActionRowBuilder().addComponents(medInput),
                        new ActionRowBuilder().addComponents(largeInput)
                    );

                    // Show the modal and wait for submission
                    await interaction.showModal(modal);

                    try {
                        const modalSubmitInteraction = await interaction.awaitModalSubmit({
                            // Filter to only handle this specific modal
                            filter: (i) => i.customId === 'quick_buy_modal',
                            // Time to wait for response
                            time: 60000
                        });

                        // Get values from modal
                        const minBuy = parseFloat(modalSubmitInteraction.fields.getTextInputValue('min_buy'));
                        const medBuy = parseFloat(modalSubmitInteraction.fields.getTextInputValue('med_buy'));
                        const largeBuy = parseFloat(modalSubmitInteraction.fields.getTextInputValue('large_buy'));

                        // Save to database
                        await saveTradeSettings(interaction.user.id, {
                            minQuickBuy: minBuy,
                            mediumQuickBuy: medBuy,
                            largeQuickBuy: largeBuy
                        });

                        // Send confirmation
                        await modalSubmitInteraction.reply({
                            content: `✅ Quick buy settings saved:\n• Min: ${minBuy} SOL\n• Medium: ${medBuy} SOL\n• Large: ${largeBuy} SOL`,
                            ephemeral: true
                        });

                    } catch (error) {
                        console.error('Modal submission error:', error);
                        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                            console.log('Modal timed out');
                            return;
                        }
                        // Handle any other errors
                        await interaction.followUp({
                            content: '❌ Failed to save settings. Please try again.',
                            ephemeral: true
                        });
                    }
                    break;

                case 'set_quick_sell':
                    const quickSellModal = new ModalBuilder()
                        .setCustomId('quick_sell_modal')
                        .setTitle('Set Quick Sell Amounts');

                    // Add components to modal
                    const minSellInput = new TextInputBuilder()
                        .setCustomId('min_sell')
                        .setLabel('Minimum Sell Amount (Tokens)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('100')
                        .setRequired(true);

                    const medSellInput = new TextInputBuilder()
                        .setCustomId('med_sell')
                        .setLabel('Medium Sell Amount (Tokens)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('500')
                        .setRequired(true);

                    const largeSellInput = new TextInputBuilder()
                        .setCustomId('large_sell')
                        .setLabel('Large Sell Amount (Tokens)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('1000')
                        .setRequired(true);

                    quickSellModal.addComponents(
                        new ActionRowBuilder().addComponents(minSellInput),
                        new ActionRowBuilder().addComponents(medSellInput),
                        new ActionRowBuilder().addComponents(largeSellInput)
                    );

                    // Show the modal and wait for submission
                    await interaction.showModal(quickSellModal);

                    try {
                        const modalSubmitInteraction = await interaction.awaitModalSubmit({
                            filter: (i) => i.customId === 'quick_sell_modal',
                            time: 60000
                        });

                        // Get values from modal
                        const minSell = parseFloat(modalSubmitInteraction.fields.getTextInputValue('min_sell'));
                        const medSell = parseFloat(modalSubmitInteraction.fields.getTextInputValue('med_sell'));
                        const largeSell = parseFloat(modalSubmitInteraction.fields.getTextInputValue('large_sell'));

                        // Save to database
                        await saveTradeSettings(interaction.user.id, {
                            minQuickSell: minSell,
                            mediumQuickSell: medSell,
                            largeQuickSell: largeSell
                        });

                        // Send confirmation
                        await modalSubmitInteraction.reply({
                            content: `✅ Quick sell settings saved:\n• Min: ${minSell} tokens\n• Medium: ${medSell} tokens\n• Large: ${largeSell} tokens`,
                            ephemeral: true
                        });

                    } catch (error) {
                        console.error('Modal submission error:', error);
                        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                            console.log('Modal timed out');
                            return;
                        }
                        await interaction.followUp({
                            content: '❌ Failed to save settings. Please try again.',
                            ephemeral: true
                        });
                    }
                    break;
            }
        }

            if (interaction.customId === 'quick_buy_modal') {
                try {
                    //const minBuy = interaction.fields.getTextInputValue('min_buy');
                    //const medBuy = interaction.fields.getTextInputValue('med_buy');
                    //const largeBuy = interaction.fields.getTextInputValue('large_buy');

                    console.log('Processing quick buy values:', { minBuy, medBuy, largeBuy });

                    // Save to database
                    //await saveTradeSettings(interaction.user.id, {
                    //    minQuickBuy: parseFloat(minBuy),
                    //    mediumQuickBuy: parseFloat(medBuy),
                    //    largeQuickBuy: parseFloat(largeBuy)
                    //});

                    console.log('Quick buy settings saved successfully');

                    // Reply with success message
                    await interaction.reply({
                        content: `✅ Quick buy settings saved:\n• Min: ${minBuy} SOL\n• Medium: ${medBuy} SOL\n• Large: ${largeBuy} SOL`,
                        ephemeral: true
                    });

                } catch (error) {
                    console.error('Quick buy settings error:', error);
                    await interaction.reply({
                        content: `❌ Failed to save settings: ${error.message}`,
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

                    await saveTradeSettings(interaction.user.id, {
                        minQuickSell: parseFloat(minSell),
                        mediumQuickSell: parseFloat(medSell),
                        largeQuickSell: parseFloat(largeSell)
                    });

                    console.log('Quick sell settings saved successfully');

                    await interaction.reply({
                        content: `✅ Quick sell settings saved:\n• Min: ${minSell} SOL\n• Medium: ${medSell} SOL\n• Large: ${largeSell} SOL`,
                        ephemeral: true
                    });

                } catch (error) {
                    console.error('Quick sell settings error:', error);
                    await interaction.reply({
                        content: `❌ Failed to save settings: ${error.message}`,
                        ephemeral: true
                    });
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

// Add new helper functions for cleaner handling
async function handleQuickBuySettings(interaction) {
    try {
        const minBuy = interaction.fields.getTextInputValue('min_quick_buy');
        const mediumBuy = interaction.fields.getTextInputValue('medium_quick_buy');
        const largeBuy = interaction.fields.getTextInputValue('large_quick_buy');

        console.log('Quick Buy Values:', { minBuy, mediumBuy, largeBuy }); // Debug log

        // Validate inputs
        const settings = {
            minQuickBuy: parseFloat(minBuy),
            mediumQuickBuy: parseFloat(mediumBuy),
            largeQuickBuy: parseFloat(largeBuy)
        };

        if (Object.values(settings).some(isNaN)) {
            throw new Error('Please enter valid numbers');
        }

        // Save settings
        await saveTradeSettings(interaction.user.id, settings);

        // Create response embed
        const embed = new EmbedBuilder()
            .setTitle('✅ Quick Buy Settings Saved')
            .setColor(0x00FF00)
            .addFields({
                name: 'Quick Buy Amounts (SOL)',
                value: [
                    `Min: ${settings.minQuickBuy} SOL`,
                    `Medium: ${settings.mediumQuickBuy} SOL`,
                    `Large: ${settings.largeQuickBuy} SOL`
                ].join('\n')
            });

        // Add return button
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('trade_settings')
                    .setLabel('Back to Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );

        // Send response
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

    } catch (error) {
        console.error('Quick buy settings error:', error); // Debug log
        await interaction.reply({
            content: `❌ Failed to save settings: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleQuickSellSettings(interaction) {
    try {
        const minSell = parseFloat(interaction.fields.getTextInputValue('min_quick_sell'));
        const mediumSell = parseFloat(interaction.fields.getTextInputValue('medium_quick_sell'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('large_quick_sell'));

        // Validate numbers
        if (isNaN(minSell) || isNaN(mediumSell) || isNaN(largeSell)) {
            throw new Error('Invalid number format');
        }

        const settings = {
            minQuickSell: minSell,
            mediumQuickSell: mediumSell,
            largeQuickSell: largeSell
        };

        await saveTradeSettings(interaction.user.id, settings);

        const embed = new EmbedBuilder()
            .setTitle('✅ Quick Sell Settings Saved')
            .setColor(0x00FF00)
            .addFields({
                name: 'Quick Sell Amounts (SOL)',
                value: [
                    `Min: ${minSell} SOL`,
                    `Medium: ${mediumSell} SOL`,
                    `Large: ${largeSell} SOL`
                ].join('\n')
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('trade_settings')
                    .setLabel('Back to Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

    } catch (error) {
        console.error('Error saving quick sell settings:', error);
        await interaction.reply({
            content: '❌ Failed to save settings. Please ensure all values are valid numbers.',
            ephemeral: true
        });
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

            const row = new ActionRowBuilder()
                .addComponents(
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

        // Fetch wallet balances
        const solBalance = await fetchSolBalance(solPublicKey);
        const tokenBalances = await fetchTokenBalances(solPublicKey);

        // Create main trading menu embed
        const embed = new EmbedBuilder()
            .setTitle('🌟 Solana Spot Trading Dashboard')
            .setDescription('Manage your trades and view your portfolio')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: 'Wallet Balance',
                    value: [
                        '```',
                        `SOL Balance: ${solBalance.toFixed(4)} SOL`,
                        `Address: ${solPublicKey}`,
                        '```',
                        `[View on Solscan](https://solscan.io/account/${solPublicKey})`,
                    ].join('\n'),
                    inline: false
                }
            );

        // Add token balances if any exist
        if (tokenBalances && tokenBalances.length > 0) {
            const tokensList = tokenBalances
                .filter(token => token.amount > 0)
                .map(token => 
                    `${token.name}: ${token.amount.toFixed(token.decimals)} (${token.mint})`
                )
                .join('\n');

            if (tokensList) {
                embed.addFields({
                    name: '🪙 Token Holdings',
                    value: '```\n' + tokensList + '\n```',
                    inline: false
                });
            }
        }

        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
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

        const row2 = new ActionRowBuilder()
            .addComponents(
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

        const row = new ActionRowBuilder()
            .addComponents(
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

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_quick_buy')
                    .setLabel('Set Quick Buy')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('set_quick_sell')
                    .setLabel('Set Quick Sell')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
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

async function showQuickBuyModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('quick_buy_settings')
        .setTitle('Quick Buy Settings');

    const minInput = new TextInputBuilder()
        .setCustomId('min_quick_buy')
        .setLabel('Minimum Quick Buy (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.1')
        .setRequired(true);

    const mediumInput = new TextInputBuilder()
        .setCustomId('medium_quick_buy')
        .setLabel('Medium Quick Buy (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.5')
        .setRequired(true);

    const largeInput = new TextInputBuilder()
        .setCustomId('large_quick_buy')
        .setLabel('Large Quick Buy (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1.0')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(minInput),
        new ActionRowBuilder().addComponents(mediumInput),
        new ActionRowBuilder().addComponents(largeInput)
    );

    await interaction.showModal(modal);
}

async function showQuickSellModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('quick_sell_settings')
        .setTitle('Quick Sell Settings');

    const minInput = new TextInputBuilder()
        .setCustomId('min_quick_sell')
        .setLabel('Minimum Quick Sell (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.1')
        .setRequired(true);

    const mediumInput = new TextInputBuilder()
        .setCustomId('medium_quick_sell')
        .setLabel('Medium Quick Sell (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.5')
        .setRequired(true);

    const largeInput = new TextInputBuilder()
        .setCustomId('large_quick_sell')
        .setLabel('Large Quick Sell (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1.0')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(minInput),
        new ActionRowBuilder().addComponents(mediumInput),
        new ActionRowBuilder().addComponents(largeInput)
    );

    await interaction.showModal(modal);
}
