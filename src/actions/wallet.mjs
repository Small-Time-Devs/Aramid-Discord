import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { 
    checkUserWallet,
    generateSolanaWallet,
    generateXrpWallet 
} from '../db/dynamo.mjs';
import { 
    fetchSolBalance,
    fetchTokenBalances 
} from '../../applications/spotTrading/src/chains/solana/functions/utils.mjs';

export async function handleWalletView(interaction) {
    try {
        // Defer the reply immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const { exists, solPublicKey, xrpPublicKey } = await checkUserWallet(userId);

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

            // Use editReply instead of reply
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            return;
        }

        // Fetch balances
        const solBalance = await fetchSolBalance(solPublicKey);
        const tokenBalances = await fetchTokenBalances(solPublicKey);

        // Create main wallet embed
        const walletEmbed = new EmbedBuilder()
            .setTitle('Your Wallet Details')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: 'Solana Wallet',
                    value: `[${solPublicKey}](https://solscan.io/account/${solPublicKey})\nBalance: ${solBalance.toFixed(4)} SOL`,
                    inline: false
                },
                {
                    name: 'XRP Wallet',
                    value: `[${xrpPublicKey}](https://xrpscan.com/account/${xrpPublicKey})`,
                    inline: false
                }
            );

        // Create token balances embed if there are any
        let tokenEmbed;
        if (tokenBalances.length > 0) {
            tokenEmbed = new EmbedBuilder()
                .setTitle('Token Balances')
                .setColor(0x0099FF);

            tokenBalances.forEach(token => {
                tokenEmbed.addFields({
                    name: token.name || 'Unknown Token',
                    value: `Amount: ${token.amount.toFixed(token.decimals)}\nMint: ${token.mint}`,
                    inline: true
                });
            });
        }

        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('show_private_key')
                    .setLabel('Show Private Key')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('set_withdraw_address')
                    .setLabel('Set Withdraw Address')
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('send_sol')
                    .setLabel('Send SOL')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('refresh_wallet')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Use editReply instead of reply
        await interaction.editReply({
            embeds: tokenEmbed ? [walletEmbed, tokenEmbed] : [walletEmbed],
            components: [row1, row2]
        });

    } catch (error) {
        console.error('Error in handleWalletView:', error);
        // Use editReply for error handling too
        await interaction.editReply({
            content: '❌ Error fetching wallet details. Please try again.',
            components: []
        }).catch(console.error);
    }
}

export async function handleGenerateWallet(interaction) {
    try {
        // Generate both Solana and XRP wallets
        const solanaWallet = await generateSolanaWallet(interaction.user.id);
        const xrpWallet = await generateXrpWallet(interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle('Wallet Generated Successfully')
            .setColor(0x00FF00)
            .addFields(
                {
                    name: 'Solana Address',
                    value: `[${solanaWallet.solPublicKey}](https://solscan.io/account/${solanaWallet.solPublicKey})`,
                    inline: false
                },
                {
                    name: 'XRP Address',
                    value: `[${xrpWallet.xrpPublicKey}](https://xrpscan.com/account/${xrpWallet.xrpPublicKey})`,
                    inline: false
                }
            );

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error generating wallet:', error);
        await interaction.reply({
            content: '❌ Error generating wallet. Please try again.',
            ephemeral: true
        });
    }
}

// Add these handlers to your main index.mjs file
export function registerWalletHandlers(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        try {
            switch (interaction.customId) {
                case 'view_wallet':
                    await handleWalletView(interaction);
                    break;
                case 'generate_wallet':
                    await handleGenerateWallet(interaction);
                    break;
                case 'refresh_wallet':
                    await handleWalletView(interaction);
                    break;
                // ... other cases ...
            }
        } catch (error) {
            console.error('Error handling wallet interaction:', error);
            // Only reply if we haven't already
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred. Please try again.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    });
}
