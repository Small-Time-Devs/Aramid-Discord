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
                    `• Address: ${config.outputMint.substring(0, 8)}...${config.outputMint.substring(config.outputMint.length - 4)}`,
                    tokenBalance !== null ? `• Your Balance: ${tokenBalance}` : '• Balance: Unknown',
                ].join('\n'),
                inline: false
            }
        );
        
        // Add current settings if they exist
        if (config.slippage !== undefined) {
            embed.addFields(
                {
                    name: 'Current Configuration',
                    value: [
                        `• Slippage: ${config.slippage}%`,
                        `• Number of Wallets: ${config.numberOfWallets || 5}`,
                        `• Trades per Wallet: ${config.minTrades || 1}-${config.maxTrades || 10}`,
                        `• Leave Dust: ${config.leaveDust || 'No'}`,
                        `• Min SOL Balance: ${config.minSolBalance || 0.05} SOL`,
                        `• Sell Type: ${config.sellPercentageType || 'Static'}`,
                        `• Buy Type: ${config.tradeInvestmentType || 'Range'}`
                    ].join('\n'),
                    inline: false
                }
            );
        }
        
        // Create button rows for actions
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_set_all_settings')
                    .setLabel('Set MM Settings')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('mm_view_detailed_settings')
                    .setLabel('View Detailed Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mm_save_settings')
                    .setLabel('Save Settings')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💾'),
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

        // Slippage input
        const slippageInput = new TextInputBuilder()
            .setCustomId('mm_slippage')
            .setLabel('Slippage % (0.1-10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.5')
            .setValue(config.slippage?.toString() || '0.5')
            .setRequired(true);
            
        // Number of wallets input
        const walletsInput = new TextInputBuilder()
            .setCustomId('mm_num_wallets')
            .setLabel('Number of Wallets (1-100)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('5')
            .setValue(config.numberOfWallets?.toString() || '5')
            .setRequired(true);
            
        // Min/Max trades input
        const tradesInput = new TextInputBuilder()
            .setCustomId('mm_trades')
            .setLabel('Min-Max Trades per Wallet (format: 1-10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1-10')
            .setValue(`${config.minTrades || '1'}-${config.maxTrades || '10'}`)
            .setRequired(true);
            
        // Min SOL balance input
        const minBalanceInput = new TextInputBuilder()
            .setCustomId('mm_min_balance')
            .setLabel('Min SOL Balance (0.01-1)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.05')
            .setValue(config.minSolBalance?.toString() || '0.05')
            .setRequired(true);
            
        // Buy/Sell Type input
        const typeInput = new TextInputBuilder()
            .setCustomId('mm_types')
            .setLabel('Sell/Buy Type (format: Static/Range)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Static/Range')
            .setValue(`${config.sellPercentageType || 'Static'}/${config.tradeInvestmentType || 'Range'}`)
            .setRequired(true);

        // Add all inputs to the modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(slippageInput),
            new ActionRowBuilder().addComponents(walletsInput),
            new ActionRowBuilder().addComponents(tradesInput),
            new ActionRowBuilder().addComponents(minBalanceInput),
            new ActionRowBuilder().addComponents(typeInput)
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
        const slippage = parseFloat(interaction.fields.getTextInputValue('mm_slippage'));
        const numWallets = parseInt(interaction.fields.getTextInputValue('mm_num_wallets'));
        const tradesRange = interaction.fields.getTextInputValue('mm_trades');
        const minBalance = parseFloat(interaction.fields.getTextInputValue('mm_min_balance'));
        const types = interaction.fields.getTextInputValue('mm_types');
        
        // Parse the min/max trades
        let minTrades = 1;
        let maxTrades = 10;
        if (tradesRange.includes('-')) {
            const [min, max] = tradesRange.split('-').map(val => parseInt(val.trim()));
            minTrades = min || 1;
            maxTrades = max || 10;
        }
        
        // Parse sell/buy types
        let sellPercentageType = 'Static';
        let tradeInvestmentType = 'Range';
        if (types.includes('/')) {
            const [sell, buy] = types.split('/').map(val => val.trim());
            sellPercentageType = ['Static', 'Range'].includes(sell) ? sell : 'Static';
            tradeInvestmentType = ['Static', 'Range'].includes(buy) ? buy : 'Range';
        }
        
        // Validate inputs
        if (isNaN(slippage) || slippage < 0.1 || slippage > 10) {
            await interaction.editReply({
                content: '❌ Please enter a valid slippage between 0.1 and 10%'
            });
            return;
        }
        
        if (isNaN(numWallets) || numWallets < 1 || numWallets > 100) {
            await interaction.editReply({
                content: '❌ Please enter a valid number of wallets between 1 and 100'
            });
            return;
        }
        
        if (minTrades < 1 || maxTrades < minTrades) {
            await interaction.editReply({
                content: '❌ Invalid trade range. Min must be at least 1, and Max must be greater than or equal to Min.'
            });
            return;
        }
        
        if (isNaN(minBalance) || minBalance < 0.01 || minBalance > 1) {
            await interaction.editReply({
                content: '❌ Please enter a valid minimum SOL balance between 0.01 and 1'
            });
            return;
        }
        
        // Update the config
        if (!state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId] = {};
        }
        
        state.marketMakerConfig[userId].slippage = slippage;
        state.marketMakerConfig[userId].numberOfWallets = numWallets;
        state.marketMakerConfig[userId].minTrades = minTrades;
        state.marketMakerConfig[userId].maxTrades = maxTrades;
        state.marketMakerConfig[userId].minSolBalance = minBalance;
        state.marketMakerConfig[userId].sellPercentageType = sellPercentageType;
        state.marketMakerConfig[userId].tradeInvestmentType = tradeInvestmentType;
        
        // Set default values for other settings
        if (sellPercentageType === 'Static' && !state.marketMakerConfig[userId].staticSellPercentage) {
            state.marketMakerConfig[userId].staticSellPercentage = 100;
        }
        if (sellPercentageType === 'Range') {
            if (!state.marketMakerConfig[userId].rangeMinSellPercentage) {
                state.marketMakerConfig[userId].rangeMinSellPercentage = 50;
            }
            if (!state.marketMakerConfig[userId].rangeMaxSellPercentage) {
                state.marketMakerConfig[userId].rangeMaxSellPercentage = 100;
            }
        }
        if (tradeInvestmentType === 'Static' && !state.marketMakerConfig[userId].staticPurchaseAmount) {
            state.marketMakerConfig[userId].staticPurchaseAmount = 0.1;
        }
        if (tradeInvestmentType === 'Range') {
            if (!state.marketMakerConfig[userId].rangeMinPurchaseAmount) {
                state.marketMakerConfig[userId].rangeMinPurchaseAmount = 0.1;
            }
            if (!state.marketMakerConfig[userId].rangeMaxPurchaseAmount) {
                state.marketMakerConfig[userId].rangeMaxPurchaseAmount = 0.5;
            }
        }
        
        // Get token details
        const tokenMint = state.marketMakerConfig[userId].outputMint;
        try {
            const { fetchTokenDetails, fetchTokenBalance } = await import('../../spotTrading/functions/utils.mjs');
            const { checkUserWallet } = await import('../../../../../src/db/dynamo.mjs');
            
            const tokenDetails = await fetchTokenDetails(tokenMint);
            const { solPublicKey } = await checkUserWallet(userId);
            const tokenBalance = await fetchTokenBalance(solPublicKey, tokenMint);
            
            // Show updated settings
            await showMarketMakingSettingsForToken(interaction, tokenDetails, tokenBalance);
            
            await interaction.followUp({
                content: '✅ Market making settings updated successfully!',
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error fetching token details after settings update:', error);
            
            // Show generic success message and return to settings menu
            await interaction.editReply({
                content: '✅ Market making settings updated successfully!'
            });
            
            await showMarketMakingSettings(interaction);
        }
        
    } catch (error) {
        console.error('Error handling all settings submit:', error);
        await interaction.editReply({
            content: `❌ Error saving settings: ${error.message}. Please try again.`
        });
    }
}
