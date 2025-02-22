import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { checkUserWallet } from '../../../../src/db/dynamo.mjs';
import { fetchSolBalance } from '../chains/solana/functions/utils.mjs';

export function registerSpotTradingHandlers(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'SOLANA_SPOT_TRADING') {
            await handleSolanaSpotTrading(interaction);
        } else if (interaction.customId === 'XRP_SPOT_TRADING') {
            await handleXrpSpotTrading(interaction);
        }
    });
}

async function handleSolanaSpotTrading(interaction) {
    try {
        const { exists, solPublicKey } = await checkUserWallet(
            interaction.user.id,
            interaction.user.username
        );

        if (exists) {
            const solBalance = await fetchSolBalance(solPublicKey);
            
            const embed = new EmbedBuilder()
                .setTitle('Welcome Back!')
                .setDescription(`Your Solana Wallet: ${solPublicKey}\nBalance: ${solBalance} SOL\n\n` +
                    'This bot allows you to trade cryptocurrencies seamlessly using the Raydium API. You can:\n' +
                    '• Buy any token by entering its contract address\n' +
                    '• Sell your tokens with ease\n' +
                    '• Customize trades directly from Discord')
                .setColor(0x0099FF)
                .addFields(
                    { name: 'Links', value: '[Discord](https://discord.gg/smalltimedevs) | [Website](https://www.smalltimedevs.com)' }
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('SOLANA_TOKEN_BUY')
                        .setLabel('Buy Tokens')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('SOLANA_TOKEN_SELL')
                        .setLabel('Sell Tokens')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('SHOW_WALLET')
                        .setLabel('Wallet Details')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('HOME')
                        .setLabel('Home')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [embed], components: [row] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('Welcome to Small Time Devs Crypto Bot!')
                .setDescription('Please generate a wallet to get started.');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('GENERATE_WALLET')
                        .setLabel('Generate A Wallet')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    } catch (error) {
        console.error('Error in Solana spot trading:', error);
        await interaction.reply({
            content: '❌ An error occurred. Please try again later.',
            ephemeral: true
        });
    }
}

async function handleXrpSpotTrading(interaction) {
    try {
        const { exists, xrpPublicKey } = await checkUserWallet(
            interaction.user.id,
            interaction.user.username
        );

        if (exists) {
            const embed = new EmbedBuilder()
                .setTitle('Welcome Back!')
                .setDescription(`Your XRP Wallet: ${xrpPublicKey}\n\n` +
                    'This bot allows you to trade cryptocurrencies seamlessly using our custom-built API. You can:\n' +
                    '• Buy any token on XRPL\n' +
                    '• Sell your tokens with ease on XRPL\n' +
                    '• Customize trades directly from Discord')
                .setColor(0x0099FF)
                .addFields(
                    { name: 'Links', value: '[Discord](https://discord.gg/smalltimedevs) | [Website](https://www.smalltimedevs.com)' }
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('XRP_TOKEN_BUY')
                        .setLabel('Buy Tokens')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('XRP_TOKEN_SELL')
                        .setLabel('Sell Tokens')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('SHOW_WALLET')
                        .setLabel('Wallet Details')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('HOME')
                        .setLabel('Home')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [embed], components: [row] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('Welcome to Small Time Devs Crypto Bot!')
                .setDescription('Please generate a wallet to get started.');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('GENERATE_WALLET')
                        .setLabel('Generate A Wallet')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    } catch (error) {
        console.error('Error in XRP spot trading:', error);
        await interaction.reply({
            content: '❌ An error occurred. Please try again later.',
            ephemeral: true
        });
    }
}
