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
import { showMarketMakerDashboard } from '../ui/dashboard.mjs';
import { showTokenMakingConfig } from '../ui/tokenConfig.mjs';
import { fetchTokenDetails } from '../../spotTrading/functions/utils.mjs';
import { saveMarketMakingConfig } from '../../../../../src/db/dynamo.mjs';

/**
 * Handle market maker settings button
 */
export async function handleMarketMakerSettings(interaction) {
    try {
        // Import the showMarketMakingSettings function dynamically
        const { showMarketMakingSettings } = await import('../ui/settingsMenu.mjs');
        await showMarketMakingSettings(interaction);
    } catch (error) {
        console.error('Error handling market maker settings:', error);
        await interaction.followUp({
            content: `❌ Error loading settings: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Show spread settings modal
 */
export async function showSpreadSettingsModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId] || {};
        
        // Create modal for spread input
        const modal = new ModalBuilder()
            .setCustomId('mm_spread_modal')
            .setTitle('Set Market Making Spread');

        const spreadInput = new TextInputBuilder()
            .setCustomId('spread_percentage')
            .setLabel('Spread Percentage (0.1 - 10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1.0')
            .setValue(config.spreadPercentage ? config.spreadPercentage.toString() : '1.0')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(spreadInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing spread settings modal:', error);
        await interaction.reply({
            content: `❌ Failed to open spread settings: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle spread settings submission
 */
export async function handleSpreadSettingsSubmit(interaction) {
    try {
        const spreadPercentage = parseFloat(interaction.fields.getTextInputValue('spread_percentage'));
        const userId = interaction.user.id;
        
        // Validate input
        if (isNaN(spreadPercentage) || spreadPercentage < 0.1 || spreadPercentage > 10) {
            await interaction.reply({
                content: '❌ Please enter a valid spread percentage between 0.1 and 10.',
                ephemeral: true
            });
            return;
        }
        
        // Update configuration
        state.marketMakerConfig[userId].spreadPercentage = spreadPercentage;
        
        // Get token details and show updated config
        const tokenMint = state.marketMakerConfig[userId].tokenMint;
        const tokenDetails = await fetchTokenDetails(tokenMint);
        
        await interaction.deferReply({ ephemeral: true });
        await showTokenMakingConfig(interaction, tokenDetails);
        
        await interaction.followUp({
            content: `✅ Spread percentage set to ${spreadPercentage}%`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling spread settings submission:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error saving spread settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error saving spread settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Show price range settings modal
 */
export async function handleRangeSettingsModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId] || {};
        
        // Create modal for price range input
        const modal = new ModalBuilder()
            .setCustomId('mm_range_modal')
            .setTitle('Set Price Range');

        const rangeInput = new TextInputBuilder()
            .setCustomId('price_range')
            .setLabel('Price Range Percentage (1 - 30)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('5.0')
            .setValue(config.priceRange ? config.priceRange.toString() : '5.0')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(rangeInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing range settings modal:', error);
        await interaction.reply({
            content: `❌ Failed to open range settings: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle price range settings submission
 */
export async function handleRangeSettingsSubmit(interaction) {
    try {
        const priceRange = parseFloat(interaction.fields.getTextInputValue('price_range'));
        const userId = interaction.user.id;
        
        // Validate input
        if (isNaN(priceRange) || priceRange < 1 || priceRange > 30) {
            await interaction.reply({
                content: '❌ Please enter a valid price range between 1 and 30%.',
                ephemeral: true
            });
            return;
        }
        
        // Update configuration
        state.marketMakerConfig[userId].priceRange = priceRange;
        
        // Get token details and show updated config
        const tokenMint = state.marketMakerConfig[userId].tokenMint;
        const tokenDetails = await fetchTokenDetails(tokenMint);
        
        await interaction.deferReply({ ephemeral: true });
        await showTokenMakingConfig(interaction, tokenDetails);
        
        await interaction.followUp({
            content: `✅ Price range set to ${priceRange}%`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling range settings submission:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error saving range settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error saving range settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Toggle auto-adjust setting for market making
 */
export async function handleToggleAutoAdjust(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        if (!config) {
            await interaction.followUp({
                content: '❌ Configuration not found. Please restart the setup process.',
                ephemeral: true
            });
            return;
        }
        
        // Toggle the auto-adjust setting
        config.autoAdjust = !config.autoAdjust;
        
        // Get token details and show updated config
        const tokenMint = config.tokenMint;
        const tokenDetails = await fetchTokenDetails(tokenMint);
        
        // Show updated configuration
        await showTokenMakingConfig(interaction, tokenDetails);
        
        await interaction.followUp({
            content: `✅ Auto-adjust ${config.autoAdjust ? 'enabled' : 'disabled'}`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error toggling auto-adjust setting:', error);
        await interaction.followUp({
            content: `❌ Error updating settings: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Save market making configuration to database
 */
export async function handleSaveMarketMakingConfig(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        if (!config || !config.tokenMint) {
            await interaction.followUp({
                content: '❌ Missing required configuration. Please select a token first.',
                ephemeral: true
            });
            return;
        }
        
        // Get token details to include symbol in the saved config
        let tokenDetails;
        try {
            tokenDetails = await fetchTokenDetails(config.tokenMint);
        } catch (error) {
            console.error('Error fetching token details for saving:', error);
            // Continue with limited information
        }
        
        // Create the configuration to save
        const marketMakingConfig = {
            userId: config.userId,
            tokenMint: config.tokenMint,
            tokenSymbol: tokenDetails?.symbol || 'UNKNOWN',
            tokenName: tokenDetails?.name || 'Unknown Token',
            spreadPercentage: config.spreadPercentage,
            priceRange: config.priceRange,
            autoAdjust: config.autoAdjust,
            active: false, // Start inactive
            lastUpdated: new Date().toISOString()
        };
        
        // Save configuration to database
        await saveMarketMakingConfig(userId, marketMakingConfig);
        
        // Show success message
        await interaction.followUp({
            content: '✅ Market making configuration saved successfully!',
            ephemeral: true
        });
        
        // Return to dashboard
        await showMarketMakerDashboard(interaction);
        
    } catch (error) {
        console.error('Error saving market making configuration:', error);
        await interaction.followUp({
            content: `❌ Error saving configuration: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle returning to market maker dashboard
 */
export async function handleBackToMarketMaker(interaction) {
    try {
        await interaction.deferUpdate();
        await showMarketMakerDashboard(interaction);
    } catch (error) {
        console.error('Error returning to market maker dashboard:', error);
        await interaction.followUp({
            content: `❌ Error returning to dashboard: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle advanced settings modal for market making
 */
export async function handleAdvancedSettingsModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId] || {};
        
        // Create modal for advanced settings
        const modal = new ModalBuilder()
            .setCustomId('mm_advanced_modal')
            .setTitle('Advanced Market Making Settings');

        // Order size settings
        const minOrderInput = new TextInputBuilder()
            .setCustomId('min_order_size')
            .setLabel('Minimum Order Size (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.05')
            .setValue(config.minOrderSize?.toString() || '0.05')
            .setRequired(true);

        // Maximum risk setting
        const maxRiskInput = new TextInputBuilder()
            .setCustomId('max_risk')
            .setLabel('Maximum Risk (SOL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('2.0')
            .setValue(config.maxRisk?.toString() || '2.0')
            .setRequired(true);

        // Add rows to modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(minOrderInput),
            new ActionRowBuilder().addComponents(maxRiskInput)
        );

        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing advanced settings modal:', error);
        await interaction.reply({
            content: `❌ Failed to open advanced settings: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle advanced settings submission
 */
export async function handleAdvancedSettingsSubmit(interaction) {
    try {
        const minOrderSize = parseFloat(interaction.fields.getTextInputValue('min_order_size'));
        const maxRisk = parseFloat(interaction.fields.getTextInputValue('max_risk'));
        const userId = interaction.user.id;
        
        // Validate inputs
        if (isNaN(minOrderSize) || minOrderSize <= 0) {
            await interaction.reply({
                content: '❌ Please enter a valid minimum order size greater than 0.',
                ephemeral: true
            });
            return;
        }
        
        if (isNaN(maxRisk) || maxRisk <= 0) {
            await interaction.reply({
                content: '❌ Please enter a valid maximum risk amount greater than 0.',
                ephemeral: true
            });
            return;
        }
        
        // Update configuration
        state.marketMakerConfig[userId].minOrderSize = minOrderSize;
        state.marketMakerConfig[userId].maxRisk = maxRisk;
        
        // Get token details and show updated config
        const tokenMint = state.marketMakerConfig[userId].tokenMint;
        const tokenDetails = await fetchTokenDetails(tokenMint);
        
        await interaction.deferReply({ ephemeral: true });
        await showTokenMakingConfig(interaction, tokenDetails);
        
        await interaction.followUp({
            content: `✅ Advanced settings updated:\n• Minimum Order Size: ${minOrderSize} SOL\n• Maximum Risk: ${maxRisk} SOL`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling advanced settings submission:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error saving advanced settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error saving advanced settings: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}

/**
 * Show modal for slippage input
 */
export async function showSlippageModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId] || {};
        
        const modal = new ModalBuilder()
            .setCustomId('mm_slippage_modal')
            .setTitle('Set Slippage Percentage');

        const slippageInput = new TextInputBuilder()
            .setCustomId('slippage_percentage')
            .setLabel('Slippage Percentage')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.5')
            .setValue(config.slippage ? config.slippage.toString() : '0.5')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(slippageInput));
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing slippage modal:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle slippage modal submission
 */
export async function handleSlippageSubmit(interaction) {
    try {
        const slippage = parseFloat(interaction.fields.getTextInputValue('slippage_percentage'));
        const userId = interaction.user.id;
        
        if (isNaN(slippage) || slippage < 0.1 || slippage > 100) {
            await interaction.reply({
                content: '❌ Please enter a valid slippage between 0.1 and 100%',
                ephemeral: true
            });
            return;
        }
        
        // Update the config
        state.marketMakerConfig[userId].slippage = slippage;
        
        await interaction.deferUpdate();
        
        // Show updated settings
        const { showMarketMakingSettings } = await import('../ui/settingsMenu.mjs');
        await showMarketMakingSettings(interaction);
        
        await interaction.followUp({
            content: `✅ Slippage set to ${slippage}%`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling slippage submission:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Show number of wallets modal
 */
export async function showWalletsModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId] || {};
        
        const modal = new ModalBuilder()
            .setCustomId('mm_wallets_modal')
            .setTitle('Set Number of Trading Wallets');

        const walletsInput = new TextInputBuilder()
            .setCustomId('number_of_wallets')
            .setLabel('Number of Wallets')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('5')
            .setValue(config.numberOfWallets ? config.numberOfWallets.toString() : '5')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(walletsInput));
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing wallets modal:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle wallets modal submission
 */
export async function handleWalletsSubmit(interaction) {
    try {
        const numberOfWallets = parseInt(interaction.fields.getTextInputValue('number_of_wallets'));
        const userId = interaction.user.id;
        
        if (isNaN(numberOfWallets) || numberOfWallets < 1 || numberOfWallets > 100) {
            await interaction.reply({
                content: '❌ Please enter a valid number of wallets between 1 and 100',
                ephemeral: true
            });
            return;
        }
        
        // Update the config
        state.marketMakerConfig[userId].numberOfWallets = numberOfWallets;
        
        await interaction.deferUpdate();
        
        // Show updated settings
        const { showMarketMakingSettings } = await import('../ui/settingsMenu.mjs');
        await showMarketMakingSettings(interaction);
        
        await interaction.followUp({
            content: `✅ Number of trading wallets set to ${numberOfWallets}`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling wallets submission:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Show min trades per wallet modal
 */
export async function showMinTradesModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId] || {};
        
        const modal = new ModalBuilder()
            .setCustomId('mm_min_trades_modal')
            .setTitle('Set Minimum Trades Per Wallet');

        const minTradesInput = new TextInputBuilder()
            .setCustomId('min_trades')
            .setLabel('Minimum Trades')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setValue(config.minTrades ? config.minTrades.toString() : '1')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(minTradesInput));
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing min trades modal:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle min trades modal submission
 */
export async function handleMinTradesSubmit(interaction) {
    try {
        const minTrades = parseInt(interaction.fields.getTextInputValue('min_trades'));
        const userId = interaction.user.id;
        
        if (isNaN(minTrades) || minTrades < 1 || minTrades > 100) {
            await interaction.reply({
                content: '❌ Please enter a valid number of minimum trades between 1 and 100',
                ephemeral: true
            });
            return;
        }
        
        // Update the config
        state.marketMakerConfig[userId].minTrades = minTrades;
        
        await interaction.deferUpdate();
        
        // Show updated settings
        const { showMarketMakingSettings } = await import('../ui/settingsMenu.mjs');
        await showMarketMakingSettings(interaction);
        
        await interaction.followUp({
            content: `✅ Minimum trades per wallet set to ${minTrades}`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling min trades submission:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Show max trades per wallet modal
 */
export async function showMaxTradesModal(interaction) {
    try {
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId] || {};
        
        const modal = new ModalBuilder()
            .setCustomId('mm_max_trades_modal')
            .setTitle('Set Maximum Trades Per Wallet');

        const maxTradesInput = new TextInputBuilder()
            .setCustomId('max_trades')
            .setLabel('Maximum Trades')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('10')
            .setValue(config.maxTrades ? config.maxTrades.toString() : '10')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(maxTradesInput));
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing max trades modal:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle max trades modal submission
 */
export async function handleMaxTradesSubmit(interaction) {
    try {
        const maxTrades = parseInt(interaction.fields.getTextInputValue('max_trades'));
        const userId = interaction.user.id;
        
        if (isNaN(maxTrades) || maxTrades < 1 || maxTrades > 1000) {
            await interaction.reply({
                content: '❌ Please enter a valid number of maximum trades between 1 and 1000',
                ephemeral: true
            });
            return;
        }
        
        // Update the config
        state.marketMakerConfig[userId].maxTrades = maxTrades;
        
        await interaction.deferUpdate();
        
        // Show updated settings
        const { showMarketMakingSettings } = await import('../ui/settingsMenu.mjs');
        await showMarketMakingSettings(interaction);
        
        await interaction.followUp({
            content: `✅ Maximum trades per wallet set to ${maxTrades}`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling max trades submission:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}