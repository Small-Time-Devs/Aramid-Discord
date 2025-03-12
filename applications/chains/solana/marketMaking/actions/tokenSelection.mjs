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
import { 
    checkUserWallet, 
    getPreviousMMTokens, 
    getMMSettings 
} from '../../../../../src/db/dynamo.mjs';
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
        const { exists, solPublicKey, solanaDepositPublicKey } = await checkUserWallet(userId);
        
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

        // Check if deposit wallet exists
        if (!solanaDepositPublicKey) {
            await interaction.followUp({
                content: "❌ Market making deposit wallet not found. Please return to the dashboard and try again.",
                ephemeral: true
            });
            return;
        }

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
        const { solanaDepositPublicKey } = await checkUserWallet(userId);
        
        // Check if deposit wallet exists
        if (!solanaDepositPublicKey) {
            await interaction.followUp({
                content: "❌ Market making deposit wallet not found. Please return to the dashboard and try again.",
                ephemeral: true
            });
            return;
        }
        
        // Get deposit wallet balance
        const solBalance = await fetchSolBalance(solanaDepositPublicKey);
        
        // Get token balances from deposit wallet
        const tokenBalances = await fetchTokenBalances(solanaDepositPublicKey);
        
        // Get previous MM tokens
        const previousTokens = await getPreviousMMTokens(userId);
        
        const embed = new EmbedBuilder()
            .setTitle('Select Market Making Token')
            .setDescription('Choose a token to provide liquidity for')
            .setColor(0x6E0DAD) // Purple for market making
            .addFields(
                { 
                    name: 'Market Making Wallet Balance', 
                    value: `${solBalance.toFixed(4)} SOL\n${solanaDepositPublicKey}`, 
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
                        name: 'Your Market Making Wallet Tokens', 
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
        
        // Add previous MM tokens if they exist
        if (previousTokens && previousTokens.length > 0) {
            embed.addFields({
                name: 'Previous Market Making Tokens',
                value: 'You have used these tokens for market making before:',
                inline: false
            });
            
            // Create rows for previous tokens
            let prevTokenRow = new ActionRowBuilder();
            let buttonCount = 0;
            const maxButtonsPerRow = 3;
            
            for (const token of previousTokens.slice(0, 6)) { // Limit to 6 previous tokens
                if (buttonCount >= maxButtonsPerRow) {
                    rows.push(prevTokenRow);
                    prevTokenRow = new ActionRowBuilder();
                    buttonCount = 0;
                    
                    // Maximum of 5 rows total
                    if (rows.length >= 5) break;
                }
                
                const tokenLabel = token.symbol || token.tokenMint.substring(0, 8);
                
                prevTokenRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mm_prev_token_${token.tokenMint}`)
                        .setLabel(tokenLabel)
                        .setStyle(ButtonStyle.Success)
                );
                
                buttonCount++;
            }
            
            if (prevTokenRow.components.length > 0) {
                rows.push(prevTokenRow);
            }
        }
        
        // Add some popular tokens as buttons if we have room
        const popularTokensRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_popular_token_rac')
                    .setLabel('RAC')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mm_popular_token_bonk')
                    .setLabel('BONK')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mm_popular_token_jup')
                    .setLabel('JUP')
                    .setStyle(ButtonStyle.Primary)
            );
            
        if (rows.length < 5) {
            rows.push(popularTokensRow);
        }
        
        // Add tokens from the market making deposit wallet as buttons if we have room
        if (tokenBalances && tokenBalances.length > 0 && rows.length < 5) {
            const tokensWithBalance = tokenBalances.filter(token => token.amount > 0);
            const tokensPerRow = 3;
            
            for (let i = 0; i < tokensWithBalance.length; i += tokensPerRow) {
                if (rows.length >= 5) break;
                
                const rowTokens = tokensWithBalance.slice(i, i + tokensPerRow);
                const tokenRow = new ActionRowBuilder();
                
                rowTokens.forEach(token => {
                    tokenRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`mm_token_${token.mint}`)
                            .setLabel(token.name || token.mint.substring(0, 8))
                            .setStyle(ButtonStyle.Secondary)
                    );
                });
                
                if (tokenRow.components.length > 0) {
                    rows.push(tokenRow);
                }
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
        
        await setMarketMakingToken(interaction, tokenAddress);
        
    } catch (error) {
        console.error('Error handling popular token selection for market making:', error);
        await interaction.followUp({
            content: '❌ Error selecting token. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle previous token selection for market making
 */
export async function handlePreviousTokenSelect(interaction) {
    try {
        const tokenAddress = interaction.customId.replace('mm_prev_token_', '');
        await setMarketMakingToken(interaction, tokenAddress);
    } catch (error) {
        console.error('Error handling previous token selection:', error);
        await interaction.followUp({
            content: '❌ Error selecting previous token. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle user token selection for market making
 */
export async function handleUserTokenSelect(interaction) {
    try {
        const tokenAddress = interaction.customId.replace('mm_token_', '');
        await setMarketMakingToken(interaction, tokenAddress);
    } catch (error) {
        console.error('Error handling user token selection:', error);
        await interaction.followUp({
            content: '❌ Error selecting token. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Set market making token and load settings
 */
async function setMarketMakingToken(interaction, tokenAddress) {
    try {
        const userId = interaction.user.id;
        await interaction.deferUpdate();
        
        // Fetch token details and balance using the deposit wallet
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const { solanaDepositPublicKey } = await checkUserWallet(userId);
        
        if (!solanaDepositPublicKey) {
            await interaction.followUp({
                content: "❌ Market making deposit wallet not found. Please return to the dashboard and try again.",
                ephemeral: true
            });
            return;
        }
        
        // Try to get token balance, but don't fail if we can't
        let tokenBalance = null;
        try {
            tokenBalance = await fetchTokenBalance(solanaDepositPublicKey, tokenAddress);
        } catch (balanceError) {
            console.error(`Error fetching token balance for ${tokenAddress}:`, balanceError);
            // Continue with null balance
        }
        
        // Get existing MM settings for this token
        let mmSettings = null;
        try {
            mmSettings = await getMMSettings(userId, tokenAddress);
        } catch (settingsError) {
            console.error(`Error fetching MM settings for token ${tokenAddress}:`, settingsError);
            // Continue without settings
        }
        
        // Initialize or update market making config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {
                userId,
                finalWalletAddress: solanaDepositPublicKey // Use the deposit wallet as final wallet
            };
        }
        
        // Set the token in the config
        state.marketMakerConfig[userId].outputMint = tokenAddress;
        state.marketMakerConfig[userId].tokenMint = tokenAddress; // Ensure both are set for compatibility
        state.marketMakerConfig[userId].tokenName = tokenDetails?.name || 'Unknown Token';
        state.marketMakerConfig[userId].tokenSymbol = tokenDetails?.symbol || '';
        
        // Apply existing settings if available
        if (mmSettings) {
            Object.assign(state.marketMakerConfig[userId], mmSettings);
        }
        
        // Show the market making settings screen
        const { showMarketMakingSettingsForToken } = await import('../ui/settingsMenu.mjs');
        await showMarketMakingSettingsForToken(interaction, tokenDetails, tokenBalance);
        
    } catch (error) {
        console.error('Error setting market making token:', error);
        await interaction.followUp({
            content: `❌ Error selecting token: ${error.message}. Please try again.`,
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
        
        // This could be a new token, so we'll use the setMarketMakingToken function
        await setMarketMakingToken(interaction, tokenAddress);
        
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
