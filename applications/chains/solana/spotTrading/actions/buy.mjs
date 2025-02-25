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

        try {
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('select_token_')) {
                    await handleTokenSelection(interaction);
                    return;
                }

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
                    case 'REFRESH_TOKEN_LIST':
                        await handleTokenListRefresh(interaction);
                        break;
                    case 'RETURN_TO_TOKEN_LIST':
                        await displayTokenSelection(interaction);
                        break;
                }
            }
        } catch (error) {
            console.error('Error in button handler:', error);
            // If interaction hasn't been replied to yet
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred. Please try again.',
                    ephemeral: true
                });
            } else {
                // If interaction has been replied to or deferred
                await interaction.followUp({
                    content: '❌ An error occurred. Please try again.',
                    ephemeral: true
                });
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
    try {
        // Defer the reply immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);

        if (!exists) {
            await interaction.editReply({
                content: '❌ No wallet found. Please create a wallet first.',
                ephemeral: true
            });
            return;
        }

        const priorityFees = await getSolanaPriorityFee();
        const tokenBalances = await fetchTokenBalances(solPublicKey);

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
            tokenBalances // Store token balances in config
        };

        await displayTokenSelection(interaction);
    } catch (error) {
        console.error('Error in handleBuySetup:', error);
        if (!interaction.replied) {
            await interaction.editReply({
                content: '❌ Failed to load buy menu. Please try again.',
                ephemeral: true
            });
        }
    }
}

async function displayTokenSelection(interaction) {
    try {
        const config = solanaBuyTokenConfig[interaction.user.id];
        if (!config) {
            throw new Error('Configuration not found');
        }

        const currentWalletBalance = await fetchSolBalance(config.solPublicKey);
        const tokenBalances = config.tokenBalances;

        const embed = new EmbedBuilder()
            .setTitle('Token Purchase Menu')
            .setDescription('Select a token to purchase or enter a new token address')
            .setColor(0x0099FF)
            .addFields(
                { name: 'Wallet Balance', value: `${currentWalletBalance.toFixed(4)} SOL`, inline: false }
            );

        if (tokenBalances && tokenBalances.length > 0) {
            // Add existing token holdings
            const tokenHoldings = tokenBalances
                .map(token => ({
                    name: `${token.name || 'Unknown Token'}`,
                    value: `Balance: ${token.amount.toFixed(token.decimals)}\nMint: \`${token.mint}\``,
                    inline: false
                }));
            embed.addFields(tokenHoldings);
        }

        // Create buttons for each token
        const rows = [];
        const tokensPerRow = 3;
        
        if (tokenBalances && tokenBalances.length > 0) {
            for (let i = 0; i < tokenBalances.length; i += tokensPerRow) {
                const row = new ActionRowBuilder();
                const rowTokens = tokenBalances.slice(i, i + tokensPerRow);
                
                rowTokens.forEach(token => {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`select_token_${token.mint}`)
                            .setLabel(token.name || 'Unknown')
                            .setStyle(ButtonStyle.Secondary)
                    );
                });
                
                rows.push(row);
            }
        }

        // Add control buttons
        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('SET_TOKEN_ADDRESS')
                    .setLabel('Enter Token Address')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('REFRESH_TOKEN_LIST')
                    .setLabel('Refresh List')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('back_to_applications')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger)
            );

        rows.push(controlRow);

        // Use editReply instead of reply since we deferred earlier
        await interaction.editReply({
            embeds: [embed],
            components: rows,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in displayTokenSelection:', error);
        await interaction.editReply({
            content: '❌ Failed to load token selection menu. Please try again.',
            ephemeral: true
        });
    }
}

async function handleTokenSelection(interaction) {
    const tokenMint = interaction.customId.replace('select_token_', '');
    const config = solanaBuyTokenConfig[interaction.user.id];
    
    config.outputMint = tokenMint;
    
    // Fetch token details
    const tokenDetails = await fetchTokenDetails(tokenMint);
    const tokenPrice = await fetchTokenPrice(tokenMint);
    
    const embed = new EmbedBuilder()
        .setTitle('Token Purchase Setup')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Selected Token', value: tokenDetails?.name || 'Unknown Token', inline: true },
            { name: 'Current Price', value: tokenPrice ? `$${tokenPrice}` : 'Unknown', inline: true },
            { name: 'Contract Address', value: `\`${tokenMint}\``, inline: false }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SET_PURCHASE_AMOUNT')
                .setLabel('Set Amount')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('SET_SLIPPAGE')
                .setLabel('Set Slippage')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('RETURN_TO_TOKEN_LIST')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}

async function handleTokenListRefresh(interaction) {
    const config = solanaBuyTokenConfig[interaction.user.id];
    config.tokenBalances = await fetchTokenBalances(config.solPublicKey);
    await displayTokenSelection(interaction);
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