import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { checkUserWallet, getTradeSettings } from '../../../../../src/db/dynamo.mjs';
import { state } from '../solSpotTrading.mjs';
import { fetchSolBalance, fetchTokenBalances } from '../functions/utils.mjs';
import { isFeatureAvailable, devFeatureMessage } from '../../../../../src/globals/global.mjs';

/**
 * Show Solana spot trading main dashboard
 * @param {Object} interaction - Discord interaction
 */
export async function showSolanaSpotTradingMenu(interaction) {
    try {
        const userId = interaction.user.id;
        
        // Check if Solana chain or spot trading is in development mode and user is not whitelisted
        if (!isFeatureAvailable('chains', 'solChain', userId) || 
            !isFeatureAvailable('applications', 'spotTrading', userId)) {
            
            // Use the appropriate reply method based on interaction state
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: devFeatureMessage('Solana Spot Trading'),
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: devFeatureMessage('Solana Spot Trading'),
                    ephemeral: true
                });
            }
            return;
        }
        
        // Continue with existing functionality
        const response = await checkUserWallet(userId);
        
        // Check if wallet exists
        if (!response.exists) {
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
                
            // Reply or update based on interaction state
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
            } else if (interaction.isButton()) {
                await interaction.update({
                    embeds: [embed],
                    components: [row]
                });
            } else {
                await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
            }
            return;
        }
        
        // Fetch wallet balances
        const solPublicKey = response.solPublicKey;
        const solBalance = await fetchSolBalance(solPublicKey);
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        
        // Create the main spot trading embed
        const embed = new EmbedBuilder()
            .setTitle('📈 Solana Spot Trading')
            .setDescription('Buy and sell tokens on the Solana blockchain')
            .setColor(0x00FFFF) // Cyan for spot trading
            .addFields(
                {
                    name: 'Wallet Address',
                    value: `\`${solPublicKey}\`\n[View on Solscan](https://solscan.io/account/${solPublicKey})`,
                    inline: false
                },
                {
                    name: 'SOL Balance',
                    value: `${solBalance.toFixed(4)} SOL`,
                    inline: false
                }
            );
            
        // Add token holdings section if there are tokens
        if (tokenBalances && tokenBalances.length > 0) {
            const tokenList = tokenBalances
                .filter(token => token.amount > 0)
                .map(token => `${token.name || token.mint.substr(0, 8)}: ${token.amount}`)
                .slice(0, 5) // Just show first 5 tokens
                .join('\n');
                
            if (tokenList.length > 0) {
                embed.addFields(
                    {
                        name: 'Your Tokens',
                        value: '```\n' + tokenList + '\n```',
                        inline: false
                    }
                );
            }
        }
        
        // Create action buttons - ONLY the Buy/Sell and Settings buttons on main screen
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('SOLANA_TOKEN_BUY')
                    .setLabel('Buy Tokens')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('SOLANA_TOKEN_SELL')
                    .setLabel('Sell Tokens')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💱')
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('trade_settings')
                    .setLabel('Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('back_to_applications')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        // Send response with just the main buttons - no quick buy/sell buttons at this stage
        const components = [row1, row2];
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                embeds: [embed],
                components: components,
                ephemeral: true
            });
        } else if (interaction.isButton()) {
            await interaction.update({
                embeds: [embed],
                components: components
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: components,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('Error showing Solana spot trading menu:', error);
        
        // Safe error handling
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: `❌ Error loading spot trading menu: ${error.message}. Please try again.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ Error loading spot trading menu: ${error.message}. Please try again.`,
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
}
