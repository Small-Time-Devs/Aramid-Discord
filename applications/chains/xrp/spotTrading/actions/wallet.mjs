import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { checkUserWallet, get2FASecret, verify2FACode } from '../../../../../../src/db/dynamo.mjs';
import { 
    fetchXrpBalance, 
    fetchTokenBalances, 
    initializeXrpClient,
    createTokenEmbed,
    createBalanceEmbed
} from '../functions/utils.mjs';
import { globalStaticConfig } from '../../../../../../src/globals/globals.mjs';

export async function showXrpWalletDetails(interaction) {
    try {
        const { exists, xrpPublicKey, xrpPrivateKey } = await checkUserWallet(
            interaction.user.id,
            interaction.user.username
        );

        if (!exists) {
            const embed = new EmbedBuilder()
                .setTitle('No Wallet Found')
                .setDescription('Please generate a wallet first.')
                .setColor(0xFF0000);

            return await interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });
        }

        const client = await initializeXrpClient(globalStaticConfig.rpcNodeXrp);
        const wallet = xrpl.Wallet.fromSeed(xrpPrivateKey);
        const xrpBalance = await fetchXrpBalance(wallet, client);
        const tokenBalances = await fetchTokenBalances(xrpPublicKey);
        
        const embed = createBalanceEmbed(wallet, xrpBalance, tokenBalances);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('SHOW_XRP_PRIVATE_KEY')
                    .setLabel('Show Private Key')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('REFRESH_XRP_WALLET')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [row], 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error showing XRP wallet details:', error);
        await interaction.reply({
            content: 'Error fetching wallet details',
            ephemeral: true
        });
    }
}

export async function handleShowXrpPrivateKey(interaction) {
    try {
        const userID = interaction.user.id;
        const secret = await get2FASecret(userID);
        
        if (!secret) {
            return await interaction.reply({
                content: '2FA is not enabled. Please enable 2FA first.',
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('2fa_verify_xrp_modal')
            .setTitle('2FA Verification');

        const codeInput = new TextInputBuilder()
            .setCustomId('2fa_code')
            .setLabel('Enter your 2FA code')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(codeInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error in handleShowXrpPrivateKey:', error);
        await interaction.reply({
            content: 'Error processing request',
            ephemeral: true
        });
    }
}

export async function handleXrpWithdraw(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('xrp_withdraw_modal')
        .setTitle('Withdraw XRP');

    const amountInput = new TextInputBuilder()
        .setCustomId('amount_input')
        .setLabel('Amount to withdraw (XRP)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const addressInput = new TextInputBuilder()
        .setCustomId('address_input')
        .setLabel('Destination address')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(amountInput);
    const row2 = new ActionRowBuilder().addComponents(addressInput);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
}
