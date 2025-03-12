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
import { saveCurrentMarketMakingConfig } from '../config/settings.mjs';

/**
 * Display market making settings menu
 * @param {Object} interaction - Discord interaction
 */
export async function showMarketMakingSettings(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        if (!config) {
            await interaction.followUp({
                content: '❌ Configuration not found. Please return to the dashboard and try again.',
                ephemeral: true
            });
            return;
        }
        
        // Create settings embed
        const embed = new EmbedBuilder()
            .setTitle('Market Making Settings')
            .setDescription('Configure your market making parameters')
            .setColor(0x6E0DAD);
        
        // Basic settings display
        embed.addFields(
            {
                name: 'Token Settings',
                value: [
                    `• Token: ${config.outputMint ? config.outputMint.substring(0, 8) + '...' : 'Not set'}`,
                    `• Slippage: ${config.slippage}%`,
                ].join('\n'),
                inline: false
            },
            {
                name: 'Wallet Settings',
                value: [
                    `• Number of Wallets: ${config.numberOfWallets}`,
                    `• Min Trades per Wallet: ${config.minTrades}`,
                    `• Max Trades per Wallet: ${config.maxTrades}`,
                    `• Leave Dust: ${config.leaveDust}`,
                    config.leaveDust === 'Yes' ? `• Dust Amount: ${config.staticDustAmount}` : '',
                    `• Min SOL Balance: ${config.minSolBalance}`,
                ].filter(Boolean).join('\n'),
                inline: false
            },
            {
                name: 'Trade Settings',
                value: [
                    `• Sell Percentage Type: ${config.sellPercentageType}`,
                    config.sellPercentageType === 'Static' 
                        ? `• Static Sell Percentage: ${config.staticSellPercentage}%` 
                        : `• Sell Range: ${config.rangeMinSellPercentage}% - ${config.rangeMaxSellPercentage}%`,
                    `• Buy Type: ${config.tradeInvestmentType}`,
                    config.tradeInvestmentType === 'Static'
                        ? `• Static Buy Amount: ${config.staticPurchaseAmount} SOL`
                        : `• Buy Range: ${config.rangeMinPurchaseAmount} - ${config.rangeMaxPurchaseAmount} SOL`,
                ].join('\n'),
                inline: false
            }
        );
        
        // Create button rows for settings
        // Row 1: Token settings
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_set_token')
                    .setLabel('Set Token')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mm_set_slippage')
                    .setLabel('Set Slippage')
                    .setStyle(ButtonStyle.Primary)
            );
        
        // Row 2: Wallet settings
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_set_wallets')
                    .setLabel('Set Wallets')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mm_set_min_trades')
                    .setLabel('Min Trades')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mm_set_max_trades')
                    .setLabel('Max Trades')
                    .setStyle(ButtonStyle.Primary)
            );
            
        // Row 3: Dust settings
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_toggle_leave_dust')
                    .setLabel(config.leaveDust === 'Yes' ? 'Disable Dust' : 'Enable Dust')
                    .setStyle(config.leaveDust === 'Yes' ? ButtonStyle.Danger : ButtonStyle.Success),
                config.leaveDust === 'Yes' ? 
                    new ButtonBuilder()
                        .setCustomId('mm_set_dust_amount')
                        .setLabel('Set Dust Amount')
                        .setStyle(ButtonStyle.Primary) :
                    new ButtonBuilder()
                        .setCustomId('mm_set_min_balance')
                        .setLabel('Set Min Balance')
                        .setStyle(ButtonStyle.Primary)
            );
        
        // Row 4: Sell settings
        const row4 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_toggle_sell_type')
                    .setLabel(`Sell Type: ${config.sellPercentageType}`)
                    .setStyle(ButtonStyle.Primary),
                config.sellPercentageType === 'Static' ?
                    new ButtonBuilder()
                        .setCustomId('mm_set_static_sell')
                        .setLabel('Set Sell %')
                        .setStyle(ButtonStyle.Secondary) :
                    new ButtonBuilder()
                        .setCustomId('mm_set_min_sell')
                        .setLabel('Set Min Sell %')
                        .setStyle(ButtonStyle.Secondary),
                config.sellPercentageType === 'Range' ?
                    new ButtonBuilder()
                        .setCustomId('mm_set_max_sell')
                        .setLabel('Set Max Sell %')
                        .setStyle(ButtonStyle.Secondary) :
                    new ButtonBuilder()
                        .setCustomId('mm_toggle_buy_type')
                        .setLabel(`Buy Type: ${config.tradeInvestmentType}`)
                        .setStyle(ButtonStyle.Primary)
            );
        
        // Row 5: Buy settings
        const row5 = new ActionRowBuilder()
            .addComponents(
                config.sellPercentageType === 'Static' ?
                    new ButtonBuilder()
                        .setCustomId('mm_toggle_buy_type')
                        .setLabel(`Buy Type: ${config.tradeInvestmentType}`)
                        .setStyle(ButtonStyle.Primary) :
                    new ButtonBuilder()
                        .setCustomId('placeholder1')
                        .setLabel('⠀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                config.tradeInvestmentType === 'Static' ?
                    new ButtonBuilder()
                        .setCustomId('mm_set_static_buy')
                        .setLabel('Set Buy Amount')
                        .setStyle(ButtonStyle.Secondary) :
                    new ButtonBuilder()
                        .setCustomId('mm_set_min_buy')
                        .setLabel('Set Min Buy')
                        .setStyle(ButtonStyle.Secondary),
                config.tradeInvestmentType === 'Range' ?
                    new ButtonBuilder()
                        .setCustomId('mm_set_max_buy')
                        .setLabel('Set Max Buy')
                        .setStyle(ButtonStyle.Secondary) :
                    new ButtonBuilder()
                        .setCustomId('placeholder2')
                        .setLabel('⠀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
            );
            
        // Bottom row: Save and back buttons
        const bottomRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_save_settings')
                    .setLabel('Save Settings')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_mm_dashboard')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Send the settings menu
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2, row3, row4, row5, bottomRow]
        });
        
    } catch (error) {
        console.error('Error showing market making settings:', error);
        await interaction.followUp({
            content: `❌ Error loading settings: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle settings save button
 * @param {Object} interaction - Discord interaction
 */
export async function handleSaveSettings(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        
        // Save the current configuration
        const success = await saveCurrentMarketMakingConfig(userId);
        
        if (success) {
            await interaction.followUp({
                content: '✅ Market making settings saved successfully!',
                ephemeral: true
            });
            
            // Return to dashboard
            const { showMarketMakerDashboard } = await import('./dashboard.mjs');
            await showMarketMakerDashboard(interaction);
        } else {
            throw new Error('Failed to save settings');
        }
        
    } catch (error) {
        console.error('Error saving market making settings:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Display market making settings for a specific token
 * @param {Object} interaction - Discord interaction
 * @param {Object} tokenDetails - Token details
 * @param {number} tokenBalance - Token balance
 */
export async function showMarketMakingSettingsForToken(interaction, tokenDetails, tokenBalance) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        if (!config) {
            await interaction.followUp({
                content: '❌ Configuration not found. Please return to the dashboard and try again.',
                ephemeral: true
            });
            return;
        }
        
        // Format token details for display
        const tokenName = tokenDetails?.name || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || '';
        const displayName = tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName;
        const tokenMint = config.outputMint || config.tokenMint || config.inputMint;
        
        // Create settings embed
        const embed = new EmbedBuilder()
            .setTitle(`Market Making: ${displayName}`)
            .setDescription('Configure your market making parameters')
            .setColor(0x6E0DAD);
        
        // Add token information
        embed.addFields(
            {
                name: 'Token Details',
                value: [
                    `• Name: ${displayName}`,
                    `• Address: ${tokenMint ? `${tokenMint.substring(0, 8)}...${tokenMint.substring(tokenMint.length - 4)}` : 'Not set'}`,
                    tokenBalance !== null ? `• Your Balance: ${tokenBalance}` : '• Balance: Unknown',
                ].join('\n'),
                inline: false
            }
        );
        
        // Add current settings if they exist
        embed.addFields(
            {
                name: 'Market Making Configuration',
                value: [
                    `• Min Wallet Balance: ${config.minWalletBalance || config.minSolBalance || '0.05'} SOL`,
                    `• Trade Amount Range: ${config.minTradeSolanaAmount || config.rangeMinPurchaseAmount || '0.1'} - ${config.maxTradeSolanaAmount || config.rangeMaxPurchaseAmount || '0.5'} SOL`,
                    `• Trades per Wallet: ${config.minTradesPerWallet || config.minTrades || '1'} - ${config.maxTradesPerWallet || config.maxTrades || '10'}`,
                    `• Status: ${config.isRunning ? '✅ Running' : '❌ Stopped'}`
                ].join('\n'),
                inline: false
            }
        );
        
        // Create button rows for actions
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_set_all_settings')
                    .setLabel('Update Settings')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('mm_save_settings')
                    .setLabel('Save Settings')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💾')
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('select_mm_token')
                    .setLabel('Change Token')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('back_to_mm_dashboard')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        // Send the settings menu
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
        
    } catch (error) {
        console.error('Error showing market making settings for token:', error);
        await interaction.followUp({
            content: `❌ Error loading settings: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle the "Set MM Settings" button that shows the main settings modal
 */
export async function showAllSettingsModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId] || {};
        
        // Create modal for comprehensive settings
        const modal = new ModalBuilder()
            .setCustomId('mm_all_settings_modal')
            .setTitle('Market Making Settings');

        // Minimum wallet balance input
        const minBalanceInput = new TextInputBuilder()
            .setCustomId('mm_min_balance')
            .setLabel('Min SOL Balance (keep in wallet)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.05')
            .setValue(config.minWalletBalance?.toString() || '0.05')
            .setRequired(true);
            
        // Min trade amount
        const minTradeInput = new TextInputBuilder()
            .setCustomId('mm_min_trade_amount')
            .setLabel('Min Trade Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.1')
            .setValue(config.minTradeSolanaAmount?.toString() || '0.1')
            .setRequired(true);
            
        // Max trade amount
        const maxTradeInput = new TextInputBuilder()
            .setCustomId('mm_max_trade_amount')
            .setLabel('Max Trade Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.5')
            .setValue(config.maxTradeSolanaAmount?.toString() || '0.5')
            .setRequired(true);

        // Min trades per wallet
        const minTradesInput = new TextInputBuilder()
            .setCustomId('mm_min_trades_wallet')
            .setLabel('Min Trades per Wallet')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setValue(config.minTradesPerWallet?.toString() || '1')
            .setRequired(true);
            
        // Max trades per wallet
        const maxTradesInput = new TextInputBuilder()
            .setCustomId('mm_max_trades_wallet')
            .setLabel('Max Trades per Wallet')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('10')
            .setValue(config.maxTradesPerWallet?.toString() || '10')
            .setRequired(true);

        // Add all inputs to the modal
        // Note: Discord modals are limited to 5 inputs max
        modal.addComponents(
            new ActionRowBuilder().addComponents(minBalanceInput),
            new ActionRowBuilder().addComponents(minTradeInput),
            new ActionRowBuilder().addComponents(maxTradeInput),
            new ActionRowBuilder().addComponents(minTradesInput),
            new ActionRowBuilder().addComponents(maxTradesInput)
        );

        // Show the modal
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing all settings modal:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle submission of the comprehensive settings modal
 */
export async function handleAllSettingsSubmit(interaction) {
    try {
        const userId = interaction.user.id;
        await interaction.deferReply({ ephemeral: true });
        
        // Get all values from the form
        const minBalance = parseFloat(interaction.fields.getTextInputValue('mm_min_balance'));
        const minTradeAmount = parseFloat(interaction.fields.getTextInputValue('mm_min_trade_amount'));
        const maxTradeAmount = parseFloat(interaction.fields.getTextInputValue('mm_max_trade_amount'));
        const minTrades = parseInt(interaction.fields.getTextInputValue('mm_min_trades_wallet'));
        const maxTrades = parseInt(interaction.fields.getTextInputValue('mm_max_trades_wallet'));
        
        // Validate inputs
        if (isNaN(minBalance) || minBalance < 0.01 || minBalance > 1) {
            await interaction.editReply({
                content: '❌ Please enter a valid minimum SOL balance between 0.01 and 1'
            });
            return;
        }
        
        if (isNaN(minTradeAmount) || minTradeAmount <= 0) {
            await interaction.editReply({
                content: '❌ Minimum trade amount must be greater than 0'
            });
            return;
        }
        
        if (isNaN(maxTradeAmount) || maxTradeAmount <= minTradeAmount) {
            await interaction.editReply({
                content: '❌ Maximum trade amount must be greater than minimum trade amount'
            });
            return;
        }
        
        // Validate min trades
        if (isNaN(minTrades) || minTrades < 1) {
            await interaction.editReply({
                content: '❌ Minimum trades per wallet must be at least 1'
            });
            return;
        }
        
        // Validate max trades
        if (isNaN(maxTrades) || maxTrades < minTrades || maxTrades > 1000) {
            await interaction.editReply({
                content: '❌ Maximum trades per wallet must be greater than minimum trades and less than 1000'
            });
            return;
        }
        
        // Update the config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        // Update config with the new values
        state.marketMakerConfig[userId].minWalletBalance = minBalance;
        state.marketMakerConfig[userId].minTradeSolanaAmount = minTradeAmount;
        state.marketMakerConfig[userId].maxTradeSolanaAmount = maxTradeAmount;
        state.marketMakerConfig[userId].minTradesPerWallet = minTrades;
        state.marketMakerConfig[userId].maxTradesPerWallet = maxTrades;
        
        // For backward compatibility
        state.marketMakerConfig[userId].minSolBalance = minBalance;
        state.marketMakerConfig[userId].rangeMinPurchaseAmount = minTradeAmount;
        state.marketMakerConfig[userId].rangeMaxPurchaseAmount = maxTradeAmount;
        state.marketMakerConfig[userId].minTrades = minTrades;
        state.marketMakerConfig[userId].maxTrades = maxTrades;
        
        // Save to database
        try {
            await saveMMSettingsToDatabase(userId, state.marketMakerConfig[userId]);
            await interaction.editReply({
                content: '✅ Market making settings saved successfully!'
            });
            
            // Show updated settings view
            setTimeout(async () => {
                await showMarketMakingSettingsForToken(interaction, 
                    {
                        name: state.marketMakerConfig[userId].tokenName,
                        symbol: state.marketMakerConfig[userId].tokenSymbol
                    }, 
                    null);
            }, 1000);
            
        } catch (saveError) {
            console.error('Error saving settings to database:', saveError);
            await interaction.editReply({
                content: `❌ Settings were updated but could not be saved to the database: ${saveError.message}`
            });
        }
        
    } catch (error) {
        console.error('Error handling settings submission:', error);
        await interaction.editReply({
            content: `❌ Error saving settings: ${error.message}. Please try again.`
        });
    }
}

/**
 * Save market making settings to the database
 */
async function saveMMSettingsToDatabase(userId, config) {
    try {
        const { saveMMSettings } = await import('../../../src/db/dynamo.mjs');
        
        // Ensure we have the required token address
        if (!config.outputMint && !config.tokenMint && !config.inputMint) {
            throw new Error('Token address is required');
        }
        
        // Use whichever token address is available
        const tokenMint = config.inputMint || config.outputMint || config.tokenMint;
        
        // Create a clean settings object with the expected fields
        const settings = {
            inputMint: tokenMint,
            outputMint: tokenMint,
            tokenMint: tokenMint,
            minWalletBalance: config.minWalletBalance,
            minTradeSolanaAmount: config.minTradeSolanaAmount,
            maxTradeSolanaAmount: config.maxTradeSolanaAmount,
            minTradesPerWallet: config.minTradesPerWallet,
            maxTradesPerWallet: config.maxTradesPerWallet,
            slippage: config.slippage || 0.5,
            tokenName: config.tokenName,
            tokenSymbol: config.tokenSymbol,
            finalWalletAddress: config.finalWalletAddress
        };
        
        // Save to database
        await saveMMSettings(userId, tokenMint, settings);
        return true;
    } catch (error) {
        console.error('Error saving MM settings to database:', error);
        throw error;
    }
}

/**
 * Show static sell percentage modal
 */
async function showStaticSellModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        const modal = new ModalBuilder()
            .setCustomId('mm_static_sell_modal')
            .setTitle('Static Sell Percentage');
                 
        const sellPercentInput = new TextInputBuilder()
            .setCustomId('static_sell_percent')
            .setLabel('Sell Percentage (1-100)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('100')
            .setValue(config.staticSellPercentage?.toString() || '100')
            .setRequired(true);
            
        modal.addComponents(
            new ActionRowBuilder().addComponents(sellPercentInput)
        );
        
        // Show a message that we're proceeding to the next step
        await interaction.editReply({
            content: 'Basic settings saved! Please set your sell percentage in the next dialog.'
        });
        
        // Show the modal after a brief delay
        setTimeout(async () => {
            try {
                await interaction.followUp({
                    content: 'Please complete the sell percentage configuration:',
                    ephemeral: true,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('show_static_sell_modal')
                                    .setLabel('Set Sell Percentage')
                                    .setStyle(ButtonStyle.Primary)
                            )
                    ]
                });
            } catch (err) {
                console.error('Error showing follow-up button:', err);
            }
        }, 500);
        
    } catch (error) {
        console.error('Error showing static sell modal:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Show range sell percentage modal
 */
async function showRangeSellModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        const modal = new ModalBuilder()
            .setCustomId('mm_range_sell_modal')
            .setTitle('Range Sell Percentage');
                
        const minSellInput = new TextInputBuilder()
            .setCustomId('min_sell_percent')
            .setLabel('Minimum Sell Percentage (1-100)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('50')
            .setValue(config.rangeMinSellPercentage?.toString() || '50')
            .setRequired(true);
            
        const maxSellInput = new TextInputBuilder()
            .setCustomId('max_sell_percent')
            .setLabel('Maximum Sell Percentage (1-100)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('100')
            .setValue(config.rangeMaxSellPercentage?.toString() || '100')
            .setRequired(true);
                
        modal.addComponents(
            new ActionRowBuilder().addComponents(minSellInput),
            new ActionRowBuilder().addComponents(maxSellInput)
        );
        
        // Show a message that we're proceeding to the next step
        await interaction.editReply({
            content: 'Basic settings saved! Please set your sell percentage range in the next dialog.'
        });
        
        // Show the modal after a brief delay
        setTimeout(async () => {
            try {
                await interaction.followUp({
                    content: 'Please complete the sell percentage configuration:',
                    ephemeral: true,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('show_range_sell_modal')
                                    .setLabel('Set Sell Percentage Range')
                                    .setStyle(ButtonStyle.Primary)
                            )
                    ]
                });
            } catch (err) {
                console.error('Error showing follow-up button:', err);
            }
        }, 500);
        
    } catch (error) {
        console.error('Error showing range sell modal:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

// Keep the rest of the existing functions, but modify handleStaticSellSubmit and handleRangeSellSubmit
// to show the appropriate buy modals next

/**
 * Handle static sell percentage submission
 */
export async function handleStaticSellSubmit(interaction) {
    try {
        const userId = interaction.user.id;
        await interaction.deferReply({ ephemeral: true });
        
        const sellPercent = parseInt(interaction.fields.getTextInputValue('static_sell_percent'));
        
        // Validate input
        if (isNaN(sellPercent) || sellPercent < 1 || sellPercent > 100) {
            await interaction.editReply({
                content: '❌ Please enter a valid sell percentage between 1 and 100'
            });
            return;
        }
        
        // Update config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        state.marketMakerConfig[userId].staticSellPercentage = sellPercent;
        
        // Show the appropriate buy modal based on the previously selected buy type
        const buyType = state.marketMakerConfig[userId].tradeInvestmentType;
        if (buyType === 'Static') {
            await showStaticBuyModal(interaction);
        } else {
            await showRangeBuyModal(interaction);
        }
        
    } catch (error) {
        console.error('Error handling static sell percentage submission:', error);
        await interaction.editReply({
            content: `❌ Error saving settings: ${error.message}. Please try again.`
        });
    }
}

/**
 * Handle range sell percentage submission
 */
export async function handleRangeSellSubmit(interaction) {
    try {
        const userId = interaction.user.id;
        await interaction.deferReply({ ephemeral: true });
               
        const minSellPercent = parseInt(interaction.fields.getTextInputValue('min_sell_percent'));
        const maxSellPercent = parseInt(interaction.fields.getTextInputValue('max_sell_percent'));
        
        // Validate inputs
        if (isNaN(minSellPercent) || minSellPercent < 1 || minSellPercent > 100) {
            await interaction.editReply({
                content: '❌ Please enter a valid minimum sell percentage between 1 and 100'
            });
            return;
        }
        
        if (isNaN(maxSellPercent) || maxSellPercent < minSellPercent || maxSellPercent > 100) {
            await interaction.editReply({
                content: '❌ Please enter a valid maximum sell percentage between your minimum and 100'
            });
            return;
        }
        
        // Update config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        state.marketMakerConfig[userId].rangeMinSellPercentage = minSellPercent;
        state.marketMakerConfig[userId].rangeMaxSellPercentage = maxSellPercent;
        
        // Show the appropriate buy modal based on the previously selected buy type
        const buyType = state.marketMakerConfig[userId].tradeInvestmentType;
        if (buyType === 'Static') {
            await showStaticBuyModal(interaction);
        } else {
            await showRangeBuyModal(interaction);
        }
        
    } catch (error) {
        console.error('Error handling range sell percentage submission:', error);
        await interaction.editReply({
            content: `❌ Error saving settings: ${error.message}. Please try again.`
        });
    }
}

/**
 * Show static buy amount modal
 */
async function showStaticBuyModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        const modal = new ModalBuilder()
            .setCustomId('mm_static_buy_modal')
            .setTitle('Static Purchase Amount');
                 
        const buyAmountInput = new TextInputBuilder()
            .setCustomId('static_purchase_amount')
            .setLabel('Purchase Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.1')
            .setValue(config.staticPurchaseAmount?.toString() || '0.1')
            .setRequired(true);
            
        modal.addComponents(
            new ActionRowBuilder().addComponents(buyAmountInput)
        );
        
        // Show a message that we're proceeding to the next step
        await interaction.editReply({
            content: 'Sell settings saved! Please set your buy amount in the next dialog.'
        });
        
        // Show the modal after a brief delay
        setTimeout(async () => {
            try {
                await interaction.followUp({
                    content: 'Please complete the buy amount configuration:',
                    ephemeral: true,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('show_static_buy_modal')
                                    .setLabel('Set Buy Amount')
                                    .setStyle(ButtonStyle.Primary)
                            )
                    ]
                });
            } catch (err) {
                console.error('Error showing follow-up button:', err);
            }
        }, 500);
        
    } catch (error) {
        console.error('Error showing static buy modal:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Show range buy amount modal
 */
async function showRangeBuyModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        const modal = new ModalBuilder()
            .setCustomId('mm_range_buy_modal')
            .setTitle('Range Purchase Amount');
                
        const minBuyInput = new TextInputBuilder()
            .setCustomId('min_purchase_amount')
            .setLabel('Minimum Purchase Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.1')
            .setValue(config.rangeMinPurchaseAmount?.toString() || '0.1')
            .setRequired(true);
            
        const maxBuyInput = new TextInputBuilder()
            .setCustomId('max_purchase_amount')
            .setLabel('Maximum Purchase Amount (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.5')
            .setValue(config.rangeMaxPurchaseAmount?.toString() || '0.5')
            .setRequired(true);
                
        modal.addComponents(
            new ActionRowBuilder().addComponents(minBuyInput),
            new ActionRowBuilder().addComponents(maxBuyInput)
        );
        
        // Show a message that we're proceeding to the next step
        await interaction.editReply({
            content: 'Sell settings saved! Please set your buy amount range in the next dialog.'
        });
        
        // Show the modal after a brief delay
        setTimeout(async () => {
            try {
                await interaction.followUp({
                    content: 'Please complete the buy amount configuration:',
                    ephemeral: true,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('show_range_buy_modal')
                                    .setLabel('Set Buy Amount Range')
                                    .setStyle(ButtonStyle.Primary)
                            )
                    ]
                });
            } catch (err) {
                console.error('Error showing follow-up button:', err);
            }
        }, 500);
        
    } catch (error) {
        console.error('Error showing range buy modal:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle static buy amount submission
 */
export async function handleStaticBuySubmit(interaction) {
    try {
        const userId = interaction.user.id;
        await interaction.deferReply({ ephemeral: true });
        
        const purchaseAmount = parseFloat(interaction.fields.getTextInputValue('static_purchase_amount'));
        
        // Validate input
        if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
            await interaction.editReply({
                content: '❌ Please enter a valid purchase amount greater than 0'
            });
            return;
        }
        
        // Update config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        state.marketMakerConfig[userId].staticPurchaseAmount = purchaseAmount;
        
        // Complete settings and show final view
        await finalizeSettings(interaction);
        
    } catch (error) {
        console.error('Error handling static buy amount submission:', error);
        await interaction.editReply({
            content: `❌ Error saving settings: ${error.message}. Please try again.`
        });
    }
}

/**
 * Handle range buy amount submission
 */
export async function handleRangeBuySubmit(interaction) {
    try {
        const userId = interaction.user.id;
        await interaction.deferReply({ ephemeral: true });
               
        const minPurchaseAmount = parseFloat(interaction.fields.getTextInputValue('min_purchase_amount'));
        const maxPurchaseAmount = parseFloat(interaction.fields.getTextInputValue('max_purchase_amount'));
        
        // Validate inputs
        if (isNaN(minPurchaseAmount) || minPurchaseAmount <= 0) {
            await interaction.editReply({
                content: '❌ Please enter a valid minimum purchase amount greater than 0'
            });
            return;
        }
        
        if (isNaN(maxPurchaseAmount) || maxPurchaseAmount <= minPurchaseAmount) {
            await interaction.editReply({
                content: '❌ Please enter a valid maximum purchase amount greater than your minimum amount'
            });
            return;
        }
        
        // Update config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        state.marketMakerConfig[userId].rangeMinPurchaseAmount = minPurchaseAmount;
        state.marketMakerConfig[userId].rangeMaxPurchaseAmount = maxPurchaseAmount;
        
        // Complete settings and show final view
        await finalizeSettings(interaction);
        
    } catch (error) {
        console.error('Error handling range buy amount submission:', error);
        await interaction.editReply({
            content: `❌ Error saving settings: ${error.message}. Please try again.`
        });
    }
}

/**
 * Handle sell type selection (Static or Range)
 */
export async function handleSellTypeSelection(interaction) {
    try {
        const userId = interaction.user.id;
        await interaction.deferUpdate();
        
        // Get the selected type
        const isStatic = interaction.customId === 'mm_sell_type_static';
        
        // Update config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        state.marketMakerConfig[userId].sellPercentageType = isStatic ? 'Static' : 'Range';
        
        if (isStatic) {
            // Show modal for Static percentage
            const modal = new ModalBuilder()
                .setCustomId('mm_static_sell_modal')
                .setTitle('Static Sell Percentage');
                
            const sellPercentInput = new TextInputBuilder()
                .setCustomId('static_sell_percent')
                .setLabel('Sell Percentage (1-100)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('100')
                .setValue(state.marketMakerConfig[userId].staticSellPercentage?.toString() || '100')
                .setRequired(true);
                
            modal.addComponents(
                new ActionRowBuilder().addComponents(sellPercentInput)
            );
            
            await interaction.showModal(modal);
        } else {
            // Show modal for Range percentages
            const modal = new ModalBuilder()
                .setCustomId('mm_range_sell_modal')
                .setTitle('Range Sell Percentage');
                
            const minSellInput = new TextInputBuilder()
                .setCustomId('min_sell_percent')
                .setLabel('Minimum Sell Percentage (1-100)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('50')
                .setValue(state.marketMakerConfig[userId].rangeMinSellPercentage?.toString() || '50')
                .setRequired(true);
                
            const maxSellInput = new TextInputBuilder()
                .setCustomId('max_sell_percent')
                .setLabel('Maximum Sell Percentage (1-100)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('100')
                .setValue(state.marketMakerConfig[userId].rangeMaxSellPercentage?.toString() || '100')
                .setRequired(true);
                
            modal.addComponents(
                new ActionRowBuilder().addComponents(minSellInput),
                new ActionRowBuilder().addComponents(maxSellInput)
            );
            
            await interaction.showModal(modal);
        }
    } catch (error) {
        console.error('Error handling sell type selection:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}. Please try again.`,
            ephemeral: true  
        });
    }
}

/**
 * Handle buy type selection (Static or Range)
 */
export async function handleBuyTypeSelection(interaction) {
    try {
        const userId = interaction.user.id;
        await interaction.deferUpdate();
        
        // Get the selected type
        const isStatic = interaction.customId === 'mm_buy_type_static';
        
        // Update config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        state.marketMakerConfig[userId].tradeInvestmentType = isStatic ? 'Static' : 'Range';
        
        if (isStatic) {
            // Show modal for Static purchase amount
            const modal = new ModalBuilder()
                .setCustomId('mm_static_buy_modal')
                .setTitle('Static Purchase Amount');
                
            const buyAmountInput = new TextInputBuilder()
                .setCustomId('static_purchase_amount')
                .setLabel('Purchase Amount (SOL)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('0.1')
                .setValue(state.marketMakerConfig[userId].staticPurchaseAmount?.toString() || '0.1')
                .setRequired(true);
                
            modal.addComponents(
                new ActionRowBuilder().addComponents(buyAmountInput)
            );
            
            await interaction.showModal(modal);
        } else {
            // Show modal for Range purchase amounts
            const modal = new ModalBuilder()
                .setCustomId('mm_range_buy_modal')
                .setTitle('Range Purchase Amount');
                
            const minBuyInput = new TextInputBuilder()
                .setCustomId('min_purchase_amount')
                .setLabel('Minimum Purchase Amount (SOL)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('0.1')
                .setValue(state.marketMakerConfig[userId].rangeMinPurchaseAmount?.toString() || '0.1')
                .setRequired(true);
                
            const maxBuyInput = new TextInputBuilder()
                .setCustomId('max_purchase_amount')
                .setLabel('Maximum Purchase Amount (SOL)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('0.5')
                .setValue(state.marketMakerConfig[userId].rangeMaxPurchaseAmount?.toString() || '0.5')
                .setRequired(true);
                
            modal.addComponents(
                new ActionRowBuilder().addComponents(minBuyInput),
                new ActionRowBuilder().addComponents(maxBuyInput)
            );
            
            await interaction.showModal(modal);
        }
    } catch (error) {
        console.error('Error handling buy type selection:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}
