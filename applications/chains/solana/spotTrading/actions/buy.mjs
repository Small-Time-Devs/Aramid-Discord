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
import { fetchTokenBalances, fetchTokenBalance, fetchSolBalance, fetchTokenPrice, fetchTokenDetails, getSolanaPriorityFee } from '../functions/utils.mjs';
import { globalStaticConfig, globalURLS } from '../../../../../../src/globals/globals.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

let solanaBuyTokenConfig = {};

export function registerSolanaBuyHandlers(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'SOLANA_TOKEN_BUY':
                    await handleBuySetup(interaction);
                    break;
                case 'SET_TOKEN_ADDRESS':
                    await handleTokenAddressModal(interaction);
                    break;
                case 'SET_PURCHASE_AMOUNT':
                    await handlePurchaseAmountModal(interaction);
                    break;
                case 'SET_PRIORITY_FEE':
                    await handlePriorityFeeButtons(interaction);
                    break;
                case 'SET_SLIPPAGE':
                    await handleSlippageButtons(interaction);
                    break;
                case 'EXECUTE_BUY':
                    await executeBuy(interaction);
                    break;
            }
        }

        if (interaction.isModalSubmit()) {
            switch (interaction.customId) {
                case 'token_address_modal':
                    await handleTokenAddressSubmit(interaction);
                    break;
                case 'purchase_amount_modal':
                    await handlePurchaseAmountSubmit(interaction);
                // Add other modal submissions
            }
        }
    });
}

async function handleBuySetup(interaction) {
    const userId = interaction.user.id;
    const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
    const priorityFees = await getSolanaPriorityFee();

    solanaBuyTokenConfig[userId] = {
        userId,
        outputMint: '',
        amount: 0.01,
        jito: false,
        solPublicKey,
        solPrivateKey,
        slippage: 50,
        priorityFee: priorityFees.mediumFee,
        priorityFeeSol: priorityFees.mediumFee / LAMPORTS_PER_SOL,
    };

    await displayBuyOptions(interaction);
}

async function displayBuyOptions(interaction) {
    const config = solanaBuyTokenConfig[interaction.user.id];
    const currentWalletBalance = await fetchSolBalance(config.solPublicKey);
    const tokenData = await fetchTokenDetails(config.outputMint);

    const embed = new EmbedBuilder()
        .setTitle('Solana Token Purchase')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Wallet Balance', value: `${currentWalletBalance.toFixed(2)} SOL`, inline: true },
            { name: 'Purchase Amount', value: `${config.amount} SOL`, inline: true },
            { name: 'Token Address', value: config.outputMint || 'Not set', inline: false },
            { name: 'Slippage', value: `${config.slippage / 100}%`, inline: true },
            { name: 'Priority Fee', value: `${config.priorityFeeSol} SOL`, inline: true }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SET_TOKEN_ADDRESS')
                .setLabel('Set Token')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('SET_PURCHASE_AMOUNT')
                .setLabel('Set Amount')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SET_PRIORITY_FEE')
                .setLabel('Priority Fee')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('SET_SLIPPAGE')
                .setLabel('Slippage')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('EXECUTE_BUY')
                .setLabel('Execute Buy')
                .setStyle(ButtonStyle.Success)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row1, row2, row3],
        ephemeral: true
    });
}

// Add other handler functions...

async function executeBuy(interaction) {
    const config = solanaBuyTokenConfig[interaction.user.id];
    try {
        // ... existing executeBuy logic ...
        const response = await axios.post(`${globalURLS.smallTimeDevsRaydiumTradeAPI}/aramidBuy`, {
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
                .setTitle('Purchase Successful!')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Tokens Purchased', value: response.data.tokensPurchased.toString() },
                    { name: 'Transaction ID', value: response.data.txid }
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