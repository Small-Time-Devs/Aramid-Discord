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
import { storeTrade, checkUserWallet } from '../../../../../../src/db/dynamo.mjs';
import { 
    fetchTokenBalances, 
    fetchXrpBalance, 
    initializeXrpClient 
} from '../functions/utils.mjs';
import { globalStaticConfig } from '../../../../../../src/globals/globals.mjs';

let xrpSellTokenConfig = {};
let tokenBalancesCache = {};

export function registerXrpSellHandlers(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'XRP_TOKEN_SELL':
                    await handleSellSetup(interaction);
                    break;
                case 'SELECT_XRP_TOKEN':
                    await handleTokenSelection(interaction);
                    break;
                case 'SET_SELL_AMOUNT':
                    await handleSellAmountModal(interaction);
                    break;
                case 'EXECUTE_XRP_SELL':
                    await executeSell(interaction);
                    break;
            }
        }
    });
}

async function handleSellSetup(interaction) {
    const userId = interaction.user.id;
    const { exists, xrpPublicKey, xrpPrivateKey } = await checkUserWallet(userId);
    
    const client = await initializeXrpClient(globalStaticConfig.rpcNodeXrp);
    tokenBalancesCache[xrpPublicKey] = await fetchTokenBalances(xrpPublicKey, client);

    xrpSellTokenConfig[userId] = {
        userId,
        outputMint: '',
        amount: 0,
        sellPercentage: 100,
        xrpPublicKey,
        xrpPrivateKey
    };

    await displaySellOptions(interaction);
}

async function displaySellOptions(interaction) {
    const config = xrpSellTokenConfig[interaction.user.id];
    const tokenBalances = tokenBalancesCache[config.xrpPublicKey];

    const embed = new EmbedBuilder()
        .setTitle('XRP Token Sale')
        .setColor(0x0099FF);

    if (tokenBalances && tokenBalances.length > 0) {
        const balanceFields = tokenBalances
            .filter(token => token.amount > 0)
            .map(token => ({
                name: token.name || 'Unknown Token',
                value: `${token.amount.toFixed(token.decimals)}`,
                inline: true
            }));
        embed.addFields(balanceFields);
    }

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SELECT_XRP_TOKEN')
                .setLabel('Select Token')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('SET_SELL_AMOUNT')
                .setLabel('Set Amount')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('EXECUTE_XRP_SELL')
                .setLabel('Execute Sell')
                .setStyle(ButtonStyle.Success)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
    });
}

async function executeSell(interaction) {
    const config = xrpSellTokenConfig[interaction.user.id];
    try {
        const response = await axios.post('https://api.smalltimedevs.com/xrp/ledger-api/sell', {
            seed: config.xrpPrivateKey,
            issuer: config.outputMint,
            amount: config.amount
        });

        if (response.data.message === 'Transaction confirmed') {
            const embed = new EmbedBuilder()
                .setTitle('Sale Successful!')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'XRP Received', value: response.data.xrpReceived.toString() },
                    { name: 'Transaction ID', value: `[View on XRPL](https://xrpscan.com/tx/${response.data.txid})` }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    } catch (error) {
        console.error('Sell execution error:', error);
        await interaction.reply({
            content: '❌ Transaction failed. Please try again.',
            ephemeral: true
        });
    }
}

// Add other necessary handler functions...
