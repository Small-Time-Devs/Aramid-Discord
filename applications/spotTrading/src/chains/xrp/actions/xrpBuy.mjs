import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import axios from 'axios';
import xrpl from "xrpl";
import { storeTrade, checkUserWallet, getReferralXrpPublicKey } from '../../../../../../src/db/dynamo.mjs';
import { 
    fetchTokenBalances, 
    fetchXrpBalance, 
    fetchTokenPrice, 
    fetchTokenDetails,
    initializeXrpClient,
    fetchIssuerCurrencies 
} from '../functions/utils.mjs';
import { globalStaticConfig } from '../../../../../../src/globals/globals.mjs';

let xrpBuyTokenConfig = {};

export function registerXrpBuyHandlers(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'XRP_TOKEN_BUY':
                    await handleBuySetup(interaction);
                    break;
                case 'SET_XRP_TOKEN':
                    await handleTokenModal(interaction);
                    break;
                case 'SET_XRP_AMOUNT':
                    await handleAmountModal(interaction);
                    break;
                case 'EXECUTE_XRP_BUY':
                    await executeBuy(interaction);
                    break;
            }
        }

        if (interaction.isModalSubmit()) {
            switch (interaction.customId) {
                case 'xrp_token_modal':
                    await handleTokenSubmit(interaction);
                    break;
                case 'xrp_amount_modal':
                    await handleAmountSubmit(interaction);
                    break;
            }
        }
    });
}

async function handleBuySetup(interaction) {
    const userId = interaction.user.id;
    const { exists, xrpPublicKey, xrpPrivateKey } = await checkUserWallet(userId);

    xrpBuyTokenConfig[userId] = {
        userId,
        outputMint: '',
        amount: 10,
        xrpPublicKey,
        xrpPrivateKey,
        slippage: 50,
        priorityFee: 'medium'
    };

    await displayBuyOptions(interaction);
}

async function displayBuyOptions(interaction) {
    const config = xrpBuyTokenConfig[interaction.user.id];
    const client = await initializeXrpClient(globalStaticConfig.rpcNodeXrp);
    const wallet = xrpl.Wallet.fromSeed(config.xrpPrivateKey);
    const balance = await fetchXrpBalance(wallet, client);

    const embed = new EmbedBuilder()
        .setTitle('XRP Token Purchase')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Wallet Balance', value: `${balance.toFixed(2)} XRP`, inline: true },
            { name: 'Purchase Amount', value: `${config.amount} XRP`, inline: true }
        );

    if (config.outputMint) {
        const currencies = await fetchIssuerCurrencies(config.outputMint);
        if (currencies.decodedCurrencyHex) {
            embed.addFields(
                { name: 'Token', value: currencies.decodedCurrencyHex, inline: true },
                { name: 'Issuer', value: config.outputMint, inline: true }
            );
        }
    }

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SET_XRP_TOKEN')
                .setLabel('Set Token')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('SET_XRP_AMOUNT')
                .setLabel('Set Amount')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('EXECUTE_XRP_BUY')
                .setLabel('Execute Buy')
                .setStyle(ButtonStyle.Success)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
    });
}

async function executeBuy(interaction) {
    const config = xrpBuyTokenConfig[interaction.user.id];
    try {
        // Execute buy logic here...
        const response = await axios.post('https://api.smalltimedevs.com/xrp/ledger-api/buy', {
            seed: config.xrpPrivateKey,
            issuer: config.outputMint,
            amountXRP: config.amount
        });

        if (response.data.message === 'Transaction confirmed') {
            const embed = new EmbedBuilder()
                .setTitle('Purchase Successful!')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Tokens Purchased', value: response.data.tokensPurchased.toString() },
                    { name: 'Transaction ID', value: `[View on XRPL](https://xrpscan.com/tx/${response.data.txid})` }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    } catch (error) {
        console.error('Buy execution error:', error);
        await interaction.reply({
            content: '❌ Transaction failed. Please try again.',
            ephemeral: true
        });
    }
}

// Add other necessary handler functions...
