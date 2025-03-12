import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { state } from '../marketMakerMain.mjs';
import { 
    checkUserWallet, 
    getMarketMakingConfig, 
    getTradeSettings,
    generateSolanaDepositWallet
} from '../../../../../src/db/dynamo.mjs';
import { 
    fetchSolBalance, 
    fetchTokenBalances 
} from '../../spotTrading/functions/utils.mjs';
import { isFeatureAvailable, devFeatureMessage } from '../../../../../src/globals/global.mjs';
import { initializeMarketMakingConfig } from '../config/settings.mjs';

/**
 * Display Solana market maker main dashboard
 * @param {Object} interaction - Discord interaction
 * @param {boolean} isFollowUp - Whether to use followUp instead of update
 */
export async function showMarketMakerDashboard(interaction, isFollowUp = false) {
    try {
        const userId = interaction.user.id;
        
        // Check if Solana chain or market maker is in development mode and user is not whitelisted
        if (!isFeatureAvailable('chains', 'solChain', userId) || 
            !isFeatureAvailable('applications', 'marketMaker', userId)) {
            
            // Use the appropriate method based on interaction state to show the dev message
            if (isFollowUp || interaction.replied) {
                await interaction.followUp({
                    content: devFeatureMessage('Solana Market Making'),
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: devFeatureMessage('Solana Market Making'),
                    ephemeral: true
                });
            }
            return;
        }
        
        const { exists, solPublicKey, solanaDepositPublicKey } = await checkUserWallet(userId);

        // Create no wallet embed if no wallet exists
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

            // Use the appropriate method based on interaction state
            await sendResponse(interaction, {
                embeds: [embed],
                components: [row]
            }, isFollowUp);
            
            return;
        }

        // Check if the user has a market making deposit wallet, if not generate one
        let mmDepositPublicKey = solanaDepositPublicKey;
        let mmDepositBalance = 0;
        
        if (!mmDepositPublicKey) {
            // Generate a new market making deposit wallet
            const { solanaDepositPublicKey: newPublicKey } = await generateSolanaDepositWallet(userId);
            mmDepositPublicKey = newPublicKey;
        }
        
        // Fetch wallet balances
        const solBalance = await fetchSolBalance(solPublicKey);
        mmDepositBalance = await fetchSolBalance(mmDepositPublicKey);
        const tokenBalances = await fetchTokenBalances(mmDepositPublicKey);

        // Get market maker config if it exists or initialize new one
        let marketMakerConfig = await getMarketMakingConfig(userId);
        if (!marketMakerConfig) {
            marketMakerConfig = initializeMarketMakingConfig(userId, solPublicKey);
        } else {
            // Store in state for use by other components
            state.marketMakerConfig[userId] = marketMakerConfig;
        }

        // Create main market maker dashboard embed
        const embed = new EmbedBuilder()
            .setTitle('🤖 Solana Market Maker Dashboard')
            .setDescription('Set up your market making strategy and monitor performance')
            .setColor(0x6E0DAD) // Purple for market making
            .addFields(
                {
                    name: 'Market Making Wallet',
                    value: [
                        '```',
                        `SOL Balance: ${mmDepositBalance.toFixed(4)} SOL`,
                        `Address: ${mmDepositPublicKey}`,
                        '```',
                        `[View on Solscan](https://solscan.io/account/${mmDepositPublicKey})`,
                    ].join('\n'),
                    inline: false
                },
                {
                    name: 'Main Wallet',
                    value: [
                        '```',
                        `SOL Balance: ${solBalance.toFixed(4)} SOL`,
                        `Address: ${solPublicKey}`,
                        '```',
                        `[View on Solscan](https://solscan.io/account/${solPublicKey})`,
                    ].join('\n'),
                    inline: false
                }
            );

        // Add configuration status if it exists
        if (marketMakerConfig.outputMint) {
            embed.addFields(
                {
                    name: '📊 Market Making Configuration',
                    value: [
                        `**Token:** ${marketMakerConfig.outputMint.substring(0, 8)}...`,
                        `**Slippage:** ${marketMakerConfig.slippage}%`,
                        `**Wallets:** ${marketMakerConfig.numberOfWallets}`,
                        `**Trades per Wallet:** ${marketMakerConfig.minTrades}-${marketMakerConfig.maxTrades}`,
                        `**Status:** ${marketMakerConfig.isRunning ? '✅ Running' : '❌ Stopped'}`
                    ].join('\n'),
                    inline: false
                }
            );
        }

        // Create a single action row with the three required buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('select_mm_token')
                    .setLabel('Select Token')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🪙'),
                new ButtonBuilder()
                    .setCustomId('view_mm_stats')
                    .setLabel('View Statistics')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('back_to_applications')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );

        // Use the appropriate method based on interaction state
        await sendResponse(interaction, {
            embeds: [embed],
            components: [actionRow]
        }, isFollowUp);

    } catch (error) {
        console.error('Error displaying Market Maker dashboard:', error);
        
        // Safe error handling that won't attempt to reply to an already-replied interaction
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error loading market maker dashboard. Please try again.',
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: '❌ Error loading market maker dashboard. Please try again.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
}

/**
 * Helper function to send a response based on interaction state
 * @param {Object} interaction - Discord interaction
 * @param {Object} responseData - Data to send
 * @param {boolean} isFollowUp - Whether to use followUp
 */
async function sendResponse(interaction, responseData, isFollowUp = false) {
    try {
        if (isFollowUp) {
            // Use followUp which always works even after reply/update
            await interaction.followUp({
                ...responseData,
                ephemeral: true
            });
        } else if (interaction.replied || interaction.deferred) {
            // If interaction already has a reply, use editReply or followUp
            if (interaction.replied) {
                // Use followUp when reply has already been sent
                await interaction.followUp({
                    ...responseData,
                    ephemeral: true
                });
            } else {
                // Use editReply when interaction has been deferred
                await interaction.editReply(responseData);
            }
        } else {
            // If no response has been sent yet, update or reply
            if (interaction.isButton()) {
                // For button interactions, update is preferred
                await interaction.update(responseData);
            } else {
                // For other interactions (like commands), reply is required
                await interaction.reply({
                    ...responseData,
                    ephemeral: true
                });
            }
        }
    } catch (error) {
        console.error('Error sending response:', error);
        // Last resort fallback if all else fails
        try {
            await interaction.followUp({
                content: '❌ Something went wrong displaying the dashboard. Please try again.',
                ephemeral: true
            });
        } catch (fallbackError) {
            console.error('Critical error sending any response:', fallbackError);
            // At this point, we've exhausted all options
        }
    }
}
