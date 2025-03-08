import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} from 'discord.js';
import { fetchSolBalance, fetchTokenBalances } from '../functions/utils.mjs';
import { checkUserWallet } from '../../../../../src/db/dynamo.mjs';

/**
 * Display Solana spot trading main menu
 */
export async function showSolanaSpotTradingMenu(interaction) {
    try {
        const userId = interaction.user.id;
        const { exists, solPublicKey } = await checkUserWallet(userId);

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

            await interaction.update({
                embeds: [embed],
                components: [row]
            });
            return;
        }

        // Fetch wallet balances
        const solBalance = await fetchSolBalance(solPublicKey);
        const tokenBalances = await fetchTokenBalances(solPublicKey);

        // Create main trading menu embed
        const embed = new EmbedBuilder()
            .setTitle('🌟 Solana Spot Trading Dashboard')
            .setDescription('Manage your trades and view your portfolio')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: 'Wallet Balance',
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

        // Create action rows array for all buttons
        const rows = [];

        // Add main action buttons first
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('SOLANA_TOKEN_BUY')
                    .setLabel('Buy New Token')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('SOLANA_TOKEN_SELL')
                    .setLabel('Sell Token')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('📉'),
                new ButtonBuilder()
                    .setCustomId('refresh_trading_view')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );
        rows.push(row1);

        // Add token holdings and action buttons (buy/sell)
        if (tokenBalances && tokenBalances.length > 0) {
            const tokensField = {
                name: '🪙 Token Holdings',
                value: '',
                inline: false
            };

            const tokensList = tokenBalances
                .filter(token => token.amount > 0)
                .map(token => `${token.name}: ${token.amount.toFixed(token.decimals)}`);

            if (tokensList.length > 0) {
                tokensField.value = '```\n' + tokensList.join('\n') + '\n```';
                embed.addFields(tokensField);

                // Create rows of trading buttons for existing tokens
                const tokensWithBalance = tokenBalances.filter(token => token.amount > 0);
                const tokensPerRow = 2; // Using 2 tokens per row since we'll add both buy and sell buttons
                
                for (let i = 0; i < tokensWithBalance.length; i += tokensPerRow) {
                    const rowTokens = tokensWithBalance.slice(i, i + tokensPerRow);
                    const tokenRow = new ActionRowBuilder();
                    
                    // For each token, add both Buy and Sell buttons
                    rowTokens.forEach(token => {
                        // Buy button
                        tokenRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`buy_more_${token.mint}`)
                                .setLabel(`Buy ${token.name}`)
                                .setStyle(ButtonStyle.Success)
                        );
                        
                        // Sell button
                        tokenRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`sell_token_${token.mint}`)
                                .setLabel(`Sell ${token.name}`)
                                .setStyle(ButtonStyle.Danger)
                        );
                    });

                    if (tokenRow.components.length > 0) {
                        rows.push(tokenRow);
                    }
                    
                    // Discord has a limit of 5 rows of components
                    if (rows.length >= 4) break;
                }
            }
        }

        // Add settings/back buttons as the last row
        const lastRow = new ActionRowBuilder()
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
        rows.push(lastRow);

        await interaction.update({
            embeds: [embed],
            components: rows
        });

    } catch (error) {
        console.error('Error displaying Solana trading menu:', error);
        await interaction.reply({
            content: '❌ Error loading trading menu. Please try again.',
            ephemeral: true
        });
    }
}
