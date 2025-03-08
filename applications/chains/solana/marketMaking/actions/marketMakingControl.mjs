import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { state } from '../marketMakerMain.mjs';
import { showMarketMakerDashboard } from '../ui/dashboard.mjs';
import { saveMarketMakingConfig, getMarketMakingConfig } from '../../../../../src/db/dynamo.mjs';
import { fetchTokenDetails, fetchTokenPrice } from '../../spotTrading/functions/utils.mjs';

/**
 * Start market making for a user
 */
export async function handleStartMarketMaking(interaction) {
    try {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        
        // Get the configuration from database
        let config = await getMarketMakingConfig(userId);
        
        if (!config || !config.tokenMint) {
            const embed = new EmbedBuilder()
                .setTitle('Configuration Required')
                .setDescription('You need to configure market making settings first.')
                .setColor(0xFF0000);
                
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
        
        // Update the configuration to active
        config.active = true;
        config.startedAt = new Date().toISOString();
        
        // Create a stripped down version with just the updated fields
        const updatedConfig = {
            tokenMint: config.tokenMint,  // Include tokenMint for identification
            active: config.active,
            startedAt: config.startedAt
        };
        
        // Save the updated config
        await saveMarketMakingConfig(userId, updatedConfig);
        
        // Update the state as well
        if (state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId].active = true;
        }
        
        // Initialize the active session in the state
        state.activeSessions[userId] = {
            tokenMint: config.tokenMint,
            startTime: new Date(),
            ordersFilled: 0,
            volumeSold: 0,
            volumeBought: 0,
            profitLoss: 0
        };
        
        // Show updated dashboard
        await showMarketMakerDashboard(interaction);
        
        // Send confirmation message
        await interaction.followUp({
            content: '✅ Market making bot started successfully! Your bot will now automatically place orders based on your configuration.',
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error starting market making bot:', error);
        await interaction.followUp({
            content: `❌ Error starting market making bot: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Stop market making for a user
 */
export async function handleStopMarketMaking(interaction) {
    try {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        
        // Get the configuration from database
        let config = await getMarketMakingConfig(userId);
        
        if (!config) {
            await interaction.followUp({
                content: '❌ No active market making configuration found.',
                ephemeral: true
            });
            return;
        }
        
        // Update the configuration to inactive
        config.active = false;
        config.stoppedAt = new Date().toISOString();
        
        // Create a stripped down version with just the updated fields
        const updatedConfig = {
            tokenMint: config.tokenMint,  // Include tokenMint for identification
            active: config.active,
            stoppedAt: config.stoppedAt
        };
        
        // Save the updated config
        await saveMarketMakingConfig(userId, updatedConfig);
        
        // Calculate session duration
        let sessionDuration = 'Unknown';
        if (config.startedAt) {
            const startTime = new Date(config.startedAt);
            const endTime = new Date();
            const durationMs = endTime - startTime;
            
            // Format duration as hours and minutes
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            sessionDuration = `${hours}h ${minutes}m`;
        }
        
        // Update the state as well
        if (state.marketMakerConfig[userId]) {
            state.marketMakerConfig[userId].active = false;
        }
        
        // Get session statistics
        const session = state.activeSessions[userId] || {
            ordersFilled: 0,
            volumeSold: 0,
            volumeBought: 0,
            profitLoss: 0
        };
        
        // Create summary embed
        const embed = new EmbedBuilder()
            .setTitle('Market Making Session Summary')
            .setColor(0x00FF00)
            .addFields(
                { 
                    name: 'Session Duration', 
                    value: sessionDuration, 
                    inline: true 
                },
                { 
                    name: 'Orders Filled', 
                    value: `${session.ordersFilled}`, 
                    inline: true 
                },
                { 
                    name: 'Volume', 
                    value: `Bought: ${session.volumeBought} tokens\nSold: ${session.volumeSold} tokens`, 
                    inline: false 
                },
                { 
                    name: 'Profit/Loss', 
                    value: `${session.profitLoss.toFixed(4)} SOL`, 
                    inline: true 
                }
            );
        
        // Clear the active session
        delete state.activeSessions[userId];
        
        // Show the summary
        await interaction.followUp({
            content: '✅ Market making bot stopped successfully!',
            embeds: [embed],
            ephemeral: true
        });
        
        // Show updated dashboard
        await showMarketMakerDashboard(interaction);
        
    } catch (error) {
        console.error('Error stopping market making bot:', error);
        await interaction.followUp({
            content: `❌ Error stopping market making bot: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * View market making statistics
 */
export async function handleViewMarketMakingStats(interaction) {
    try {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        
        // Get the configuration
        let config = await getMarketMakingConfig(userId);
        
        if (!config) {
            await interaction.followUp({
                content: '❌ No market making configuration found.',
                ephemeral: true
            });
            return;
        }
        
        // Get token details
        let tokenDetails = { name: 'Unknown Token', symbol: 'UNKNOWN' };
        let currentPrice = 'Unknown';
        
        try {
            tokenDetails = await fetchTokenDetails(config.tokenMint);
            const price = await fetchTokenPrice(config.tokenMint);
            if (price) currentPrice = `$${price}`;
        } catch (error) {
            console.error('Error fetching token details for stats:', error);
        }
        
        // Get session data
        const isActive = config.active;
        const session = state.activeSessions[userId] || {
            ordersFilled: 0,
            volumeSold: 0,
            volumeBought: 0,
            profitLoss: 0
        };
        
        // Calculate session duration if active
        let sessionDuration = 'N/A';
        if (isActive && config.startedAt) {
            const startTime = new Date(config.startedAt);
            const currentTime = new Date();
            const durationMs = currentTime - startTime;
            
            // Format duration as hours and minutes
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            sessionDuration = `${hours}h ${minutes}m`;
        }
        
        // Create statistics embed
        const embed = new EmbedBuilder()
            .setTitle('Market Making Statistics')
            .setColor(isActive ? 0x00FF00 : 0x0099FF)
            .addFields(
                { 
                    name: 'Token', 
                    value: tokenDetails.symbol ? `${tokenDetails.name} (${tokenDetails.symbol})` : tokenDetails.name, 
                    inline: true 
                },
                { 
                    name: 'Current Price', 
                    value: currentPrice, 
                    inline: true 
                },
                { 
                    name: 'Status', 
                    value: isActive ? '✅ Active' : '❌ Inactive', 
                    inline: true 
                },
                { 
                    name: 'Configuration', 
                    value: [
                        `Spread: ${config.spreadPercentage}%`,
                        `Price Range: ${config.priceRange}%`,
                        `Auto-adjust: ${config.autoAdjust ? 'Enabled' : 'Disabled'}`
                    ].join('\n'), 
                    inline: false 
                }
            );
        
        // Add session data if active
        if (isActive) {
            embed.addFields(
                { 
                    name: 'Session Duration', 
                    value: sessionDuration, 
                    inline: true 
                },
                { 
                    name: 'Orders Filled', 
                    value: `${session.ordersFilled}`, 
                    inline: true 
                },
                { 
                    name: 'Volume', 
                    value: `Bought: ${session.volumeBought} tokens\nSold: ${session.volumeSold} tokens`, 
                    inline: false 
                },
                { 
                    name: 'Profit/Loss', 
                    value: `${session.profitLoss.toFixed(4)} SOL`, 
                    inline: true 
                }
            );
        }
        
        // Add action buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(isActive ? 'stop_market_making' : 'start_market_making')
                    .setLabel(isActive ? 'Stop Market Making' : 'Start Market Making')
                    .setStyle(isActive ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji(isActive ? '⏹️' : '▶️'),
                new ButtonBuilder()
                    .setCustomId('back_to_mm_dashboard')
                    .setLabel('Back to Dashboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        // Send the statistics
        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error viewing market making statistics:', error);
        await interaction.followUp({
            content: `❌ Error loading statistics: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle back to market maker dashboard button
 */
export async function handleBackToMarketMaker(interaction) {
    try {
        await interaction.deferUpdate();
        await showMarketMakerDashboard(interaction);
    } catch (error) {
        console.error('Error returning to market maker dashboard:', error);
        await interaction.followUp({
            content: '❌ Failed to return to dashboard. Please try again.',
            ephemeral: true
        });
    }
}
