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
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const config = state.marketMakerConfig[userId];
        
        if (!config || !config.tokenMint) {
            // If no token selected, direct user to token selection
            const embed = new EmbedBuilder()
                .setTitle('Select Token First')
                .setDescription('You need to select a token for market making before configuring settings.')
                .setColor(0xFF9900);
                
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('select_mm_token')
                        .setLabel('Select Token')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('back_to_mm_dashboard')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️')
                );
                
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            return;
        }
        
        // Fetch token details
        const tokenDetails = await fetchTokenDetails(config.tokenMint);
        
        // Show token configuration screen
        await showTokenMakingConfig(interaction, tokenDetails);
        
    } catch (error) {
        console.error('Error handling market maker settings:', error);
        await interaction.followUp({
            content: `❌ Error loading settings: ${error.message}. Please try again.`,
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