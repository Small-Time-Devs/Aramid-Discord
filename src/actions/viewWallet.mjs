import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder 
} from 'discord.js';
import { checkUserWallet } from '../db/dynamo.mjs';
import { fetchSolBalance, fetchTokenBalances } from '../../applications/chains/solana/spotTrading/functions/utils.mjs';
import { initializeXrpClient, fetchXrpBalance } from '../../applications/chains/xrp/spotTrading/functions/utils.mjs';
import { globalStaticConfig } from '../../src/globals/global.mjs';
import { sendMainMenu } from '../utils/discordMessages.mjs'; // Add this import

export async function handleWalletView(interaction) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        const userId = interaction.user.id;
        const { exists, solPublicKey, xrpPublicKey, xrpPrivateKey } = await checkUserWallet(userId);

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

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            return;
        }

        // Fetch balances for both chains
        const solBalance = await fetchSolBalance(solPublicKey);
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        
        // Initialize XRP client and fetch balance
        let xrpBalance = 0;
        try {
            const client = await initializeXrpClient(globalStaticConfig.rpcNodeXrp);
            xrpBalance = await fetchXrpBalance({ classicAddress: xrpPublicKey }, client);
        } catch (xrpError) {
            console.warn('Error fetching XRP balance:', xrpError);
            // Continue with zero balance if XRP fetch fails
        }

        // Create main wallet embed with both balances
        const walletEmbed = new EmbedBuilder()
            .setTitle('💼 Crypto Portfolio Dashboard')
            .setDescription('View and manage your crypto assets across multiple chains')
            .setColor(0x5865F2)
            .addFields(
                {
                    name: '🌟 Solana Wallet',
                    value: [
                        '```',
                        `Address: ${solPublicKey}`,
                        `Balance: ${solBalance.toFixed(4)} SOL`,
                        '```',
                        `[View on Solscan](https://solscan.io/account/${solPublicKey})`,
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💧 XRP Wallet',
                    value: [
                        '```',
                        `Address: ${xrpPublicKey}`,
                        `Balance: ${xrpBalance.toFixed(4)} XRP`,
                        '```',
                        `[View on XRPSCAN](https://xrpscan.com/account/${xrpPublicKey})`,
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
                walletEmbed.addFields({
                    name: '🪙 Token Balances',
                    value: '```\n' + tokensList + '\n```',
                    inline: false
                });
            }
        }

        // Add buttons for wallet actions
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_wallet')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('send_tokens')
                    .setLabel('Send')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📤'),
                new ButtonBuilder()
                    .setCustomId('receive_tokens')
                    .setLabel('Receive')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📥')
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('wallet_settings')
                    .setLabel('Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('back_to_menu')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );

        await interaction.editReply({
            embeds: [walletEmbed],
            components: [row1, row2]
        });

    } catch (error) {
        console.error('Error in handleWalletView:', error);
        await interaction.editReply({
            content: '❌ Error fetching wallet details. Please try again.',
            ephemeral: true
        });
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
            if (interaction.customId.startsWith('copy_sol_')) {
                const address = interaction.customId.replace('copy_sol_', '');
                await interaction.reply({
                    content: `✅ Solana address copied: \`${address}\``,
                    ephemeral: true
                });
                return;
            }

            if (interaction.customId.startsWith('copy_xrp_')) {
                const address = interaction.customId.replace('copy_xrp_', '');
                await interaction.reply({
                    content: `✅ XRP address copied: \`${address}\``,
                    ephemeral: true
                });
                return;
            }

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
                case 'back_to_menu':
                    try {
                        await interaction.deferUpdate().catch(console.error);
                        if (interaction.message) {
                            await interaction.message.delete().catch(() => {
                                console.log('Message already deleted or not found');
                            });
                        }
                        await sendMainMenu(interaction.channel);
                    } catch (error) {
                        console.error('Error handling back to menu:', error);
                        // Only try to send menu if we haven't already responded
                        if (!interaction.replied && !interaction.deferred) {
                            await sendMainMenu(interaction.channel);
                        }
                    }
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
