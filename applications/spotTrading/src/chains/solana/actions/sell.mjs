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
import { storeTrade, checkUserWallet, getReferralPublicKey } from '../../../../../../src/db/dynamo.mjs';
import { fetchTokenBalances, fetchTokenBalance, fetchSolBalance, fetchTokenPrice, getSolanaPriorityFee } from '../functions/utils.mjs';
import { globalStaticConfig, globalURLS } from '../../../../../../src/globals/globals.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

let solanaSellTokenConfig = {};
let tokenBalancesCache = {};

export function registerSolanaSellHandlers(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'SOLANA_TOKEN_SELL':
                    await handleSellSetup(interaction);
                    break;
                case 'SELECT_TOKEN_TO_SELL':
                    await handleTokenSelection(interaction);
                    break;
                case 'SET_SELL_AMOUNT':
                    await handleSellAmountModal(interaction);
                    break;
                case 'SET_SELL_PRIORITY_FEE':
                    await handlePriorityFeeButtons(interaction);
                    break;
                case 'EXECUTE_SELL':
                    await executeSell(interaction);
                    break;
            }
        }

        if (interaction.isModalSubmit()) {
            // Handle modal submissions
        }
    });
}

async function handleSellSetup(interaction) {
    const userId = interaction.user.id;
    const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
    
    // Initialize or update token balances cache
    tokenBalancesCache[solPublicKey] = await fetchTokenBalances(solPublicKey);

    solanaSellTokenConfig[userId] = {
        userId,
        outputMint: '',
        amount: 0,
        sellPercentage: 100,
        jito: false,
        solPublicKey,
        solPrivateKey,
        slippage: 50,
        priorityFee: (await getSolanaPriorityFee()).mediumFee
    };

    await displaySellOptions(interaction);
}

async function displaySellOptions(interaction) {
    const config = solanaSellTokenConfig[interaction.user.id];
    const tokenBalances = tokenBalancesCache[config.solPublicKey];

    const embed = new EmbedBuilder()
        .setTitle('Solana Token Sale')
        .setColor(0x0099FF);

    // Add token balances to embed
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

    // Add action buttons
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SELECT_TOKEN_TO_SELL')
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
                .setCustomId('SET_SELL_PRIORITY_FEE')
                .setLabel('Priority Fee')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('EXECUTE_SELL')
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
    const config = solanaSellTokenConfig[interaction.user.id];
    try {
        const response = await axios.post(`${globalURLS.smallTimeDevsRaydiumTradeAPI}/aramidSell`, {
            private_key: config.solPrivateKey,
            public_key: config.solPublicKey,
            mint: config.outputMint,
            amount: config.amount,
            referralPublicKey: await getReferralPublicKey(interaction.user.id),
            priorityFee: config.priorityFee,
            slippage: config.slippage,
            useJito: config.jito,
        });

        if (response.data.message === 'Transaction confirmed') {
            const embed = new EmbedBuilder()
                .setTitle('Sale Successful!')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'SOL Received', value: response.data.solReceived.toString() },
                    { name: 'Transaction ID', value: response.data.txid }
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

// Add other handler functions...