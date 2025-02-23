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
import { sendMainMenu } from '../utils/discordMessages.mjs';

export async function handleWalletView(interaction) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true }).catch(console.error);
        }

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

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            return;
        }

        // Fetch balances
        const solBalance = await fetchSolBalance(solPublicKey);
        const tokenBalances = await fetchTokenBalances(solPublicKey);

        // Create main wallet embed with improved formatting
        const walletEmbed = new EmbedBuilder()
            .setTitle('💼 Crypto Portfolio Dashboard')
            .setDescription('Manage and monitor your crypto assets across multiple chains')
            .setColor(0x5865F2)
            .setThumbnail('https://i.imgur.com/AfFp7pu.png')
            .addFields(
                {
                    name: '🌟 Solana Wallet',
                    value: [
                        '```',
                        `Address: ${solPublicKey}`,
                        '```',
                        `Balance: ${solBalance.toFixed(4)} SOL`,
                        `[View on Solscan](https://solscan.io/account/${solPublicKey})`,
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💫 XRP Wallet',
                    value: [
                        '```',
                        `Address: ${xrpPublicKey}`,
                        '```',
                        'Balance: 0.00 XRP',
                        `[View on XRPSCAN](https://xrpscan.com/account/${xrpPublicKey})`,
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({
                text: `Last Updated: ${new Date().toLocaleString()}`,
                iconURL: 'https://i.imgur.com/AfFp7pu.png'
            });

        // Create token balances embed with improved formatting
        let tokenEmbed;
        if (tokenBalances.length > 0) {
            tokenEmbed = new EmbedBuilder()
                .setTitle('🪙 Token Holdings')
                .setDescription('Your token portfolio across different chains')
                .setColor(0x5865F2);

            // Group tokens in sets of 3 for better presentation
            for (let i = 0; i < tokenBalances.length; i += 3) {
                const tokenGroup = tokenBalances.slice(i, i + 3);
                tokenGroup.forEach(token => {
                    tokenEmbed.addFields({
                        name: `${token.name || 'Unknown Token'}`,
                        value: [
                            '```',
                            `Balance: ${token.amount.toFixed(token.decimals)}`,
                            `Mint: ${token.mint.slice(0, 8)}...${token.mint.slice(-8)}`,
                            '```',
                            `[View Token](https://solscan.io/token/${token.mint})`,
                        ].join('\n'),
                        inline: true
                    });
                });
                // Add empty field if needed to maintain 3-column layout
                if (tokenGroup.length < 3) {
                    for (let j = tokenGroup.length; j < 3; j++) {
                        tokenEmbed.addFields({ name: '\u200b', value: '\u200b', inline: true });
                    }
                }
            }
        }

        // Create action buttons with improved styling
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`copy_sol_${solPublicKey}`)
                    .setLabel('Copy SOL Address')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId(`copy_xrp_${xrpPublicKey}`)
                    .setLabel('Copy XRP Address')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('refresh_wallet')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('send_tokens')
                    .setLabel('Send')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📤'),
                new ButtonBuilder()
                    .setCustomId('receive_tokens')
                    .setLabel('Receive')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📥'),
                new ButtonBuilder()
                    .setCustomId('wallet_settings')
                    .setLabel('Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️')
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_menu')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('↩️')
            );

        // Use editReply if deferred, or reply if not
        const replyFunction = interaction.deferred ? 'editReply' : 'reply';
        await interaction[replyFunction]({
            embeds: tokenEmbed ? [walletEmbed, tokenEmbed] : [walletEmbed],
            components: [row1, row2, row3]
        }).catch(async (error) => {
            console.error('Error replying to interaction:', error);
            // Fallback response
            await interaction.followUp({
                content: '❌ Something went wrong. Please try again.',
                ephemeral: true
            }).catch(console.error);
        });

    } catch (error) {
        console.error('Error in handleWalletView:', error);
        const replyFunction = interaction.deferred ? 'editReply' : 'reply';
        await interaction[replyFunction]({
            content: '❌ Error fetching wallet details. Please try again.',
            ephemeral: true
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
                        // Try to delete the message if it exists
                        if (interaction.message) {
                            await interaction.message.delete().catch(() => {
                                console.log('Message already deleted or not found');
                            });
                        }
                        
                        // Send new menu and defer the interaction
                        const newMenu = await sendMainMenu(interaction.channel);
                        await interaction.deferUpdate().catch(console.error);
                        return newMenu;
                    } catch (error) {
                        console.error('Error handling back to menu:', error);
                        // If something goes wrong, just try to show the menu
                        await sendMainMenu(interaction.channel);
                        await interaction.deferUpdate().catch(console.error);
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
