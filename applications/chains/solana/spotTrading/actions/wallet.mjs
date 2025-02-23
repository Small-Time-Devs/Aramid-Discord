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
    fetchSolBalance, 
    fetchTokenBalances, 
    createWalletEmbed, 
    createTransactionEmbed, 
    createErrorEmbed,
    transferTokens,
    fetchMinimumRentExemptionBalance,
    withdrawSol
} from '../functions/utils.mjs';

export async function showSolanaWalletDetails(interaction) {
    try {
        const { exists, solPublicKey } = await checkUserWallet(
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

        const solBalance = await fetchSolBalance(solPublicKey);
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        const embed = await createWalletEmbed(solPublicKey, solBalance, tokenBalances);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('SHOW_PRIVATE_KEY')
                    .setLabel('Show Private Key')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('REFRESH_WALLET')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [row], 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error showing wallet details:', error);
        const errorEmbed = await createErrorEmbed(error);
        await interaction.reply({ 
            embeds: [errorEmbed], 
            ephemeral: true 
        });
    }
}

export async function handleShowSolanaPrivateKey(interaction) {
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
            .setCustomId('2fa_verify_modal')
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
        console.error('Error in handleShowSolanaPrivateKey:', error);
        const errorEmbed = await createErrorEmbed(error);
        await interaction.reply({ 
            embeds: [errorEmbed], 
            ephemeral: true 
        });
    }
}

export async function handleSolanaWithdraw(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('solana_withdraw_modal')
        .setTitle('Withdraw SOL');

    const amountInput = new TextInputBuilder()
        .setCustomId('amount_input')
        .setLabel('Amount to withdraw (SOL)')
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
