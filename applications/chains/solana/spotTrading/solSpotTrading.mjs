import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';
import { 
    fetchSolBalance, 
    fetchTokenBalances, 
    fetchTokenDetails, 
    fetchTokenPrice, 
    getSolanaPriorityFee 
} from './functions/utils.mjs';
import { checkUserWallet, getTradeSettings, saveTradeSettings } from '../../../../src/db/dynamo.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Store token configuration globally
let solanaBuyTokenConfig = {};
let tokenBalancesCache = {};

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

        // Add token holdings and buy buttons
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

                // Create buy buttons for existing tokens
                const tokensPerRow = 3;
                for (let i = 0; i < tokenBalances.length; i += tokensPerRow) {
                    const rowTokens = tokenBalances.slice(i, i + tokensPerRow);
                    const tokenRow = new ActionRowBuilder();

                    rowTokens.forEach(token => {
                        if (token.amount > 0) {
                            tokenRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`buy_more_${token.mint}`)
                                    .setLabel(`Buy ${token.name}`)
                                    .setStyle(ButtonStyle.Success)
                            );
                        }
                    });

                    if (tokenRow.components.length > 0) {
                        rows.push(tokenRow);
                    }
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

/**
 * Handle token address input modal
 */
export async function handleTokenAddressInput(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('token_address_modal')
        .setTitle('Enter Token Address');

    const tokenAddressInput = new TextInputBuilder()
        .setCustomId('token_address')
        .setLabel('Token Contract Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter Solana token address')
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(tokenAddressInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

/**
 * Handle token address submission from modal
 * This handles both token_address_modal and token_address_input_modal
 */
export async function handleTokenAddressSubmit(interaction) {
    try {
        console.log(`⭐ Processing token modal submission with ID: ${interaction.customId}`);
        console.log(`Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Get the token address from the input field
        // Handle both possible field names for backwards compatibility
        let tokenAddress;
        if (interaction.fields.getTextInputValue('token_address')) {
            tokenAddress = interaction.fields.getTextInputValue('token_address');
        } else if (interaction.fields.getTextInputValue('token_address_input')) {
            tokenAddress = interaction.fields.getTextInputValue('token_address_input');
        } else {
            throw new Error('Token address field not found in modal submission');
        }
        
        console.log(`Token address entered: ${tokenAddress}`);
        
        const userId = interaction.user.id;
        
        // Ensure we have a valid configuration
        if (!solanaBuyTokenConfig[userId]) {
            console.log('Creating new configuration for user');
            const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
            if (!exists) {
                await interaction.reply({
                    content: '❌ No wallet found. Please create a wallet first.',
                    ephemeral: true
                });
                return;
            }
            
            const priorityFees = await getSolanaPriorityFee();
            
            solanaBuyTokenConfig[userId] = {
                userId,
                outputMint: '',
                amount: 0.01,
                jito: false,
                solPublicKey,
                solPrivateKey,
                slippage: 50,
                priorityFee: priorityFees.mediumFee,
                priorityFeeSol: priorityFees.mediumFee / LAMPORTS_PER_SOL
            };
        }
        
        // Update configuration with the token address
        solanaBuyTokenConfig[userId].outputMint = tokenAddress;
        console.log('Set token address in configuration');
        
        // Defer the reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        console.log('Reply deferred');
        
        // Fetch token details with error handling
        let tokenDetails = { name: 'Unknown Token', symbol: 'UNKNOWN' };
        let tokenPrice = null;
        
        try {
            console.log('Fetching token details...');
            tokenDetails = await fetchTokenDetails(tokenAddress);
            tokenPrice = await fetchTokenPrice(tokenAddress);
            console.log('Token details retrieved:', tokenDetails ? 'Success' : 'Failed');
        } catch (detailsError) {
            console.error('Error fetching token details:', detailsError);
            // We continue with fallback values already set
        }
        
        // Show the purchase configuration
        await showTokenPurchaseConfigSimplified(interaction, tokenDetails, tokenPrice);
        
    } catch (error) {
        console.error('❌ Error handling token address modal submission:', error);
        
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

/**
 * Handle trading settings display
 */
export async function handleTradeSettings(interaction) {
    const userId = interaction.user.id;
    
    try {
        const settings = await getTradeSettings(userId) || {
            minQuickBuy: 0.1,
            mediumQuickBuy: 0.5,
            largeQuickBuy: 1.0,
            minQuickSell: 0.1,
            mediumQuickSell: 0.5,
            largeQuickSell: 1.0
        };

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Trading Settings')
            .setDescription('Configure your quick trade amounts')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: '📈 Quick Buy Amounts (SOL)',
                    value: [
                        `Min: ${settings.minQuickBuy}`,
                        `Medium: ${settings.mediumQuickBuy}`,
                        `Large: ${settings.largeQuickBuy}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📉 Quick Sell Amounts (SOL)',
                    value: [
                        `Min: ${settings.minQuickSell}`,
                        `Medium: ${settings.mediumQuickSell}`,
                        `Large: ${settings.largeQuickSell}`
                    ].join('\n'),
                    inline: true
                }
            );

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_quick_buy')
                    .setLabel('Set Quick Buy')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('set_quick_sell')
                    .setLabel('Set Quick Sell')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );

        if (interaction.deferred) {
            await interaction.editReply({
                embeds: [embed],
                components: [row1, row2]
            });
        } else {
            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });
        }

    } catch (error) {
        console.error('Error displaying trade settings:', error);
        await interaction.reply({
            content: '❌ Error loading trade settings. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle quick buy settings modal
 */
export async function showQuickBuyModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('quick_buy_modal')
        .setTitle('Set Quick Buy Amounts');

    // Add components to modal
    const minInput = new TextInputBuilder()
        .setCustomId('min_buy')
        .setLabel('Minimum Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.1')
        .setRequired(true);

    const medInput = new TextInputBuilder()
        .setCustomId('med_buy')
        .setLabel('Medium Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0.5')
        .setRequired(true);

    const largeInput = new TextInputBuilder()
        .setCustomId('large_buy')
        .setLabel('Large Buy Amount (SOL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1.0')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(minInput),
        new ActionRowBuilder().addComponents(medInput),
        new ActionRowBuilder().addComponents(largeInput)
    );

    await interaction.showModal(modal);
}

/**
 * Handle quick sell settings modal
 */
export async function showQuickSellModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('quick_sell_modal')
        .setTitle('Set Quick Sell Amounts');

    // Add components to modal
    const minSellInput = new TextInputBuilder()
        .setCustomId('min_sell')
        .setLabel('Minimum Sell Amount (Tokens)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('100')
        .setRequired(true);

    const medSellInput = new TextInputBuilder()
        .setCustomId('med_sell')
        .setLabel('Medium Sell Amount (Tokens)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('500')
        .setRequired(true);

    const largeSellInput = new TextInputBuilder()
        .setCustomId('large_sell')
        .setLabel('Large Sell Amount (Tokens)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1000')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(minSellInput),
        new ActionRowBuilder().addComponents(medSellInput),
        new ActionRowBuilder().addComponents(largeSellInput)
    );

    await interaction.showModal(modal);
}

/**
 * Handle quick buy settings submission
 */
export async function handleQuickBuySubmission(interaction) {
    try {
        const minBuy = parseFloat(interaction.fields.getTextInputValue('min_buy'));
        const medBuy = parseFloat(interaction.fields.getTextInputValue('med_buy'));
        const largeBuy = parseFloat(interaction.fields.getTextInputValue('large_buy'));

        // Validate inputs
        if (isNaN(minBuy) || isNaN(medBuy) || isNaN(largeBuy)) {
            throw new Error('Please enter valid numbers');
        }

        // Save to database
        await saveTradeSettings(interaction.user.id, {
            minQuickBuy: minBuy,
            mediumQuickBuy: medBuy,
            largeQuickBuy: largeBuy
        });

        // Send confirmation
        await interaction.reply({
            content: `✅ Quick buy settings saved:\n• Min: ${minBuy} SOL\n• Medium: ${medBuy} SOL\n• Large: ${largeBuy} SOL`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Quick buy settings error:', error);
        await interaction.reply({
            content: `❌ Failed to save settings: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle quick sell settings submission
 */
export async function handleQuickSellSubmission(interaction) {
    try {
        const minSell = parseFloat(interaction.fields.getTextInputValue('min_sell'));
        const medSell = parseFloat(interaction.fields.getTextInputValue('med_sell'));
        const largeSell = parseFloat(interaction.fields.getTextInputValue('large_sell'));

        // Validate inputs
        if (isNaN(minSell) || isNaN(medSell) || isNaN(largeSell)) {
            throw new Error('Please enter valid numbers');
        }

        // Save to database
        await saveTradeSettings(interaction.user.id, {
            minQuickSell: minSell,
            mediumQuickSell: medSell,
            largeQuickSell: largeSell
        });

        // Send confirmation
        await interaction.reply({
            content: `✅ Quick sell settings saved:\n• Min: ${minSell} tokens\n• Medium: ${medSell} tokens\n• Large: ${largeSell} tokens`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Quick sell settings error:', error);
        await interaction.reply({
            content: `❌ Failed to save settings: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle token selection for buying
 */
export async function handleTokenSelection(interaction) {
    if (!interaction.customId.startsWith('buy_more_')) {
        return;
    }
    
    const tokenMint = interaction.customId.replace('buy_more_', '');
    const userId = interaction.user.id;
    const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
    
    if (!exists) {
        await interaction.reply({
            content: '❌ No wallet found. Please create a wallet first.',
            ephemeral: true
        });
        return;
    }
    
    // Initialize buy config with the selected token
    solanaBuyTokenConfig[userId] = {
        userId,
        outputMint: tokenMint,
        amount: 0.01,
        jito: false,
        solPublicKey,
        solPrivateKey,
        slippage: 50,
        priorityFee: (await getSolanaPriorityFee()).mediumFee,
        priorityFeeSol: (await getSolanaPriorityFee()).mediumFee / LAMPORTS_PER_SOL,
    };

    // Fetch token details
    const tokenDetails = await fetchTokenDetails(tokenMint);
    const tokenPrice = await fetchTokenPrice(tokenMint);
    
    const embed = new EmbedBuilder()
        .setTitle('Token Purchase Setup')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Selected Token', value: tokenDetails?.name || 'Unknown Token', inline: true },
            { name: 'Current Price', value: tokenPrice ? `$${tokenPrice}` : 'Unknown', inline: true },
            { name: 'Contract Address', value: `\`${tokenMint}\``, inline: false }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SET_PURCHASE_AMOUNT')
                .setLabel('Set Amount')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('SET_SLIPPAGE')
                .setLabel('Set Slippage')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('back_to_spot_trading')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}

/**
 * Handle the "Buy New Token" button click
 */
export async function handleBuyNewToken(interaction) {
    try {
        await interaction.deferUpdate({ ephemeral: true });
        
        const userId = interaction.user.id;
        const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
        
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
        
        // Initialize the configuration
        const priorityFees = await getSolanaPriorityFee();
        
        solanaBuyTokenConfig[userId] = {
            userId,
            outputMint: '',
            amount: 0.01,
            jito: false,
            solPublicKey,
            solPrivateKey,
            slippage: 50,
            priorityFee: priorityFees.mediumFee,
            priorityFeeSol: priorityFees.mediumFee / LAMPORTS_PER_SOL
        };

        // Show token input options
        await showTokenBuyOptions(interaction);
        
    } catch (error) {
        console.error('Error handling Buy New Token:', error);
        await interaction.followUp({
            content: '❌ Error processing your request. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Display token buy options
 */
async function showTokenBuyOptions(interaction) {
    try {
        const userId = interaction.user.id;
        const config = solanaBuyTokenConfig[userId];
        const solBalance = await fetchSolBalance(config.solPublicKey);
        
        const embed = new EmbedBuilder()
            .setTitle('Buy New Token')
            .setDescription('Enter a token address or select from popular tokens')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Wallet Balance', 
                    value: `${solBalance.toFixed(4)} SOL`, 
                    inline: false 
                }
            );
            
        // Add popular tokens - you can customize this list
        embed.addFields({
            name: 'Popular Tokens',
            value: 'Click a button below to select a token or enter a custom address',
            inline: false
        });
            
        // Create buttons for input options
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enter_token_address')
                    .setLabel('Enter Token Address')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
            
        // Add some popular tokens as buttons (example)
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('popular_token_rac')
                    .setLabel('RAC')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('popular_token_bonk')
                    .setLabel('BONK')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('popular_token_jup')
                    .setLabel('JUP')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
    } catch (error) {
        console.error('Error showing token buy options:', error);
        await interaction.followUp({
            content: '❌ Failed to load token buy options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle "Enter Token Address" button click
 */
export async function handleEnterTokenAddress(interaction) {
    try {
        console.log('Opening token address modal...');
        
        // Use consistent modal ID and input field name
        const modal = new ModalBuilder()
            .setCustomId('token_address_modal')
            .setTitle('Enter Token Address');

        const tokenAddressInput = new TextInputBuilder()
            .setCustomId('token_address')
            .setLabel('Token Contract Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter Solana token address')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(tokenAddressInput);
        modal.addComponents(row);
        
        console.log('Showing modal with ID:', modal.data.custom_id);
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing token address modal:', error);
        await interaction.reply({
            content: `❌ Failed to open token address input: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle token address submission from modal
 * This handles both token_address_modal and token_address_input_modal
 */
export async function handleTokenAddressSubmit(interaction) {
    try {
        console.log(`⭐ Processing token modal submission with ID: ${interaction.customId}`);
        console.log(`Available fields: ${Array.from(interaction.fields.fields.keys()).join(', ')}`);
        
        // Get the token address from the input field
        // Handle both possible field names for backwards compatibility
        let tokenAddress;
        if (interaction.fields.getTextInputValue('token_address')) {
            tokenAddress = interaction.fields.getTextInputValue('token_address');
        } else if (interaction.fields.getTextInputValue('token_address_input')) {
            tokenAddress = interaction.fields.getTextInputValue('token_address_input');
        } else {
            throw new Error('Token address field not found in modal submission');
        }
        
        console.log(`Token address entered: ${tokenAddress}`);
        
        const userId = interaction.user.id;
        
        // Ensure we have a valid configuration
        if (!solanaBuyTokenConfig[userId]) {
            console.log('Creating new configuration for user');
            const { exists, solPublicKey, solPrivateKey } = await checkUserWallet(userId);
            if (!exists) {
                await interaction.reply({
                    content: '❌ No wallet found. Please create a wallet first.',
                    ephemeral: true
                });
                return;
            }
            
            const priorityFees = await getSolanaPriorityFee();
            
            solanaBuyTokenConfig[userId] = {
                userId,
                outputMint: '',
                amount: 0.01,
                jito: false,
                solPublicKey,
                solPrivateKey,
                slippage: 50,
                priorityFee: priorityFees.mediumFee,
                priorityFeeSol: priorityFees.mediumFee / LAMPORTS_PER_SOL
            };
        }
        
        // Update configuration with the token address
        solanaBuyTokenConfig[userId].outputMint = tokenAddress;
        console.log('Set token address in configuration');
        
        // Defer the reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        console.log('Reply deferred');
        
        // Fetch token details with error handling
        let tokenDetails = { name: 'Unknown Token', symbol: 'UNKNOWN' };
        let tokenPrice = null;
        
        try {
            console.log('Fetching token details...');
            tokenDetails = await fetchTokenDetails(tokenAddress);
            tokenPrice = await fetchTokenPrice(tokenAddress);
            console.log('Token details retrieved:', tokenDetails ? 'Success' : 'Failed');
        } catch (detailsError) {
            console.error('Error fetching token details:', detailsError);
            // We continue with fallback values already set
        }
        
        // Show the purchase configuration
        await showTokenPurchaseConfigSimplified(interaction, tokenDetails, tokenPrice);
        
    } catch (error) {
        console.error('❌ Error handling token address modal submission:', error);
        
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

/**
 * A simpler version of the token purchase config display
 * to minimize potential errors
 */
async function showTokenPurchaseConfigSimplified(interaction, tokenDetails, tokenPrice) {
    try {
        console.log('Creating purchase config display...');
        
        const userId = interaction.user.id;
        const config = solanaBuyTokenConfig[userId];
        
        if (!config) {
            throw new Error('Configuration not found');
        }
        
        // Create a simple embed
        const embed = new EmbedBuilder()
            .setTitle('Token Purchase Setup')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Selected Token', 
                    value: tokenDetails?.name || tokenDetails?.symbol || 'Unknown Token', 
                    inline: true 
                },
                { 
                    name: 'Price', 
                    value: tokenPrice ? `$${tokenPrice}` : 'Unknown', 
                    inline: true 
                },
                { 
                    name: 'Contract Address', 
                    value: `\`${config.outputMint}\``, 
                    inline: false 
                },
                {
                    name: 'Purchase Amount',
                    value: `${config.amount} SOL`,
                    inline: true
                },
                {
                    name: 'Settings',
                    value: `Slippage: ${config.slippage / 100}%\nPriority Fee: ${config.priorityFeeSol.toFixed(6)} SOL`,
                    inline: false
                }
            );
        
        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_purchase_amount')
                    .setLabel('Set Amount')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_slippage')
                    .setLabel('Set Slippage')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('set_priority_fee')
                    .setLabel('Set Priority Fee')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('execute_purchase')
                    .setLabel('Execute Purchase')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_buy_options')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        console.log('Sending embed response...');
        
        // Use editReply as we've already deferred
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
        
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Error showing simplified purchase config:', error);
        await interaction.followUp({
            content: `❌ Error displaying token information: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Show token purchase configuration with improved error handling
 */
async function showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice, isFollowUp = false) {
    try {
        console.log('Showing token purchase config...');
        const userId = interaction.user.id;
        const config = solanaBuyTokenConfig[userId];
        
        if (!config) {
            throw new Error('Configuration not found');
        }
        
        const tokenName = tokenDetails?.name || tokenDetails?.symbol || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || 'UNKNOWN';
        
        const embed = new EmbedBuilder()
            .setTitle('Token Purchase Configuration')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Selected Token', 
                    value: `${tokenName} (${tokenSymbol})`, 
                    inline: true 
                },
                { 
                    name: 'Current Price', 
                    value: tokenPrice ? `$${tokenPrice}` : 'Unknown', 
                    inline: true 
                },
                {
                    name: 'Purchase Amount',
                    value: `${config.amount} SOL`,
                    inline: true
                },
                { 
                    name: 'Contract Address', 
                    value: `\`${config.outputMint}\``, 
                    inline: false 
                },
                {
                    name: 'Settings',
                    value: `Slippage: ${config.slippage / 100}%\nPriority Fee: ${config.priorityFeeSol.toFixed(6)} SOL`,
                    inline: false
                }
            );
            
        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_purchase_amount')
                    .setLabel('Set Amount')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_slippage')
                    .setLabel('Set Slippage')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('set_priority_fee')
                    .setLabel('Set Priority Fee')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('execute_purchase')
                    .setLabel('Execute Purchase')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_buy_options')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        console.log('Preparing response...');
        
        // Handle the response based on the interaction state
        if (isFollowUp) {
            console.log('Sending as editReply...');
            await interaction.editReply({
                embeds: [embed],
                components: [row1, row2]
            });
        } else if (interaction.isModalSubmit()) {
            console.log('Sending as reply to modal...');
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [embed],
                    components: [row1, row2],
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    embeds: [embed],
                    components: [row1, row2]
                });
            }
        } else {
            console.log('Sending as update...');
            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });
        }
        
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Error showing token purchase config:', error);
        
        // Determine the appropriate method to respond based on the interaction state
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error loading purchase configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error loading purchase configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle set purchase amount button
 */
export async function handleSetPurchaseAmount(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('purchase_amount_modal')
            .setTitle('Set Purchase Amount');

        const amountInput = new TextInputBuilder()
            .setCustomId('purchase_amount')
            .setLabel('Amount to spend (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.01')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing purchase amount modal:', error);
        await interaction.reply({
            content: '❌ Failed to open amount input. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle purchase amount input from modal
 */
export async function handlePurchaseAmountSubmit(interaction) {
    try {
        const amount = parseFloat(interaction.fields.getTextInputValue('purchase_amount'));
        const userId = interaction.user.id;
        
        if (isNaN(amount) || amount <= 0) {
            await interaction.reply({
                content: '❌ Please enter a valid amount greater than 0.',
                ephemeral: true
            });
            return;
        }
        
        // Update configuration
        solanaBuyTokenConfig[userId].amount = amount;
        
        // Fetch token details to display updated configuration
        const tokenAddress = solanaBuyTokenConfig[userId].outputMint;
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const tokenPrice = await fetchTokenPrice(tokenAddress);
        
        // Display updated configuration
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice);
        
    } catch (error) {
        console.error('Error handling purchase amount input:', error);
        await interaction.reply({
            content: '❌ Error processing amount. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle set slippage button
 */
export async function handleSetSlippage(interaction) {
    try {
        const userId = interaction.user.id;
        
        const embed = new EmbedBuilder()
            .setTitle('Set Slippage Tolerance')
            .setDescription('Select your preferred slippage tolerance')
            .setColor(0x0099FF);
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('slippage_10')
                    .setLabel('0.1%')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slippage_50')
                    .setLabel('0.5%')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slippage_100')
                    .setLabel('1.0%')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slippage_300')
                    .setLabel('3.0%')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('back_to_purchase_config')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger)
            );
            
        await interaction.update({
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error showing slippage options:', error);
        await interaction.reply({
            content: '❌ Failed to load slippage options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle slippage selection
 */
export async function handleSlippageSelection(interaction) {
    try {
        const slippageKey = interaction.customId.replace('slippage_', '');
        const slippageValue = parseInt(slippageKey);
        const userId = interaction.user.id;
        
        // Update configuration
        solanaBuyTokenConfig[userId].slippage = slippageValue;
        
        // Fetch token details to display updated configuration
        const tokenAddress = solanaBuyTokenConfig[userId].outputMint;
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const tokenPrice = await fetchTokenPrice(tokenAddress);
        
        // Display updated configuration
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice);
        
    } catch (error) {
        console.error('Error handling slippage selection:', error);
        await interaction.reply({
            content: '❌ Error setting slippage. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle back to purchase config button
 */
export async function handleBackToPurchaseConfig(interaction) {
    try {
        const userId = interaction.user.id;
        const tokenAddress = solanaBuyTokenConfig[userId].outputMint;
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const tokenPrice = await fetchTokenPrice(tokenAddress);
        
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice);
    } catch (error) {
        console.error('Error going back to purchase config:', error);
        await interaction.reply({
            content: '❌ Failed to return to purchase configuration. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle back to buy options button
 */
export async function handleBackToBuyOptions(interaction) {
    await showTokenBuyOptions(interaction);
}

/**
 * Handle set priority fee button
 */
export async function handleSetPriorityFee(interaction) {
    try {
        const priorityFees = await getSolanaPriorityFee();
        const userId = interaction.user.id;
        
        const embed = new EmbedBuilder()
            .setTitle('Set Priority Fee')
            .setDescription('Select your preferred priority fee level')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Current Network Fees', 
                    value: [
                        `Low: ${(priorityFees.lowFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
                        `Medium: ${(priorityFees.mediumFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
                        `High: ${(priorityFees.highFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`
                    ].join('\n'), 
                    inline: false 
                }
            );
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fee_low')
                    .setLabel('Low')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('fee_medium')
                    .setLabel('Medium')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('fee_high')
                    .setLabel('High')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('back_to_purchase_config')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger)
            );
            
        await interaction.update({
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error showing priority fee options:', error);
        await interaction.reply({
            content: '❌ Failed to load priority fee options. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle priority fee selection
 */
export async function handlePriorityFeeSelection(interaction) {
    try {
        const feeKey = interaction.customId.replace('fee_', '');
        const userId = interaction.user.id;
        const priorityFees = await getSolanaPriorityFee();
        
        let selectedFee = 0;
        switch (feeKey) {
            case 'low':
                selectedFee = priorityFees.lowFee;
                break;
            case 'medium':
                selectedFee = priorityFees.mediumFee;
                break;
            case 'high':
                selectedFee = priorityFees.highFee;
                break;
            default:
                selectedFee = priorityFees.mediumFee;
        }
        
        // Update configuration
        solanaBuyTokenConfig[userId].priorityFee = selectedFee;
        solanaBuyTokenConfig[userId].priorityFeeSol = selectedFee / LAMPORTS_PER_SOL;
        
        // Fetch token details to display updated configuration
        const tokenAddress = solanaBuyTokenConfig[userId].outputMint;
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const tokenPrice = await fetchTokenPrice(tokenAddress);
        
        // Display updated configuration
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice);
        
    } catch (error) {
        console.error('Error handling priority fee selection:', error);
        await interaction.reply({
            content: '❌ Error setting priority fee. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle execute purchase button
 */
export async function handleExecutePurchase(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const config = solanaBuyTokenConfig[userId];
        
        // Verify we have all required data
        if (!config.outputMint || !config.amount) {
            await interaction.followUp({
                content: '❌ Missing required information for purchase. Please configure properly.',
                ephemeral: true
            });
            return;
        }
        
        // Do some basic validation
        const solBalance = await fetchSolBalance(config.solPublicKey);
        if (solBalance < config.amount) {
            await interaction.followUp({
                content: `❌ Insufficient balance. You have ${solBalance.toFixed(4)} SOL but tried to spend ${config.amount} SOL.`,
                ephemeral: true
            });
            return;
        }
        
        // Show processing message
        await interaction.followUp({
            content: '⏳ Processing your transaction...',
            ephemeral: true
        });
        
        // Here you would integrate with your actual purchase execution logic
        // This is a placeholder - replace with your actual implementation
        try {
            // Call your purchase function here
            // ...

            // Simulate success
            const embed = new EmbedBuilder()
                .setTitle('Transaction Successful')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Token', value: config.outputMint, inline: true },
                    { name: 'Amount Spent', value: `${config.amount} SOL`, inline: true },
                    { name: 'Status', value: 'Completed', inline: true },
                    { name: 'Transaction ID', value: 'Simulated TX ID: 12345...', inline: false }
                );
                
            await interaction.followUp({
                embeds: [embed],
                ephemeral: true
            });
            
        } catch (purchaseError) {
            console.error('Purchase execution error:', purchaseError);
            await interaction.followUp({
                content: `❌ Transaction failed: ${purchaseError.message}`,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('Error handling purchase execution:', error);
        await interaction.followUp({
            content: '❌ An error occurred while processing your purchase. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle back to spot trading button
 */
export async function handleBackToSpotTrading(interaction) {
    await showSolanaSpotTradingMenu(interaction);
}

/**
 * Handle popular token selection
 */
export async function handlePopularTokenSelect(interaction) {
    try {
        const tokenKey = interaction.customId.replace('popular_token_', '');
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
        
        // Update configuration
        solanaBuyTokenConfig[userId].outputMint = tokenAddress;
        
        // Fetch token details
        const tokenDetails = await fetchTokenDetails(tokenAddress);
        const tokenPrice = await fetchTokenPrice(tokenAddress);
        
        // Display token purchase configuration
        await showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice);
        
    } catch (error) {
        console.error('Error handling popular token selection:', error);
        await interaction.reply({
            content: '❌ Error selecting token. Please try again.',
            ephemeral: true
        });
    }
}
