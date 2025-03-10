import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';
import { state } from '../marketMakerMain.mjs';
import { checkUserWallet } from '../../../../../src/db/dynamo.mjs';
import { 
    fetchSolBalance, 
    fetchTokenDetails, 
    fetchTokenBalance,
    fetchTokenBalances
} from '../../spotTrading/functions/utils.mjs';
import { showTokenMakingConfig } from '../ui/tokenConfig.mjs';

/**
 * Handle the "Select Token" button click
 */
export async function handleTokenSelection(interaction) {
    try {
        await interaction.deferUpdate({ ephemeral: true });
        
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

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            return;
        }
        
        // Initialize the market maker configuration for this user
        state.marketMakerConfig[userId] = {
            userId,
            solPublicKey,
            tokenMint: '',
            spreadPercentage: 1, // Default 1% spread
            priceRange: 5,      // Default 5% range
            autoAdjust: true,   // Default auto-adjust enabled
            active: false       // Inactive by default
        };

        // Show token selection options
        await showTokenSelectionOptions(interaction);
        
    } catch (error) {
        console.error('Error handling Select Token for Market Making:', error);
        await interaction.followUp({
            content: '❌ Error processing your request. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Display token selection options for market making
 */
export async function showTokenSelectionOptions(interaction) {
    try {
        const userId = interaction.user.id;
        const { solPublicKey } = await checkUserWallet(userId);
        const solBalance = await fetchSolBalance(solPublicKey);
        
        // Get token balances
        const tokenBalances = await fetchTokenBalances(solPublicKey);
        
        const embed = new EmbedBuilder()
            .setTitle('Select Market Making Token')
            .setDescription('Choose a token to provide liquidity for')
            .setColor(0x6E0DAD) // Purple for market making
            .addFields(
                { 
                    name: 'Wallet Balance', 
                    value: `${solBalance.toFixed(4)} SOL`, 
                    inline: false 
                }
            );
            
        // Add token holdings section if tokens exist
        if (tokenBalances && tokenBalances.length > 0) {
            const tokenList = tokenBalances
                .filter(token => token.amount > 0)
                .map(token => `${token.name}: ${token.amount}`)
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
        
        // Create rows of buttons for tokens
        const rows = [];
        
        // First row: token input and back buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_enter_token_address')
                    .setLabel('Enter Token Address')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('back_to_mm_dashboard')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        rows.push(row1);
        
        // Add some popular tokens as buttons
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_popular_token_rac')
                    .setLabel('RAC')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('mm_popular_token_bonk')
                    .setLabel('BONK')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('mm_popular_token_jup')
                    .setLabel('JUP')
                    .setStyle(ButtonStyle.Success)
            );
        rows.push(row2);
        
        // Add user's tokens as buttons
        if (tokenBalances && tokenBalances.length > 0) {
            const tokensWithBalance = tokenBalances.filter(token => token.amount > 0);
            const tokensPerRow = 3;
            
            for (let i = 0; i < tokensWithBalance.length; i += tokensPerRow) {
                const rowTokens = tokensWithBalance.slice(i, i + tokensPerRow);
                const tokenRow = new ActionRowBuilder();
                
                rowTokens.forEach(token => {
                    tokenRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`mm_token_${token.mint}`)
                            .setLabel(token.name)
                            .setStyle(ButtonStyle.Primary)
                    );
                });
                
                if (tokenRow.components.length > 0) {
                    rows.push(tokenRow);
                }
                
                // Maximum of 5 rows of buttons (including the first 2 rows)
                if (rows.length >= 5) break;
            }
        }
        
        await interaction.editReply({
            embeds: [embed],
            components: rows
        });
        
    } catch (error) {
        console.error('Error showing market maker token options:', error);
        await interaction.followUp({
            content: '❌ Failed to load token options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle popular token selection for market making
 */
export async function handlePopularTokenSelect(interaction) {
    try {
        const tokenKey = interaction.customId.replace('mm_popular_token_', '');
        const userId = interaction.user.id;
        let tokenAddress = '';
        
        // Map token keys to addresses
        switch (tokenKey) {
            case 'rac':
                tokenAddress = 'YtfMZ4jg2ubdz4GsNdJWpJk3YTM5pUdMrFN7N6yvqZA';
                break;
            case 'bonk':
                tokenAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
                break;
            case 'jup':
                tokenAddress = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
                break;
            default:
                await interaction.reply({
                    content: '❌ Invalid token selection.',
                    ephemeral: true
                });
                return;
        }
        
        // Update the market maker config
        state.marketMakerConfig[userId].tokenMint = tokenAddress;
        
        await interaction.deferUpdate();
        
        // Fetch token details and balance
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const { solPublicKey } = await checkUserWallet(userId);
        const tokenBalance = await fetchTokenBalance(solPublicKey, tokenAddress);
        
        // Show token config screen
        await showTokenMakingConfig(interaction, tokenDetails, tokenBalance);
        
    } catch (error) {
        console.error('Error handling popular token selection for market making:', error);
        await interaction.followUp({
            content: '❌ Error selecting token. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle token address input for market making
 */
export async function handleTokenAddressInput(interaction) {
    try {
        console.log('Opening token address modal for market making');
        
        // Create the modal for token address input
        const modal = new ModalBuilder()
            .setCustomId('mm_token_address_modal')
            .setTitle('Enter Token Address');

        const tokenAddressInput = new TextInputBuilder()
            .setCustomId('mm_token_address')
            .setLabel('Token Contract Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter Solana token address')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(tokenAddressInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing token address modal for market making:', error);
        await interaction.reply({
            content: `❌ Failed to open token address input: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle token address submission for market making
 */
export async function handleTokenAddressSubmit(interaction) {
    try {
        // Get the token address from the input field
        const tokenAddress = interaction.fields.getTextInputValue('mm_token_address');
        const userId = interaction.user.id;
        
        // Update configuration with the token address
        state.marketMakerConfig[userId].tokenMint = tokenAddress;
        
        // Defer the reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        
        // Fetch token details with error handling
        let tokenDetails;
        let tokenBalance;
        
        try {
            const { solPublicKey } = await checkUserWallet(userId);
            tokenDetails = await fetchTokenDetails(tokenAddress);
            tokenBalance = await fetchTokenBalance(solPublicKey, tokenAddress);
        } catch (detailsError) {
            console.error('Error fetching token details for market making:', detailsError);
            tokenDetails = { name: 'Unknown Token', symbol: 'UNKNOWN' };
            tokenBalance = null;
        }
        
        // Show the market making configuration screen
        await showTokenMakingConfig(interaction, tokenDetails, tokenBalance);
        
    } catch (error) {
        console.error('Error handling token address modal submission for market making:', error);
        
        // Handle interaction based on its state
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error processing token address: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error processing token address: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}
