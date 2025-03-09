import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} from 'discord.js';
import { 
    getTradeSettings, 
    saveTradeSettings 
} from '../db/dynamo.mjs';
import {
    getUserChannels,
    setPrimaryChannel,
    unregisterUserChannel
} from './channelManager.mjs';

/**
 * Display channels management menu
 * @param {Object} interaction - Discord interaction
 */
export async function showChannelsManagementMenu(interaction) {
    try {
        const userId = interaction.user.id;
        const currentChannelId = interaction.channelId;
        
        // Get user's registered channels
        const channels = await getUserChannels(userId);
        const settings = await getTradeSettings(userId);
        const primaryChannel = settings?.primaryChannel || null;
        
        // Create embed for channels management
        const embed = new EmbedBuilder()
            .setTitle('📢 Discord Channels Management')
            .setDescription('Manage your Discord channels for notifications and interactions')
            .setColor(0x3498DB);
            
        // Add current channel info
        embed.addFields({
            name: '🔊 Current Channel',
            value: `ID: \`${currentChannelId}\`\nName: <#${currentChannelId}>`,
            inline: false
        });
        
        // Add registered channels info
        if (channels.length > 0) {
            const channelsList = channels.map(channelId => {
                const isPrimary = channelId === primaryChannel ? ' ✓ (Primary)' : '';
                return `<#${channelId}> - \`${channelId}\`${isPrimary}`;
            }).join('\n');
            
            embed.addFields({
                name: '📋 Your Registered Channels',
                value: channelsList,
                inline: false
            });
        } else {
            embed.addFields({
                name: '📋 Your Registered Channels',
                value: 'No channels registered yet. You can add the current channel using the button below.',
                inline: false
            });
        }
        
        // Create action buttons
        const row1 = new ActionRowBuilder();
        
        // Check if current channel is already registered
        const isCurrentRegistered = channels.includes(currentChannelId);
        
        if (!isCurrentRegistered) {
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId('register_current_channel')
                    .setLabel('Add Current Channel')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕')
            );
        } else {
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId('unregister_current_channel')
                    .setLabel('Remove Current Channel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
        }
        
        // Add primary channel button if current channel is registered
        if (isCurrentRegistered && currentChannelId !== primaryChannel) {
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId('set_primary_channel')
                    .setLabel('Set as Primary')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⭐')
            );
        }
        
        // Add a back button
        row1.addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_settings')
                .setLabel('Back to Settings')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('↩️')
        );
        
        // Send the channels management menu
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
                embeds: [embed],
                components: [row1]
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: [row1],
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error showing channels management menu:', error);
        
        const errorMessage = `❌ Error: ${error.message}. Please try again.`;
        
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({
                content: errorMessage,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: errorMessage,
                ephemeral: true
            });
        }
    }
}

/**
 * Handle channel registration
 * @param {Object} interaction - Discord interaction
 */
export async function handleRegisterChannel(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const channelId = interaction.channelId;
        
        // Get user's registered channels
        const channels = await getUserChannels(userId);
        
        // Register the current channel
        if (!channels.includes(channelId)) {
            // Get current settings
            const settings = await getTradeSettings(userId) || {};
            
            // Add channel to array
            const updatedChannels = [...(settings.channels || []), channelId];
            
            // Update settings
            await saveTradeSettings(userId, {
                channels: updatedChannels
            });
            
            // If this is the first channel, also set it as primary
            if (updatedChannels.length === 1 || !settings.primaryChannel) {
                await saveTradeSettings(userId, {
                    primaryChannel: channelId
                });
            }
            
            await interaction.followUp({
                content: `✅ Channel <#${channelId}> has been registered successfully!`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `⚠️ Channel <#${channelId}> is already registered.`,
                ephemeral: true
            });
        }
        
        // Show the updated menu
        await showChannelsManagementMenu(interaction);
        
    } catch (error) {
        console.error('Error registering channel:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle channel unregistration
 * @param {Object} interaction - Discord interaction
 */
export async function handleUnregisterChannel(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const channelId = interaction.channelId;
        
        // Unregister the current channel
        const result = await unregisterUserChannel(userId, channelId);
        
        if (result.success) {
            // If we removed the primary channel, set a new primary if there are other channels
            const settings = await getTradeSettings(userId) || {};
            if (settings.primaryChannel === channelId && result.channels.length > 0) {
                await saveTradeSettings(userId, {
                    primaryChannel: result.channels[0]
                });
            }
            
            await interaction.followUp({
                content: `✅ Channel <#${channelId}> has been removed from your registered channels.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `⚠️ Could not remove channel: ${result.error || 'Unknown error'}`,
                ephemeral: true
            });
        }
        
        // Show the updated menu
        await showChannelsManagementMenu(interaction);
        
    } catch (error) {
        console.error('Error unregistering channel:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle setting primary channel
 * @param {Object} interaction - Discord interaction
 */
export async function handleSetPrimaryChannel(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const channelId = interaction.channelId;
        
        // Set as primary channel
        const result = await setPrimaryChannel(userId, channelId);
        
        if (result.success) {
            await interaction.followUp({
                content: `✅ Channel <#${channelId}> has been set as your primary channel.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `⚠️ Could not set primary channel: ${result.error || 'Unknown error'}`,
                ephemeral: true
            });
        }
        
        // Show the updated menu
        await showChannelsManagementMenu(interaction);
        
    } catch (error) {
        console.error('Error setting primary channel:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle back to settings button
 */
export async function handleBackToSettings(interaction) {
    try {
        await interaction.deferUpdate();
        
        const userId = interaction.user.id;
        const settings = await getTradeSettings(userId);
        
        // Create settings embed
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Trading Settings')
            .setDescription('Configure your trading preferences')
            .setColor(0x6E0DAD);
            
        // Add quick buy settings section
        embed.addFields({
            name: '💰 Quick Buy Settings',
            value: [
                `Min: ${settings?.minQuickBuy || '0.1'} SOL`,
                `Medium: ${settings?.mediumQuickBuy || '0.5'} SOL`,
                `Large: ${settings?.largeQuickBuy || '1.0'} SOL`
            ].join('\n'),
            inline: true
        });
        
        // Add quick sell settings section
        embed.addFields({
            name: '💱 Quick Sell Settings',
            value: [
                `Min: ${settings?.minQuickSell || '25'}%`,
                `Medium: ${settings?.mediumQuickSell || '50'}%`,
                `Large: ${settings?.largeQuickSell || '100'}%`
            ].join('\n'),
            inline: true
        });
        
        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_quick_buy')
                    .setLabel('Set Quick Buy')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_quick_sell')
                    .setLabel('Set Quick Sell')
                    .setStyle(ButtonStyle.Primary)
            );
            
        // Add channel management button
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('manage_channels')
                    .setLabel('Manage Channels')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📢'),
                new ButtonBuilder()
                    .setCustomId('back_to_spot_trading')
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
        console.error('Error returning to settings:', error);
        await interaction.followUp({
            content: `❌ Error: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}
