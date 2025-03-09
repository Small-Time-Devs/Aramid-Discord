import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { getTradeSettings, saveTradeSettings } from '../db/dynamo.mjs';

/**
 * Creates a dedicated channel for a user or returns existing one
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<Object>} - Channel object
 */
export async function getOrCreateUserChannel(interaction) {
    try {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const guildId = interaction.guild?.id;
        
        if (!guildId) {
            console.error('No guild found in interaction');
            throw new Error('This command must be used in a server');
        }
        
        console.log(`[CHANNEL] Checking if user ${username} (${userId}) already has a channel`);
        
        // Check if user already has a channel stored in their settings
        const userSettings = await getTradeSettings(userId);
        
        // If the user has channelId in their settings, try to find it
        if (userSettings && userSettings.channelId) {
            console.log(`[CHANNEL] Found existing channel ID in settings: ${userSettings.channelId}`);
            
            // Get the actual channel object
            try {
                const channel = await interaction.guild.channels.fetch(userSettings.channelId);
                if (channel) {
                    console.log(`[CHANNEL] Retrieved existing channel: ${channel.name}`);
                    return channel;
                } else {
                    console.log(`[CHANNEL] Channel ${userSettings.channelId} no longer exists, will create a new one`);
                }
            } catch (channelError) {
                console.error(`[CHANNEL] Failed to fetch existing channel:`, channelError);
                // Will proceed to create a new channel
            }
        } else {
            console.log(`[CHANNEL] No channel ID found in user settings, will create one`);
        }
        
        // Create a new channel
        console.log(`[CHANNEL] Creating new channel for user ${username}`);
        
        // Find the "Trading" category or create it if it doesn't exist
        let category = interaction.guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory && c.name === 'Trading'
        );
        
        if (!category) {
            console.log('[CHANNEL] Creating Trading category');
            category = await interaction.guild.channels.create({
                name: 'Trading',
                type: ChannelType.GuildCategory
            });
        }
        
        // Permission overwrites for the new channel
        const permissionOverwrites = [
            {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: userId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            },
            // Give bot permissions to the channel
            {
                id: interaction.client.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles
                ]
            }
        ];
        
        // Add server admins/mods to the channel permissions if needed
        const adminRole = interaction.guild.roles.cache.find(role => 
            role.name === 'Admin' || 
            role.name === 'Administrator' || 
            role.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        if (adminRole) {
            console.log(`[CHANNEL] Adding admin role permissions: ${adminRole.name}`);
            permissionOverwrites.push({
                id: adminRole.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            });
        }
        
        // Create the user's personal channel
        // Remove special characters and spaces from username to create a valid channel name
        const userDisplayName = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const channelName = `trading-${userDisplayName}`;
        
        console.log(`[CHANNEL] Creating channel with name: ${channelName}`);
        
        try {
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: permissionOverwrites,
                topic: `Personal trading channel for ${interaction.user.tag} (${userId})`
            });
            
            console.log(`[CHANNEL] Created channel ${channel.name} (${channel.id}) for user ${username}`);
            
            // Save the channel info along with user's trade settings
            // IMPORTANT: Convert all IDs to strings to avoid integer overflow issues
            await saveTradeSettings(userId, {
                channelId: String(channel.id), // Ensure ID is a string
                channelName: channel.name,
                guildId: String(guildId), // Ensure ID is a string
            });
            
            console.log(`[CHANNEL] Saved channel information to trade settings for ${username}`);
            
            return channel;
        } catch (createError) {
            console.error(`[CHANNEL] Error creating channel:`, createError);
            throw new Error(`Failed to create channel: ${createError.message}`);
        }
    } catch (error) {
        console.error(`[CHANNEL] Error in getOrCreateUserChannel:`, error);
        throw error;
    }
}

/**
 * Get channel for a user based on their Discord ID
 * @param {string} userId - Discord user ID
 * @param {Object} guild - Discord guild object
 * @returns {Promise<Object|null>} - Channel object or null if not found
 */
export async function getUserChannelById(userId, guild) {
    try {
        // Use the existing getTradeSettings function
        const userSettings = await getTradeSettings(userId);
        
        if (!userSettings || !userSettings.channelId) {
            console.log(`[CHANNEL] No channel found for user ${userId}`);
            return null;
        }
        
        try {
            // Ensure the channelId is processed as a string
            const channel = await guild.channels.fetch(String(userSettings.channelId));
            console.log(`[CHANNEL] Found channel ${channel.name} for user ${userId}`);
            return channel;
        } catch (channelError) {
            console.error(`[CHANNEL] Failed to fetch channel for user ${userId}:`, channelError);
            return null;
        }
    } catch (error) {
        console.error(`[CHANNEL] Error getting user channel:`, error);
        return null;
    }
}

/**
 * Save channel info to user's trade settings
 * @param {string} userId - Discord user ID
 * @param {string} channelId - Channel ID to save
 * @param {string} channelName - Channel name
 * @param {string} guildId - Guild ID
 * @returns {Promise<boolean>} - Success status
 */
export async function saveChannelInfo(userId, channelId, channelName, guildId) {
    try {
        console.log(`[CHANNEL] Saving channel ${channelId} info for user ${userId}`);
        // Use the existing saveTradeSettings function to store channel data
        // IMPORTANT: Ensure all IDs are strings
        await saveTradeSettings(userId, {
            channelId: String(channelId), // Ensure ID is a string
            channelName: channelName,
            guildId: String(guildId) // Ensure ID is a string
        });
        return true;
    } catch (error) {
        console.error(`[CHANNEL] Error saving channel info:`, error);
        return false;
    }
}
