import { PermissionsBitField, ChannelType } from 'discord.js';
import { getTradeSettings, saveTradeSettings } from '../db/dynamo.mjs';

/**
 * Get or create a personal trading channel for a user
 * @param {Object} interaction - Discord interaction
 * @returns {Promise<Object>} - Discord channel object
 */
export async function getOrCreateUserChannel(interaction) {
    const userId = interaction.user.id;
    const userName = interaction.user.username;
    const guild = interaction.guild;
    
    console.log(`[CHANNEL] Checking if user ${userName} (${userId}) already has a channel`);
    
    try {
        // Get the user's settings from the database
        const settings = await getTradeSettings(userId);
        
        // Check if the user already has a channel ID saved
        if (settings && settings.channelId) {
            console.log(`[CHANNEL] Found existing channel ID in settings: ${settings.channelId}`);
            
            try {
                // Try to fetch the existing channel
                const existingChannel = await guild.channels.fetch(settings.channelId).catch(error => {
                    // Handle error when the channel is in a different guild
                    if (error.code === 10003 || error.code === 50001) { // Unknown Channel or Missing Access
                        console.log(`[CHANNEL] Channel exists in a different Discord server, creating new channel`);
                        return null;
                    }
                    throw error; // Re-throw any other errors
                });
                
                // If channel exists and we have access, return it
                if (existingChannel) {
                    console.log(`[CHANNEL] Retrieved existing channel: ${existingChannel.name}`);
                    return existingChannel;
                }
                
                // If we reached here, the channel wasn't found or accessible in this guild
                console.log('[CHANNEL] Could not access the existing channel, creating new one');
            } catch (err) {
                // Handle "Missing Access" error specifically (user is in different Discord server)
                if (err.code === 50001 || err.message.includes('Missing Access')) {
                    console.log(`[CHANNEL] Failed to fetch existing channel: ${err.message}`);
                    // We'll fall through to create a new channel
                } else {
                    // For any other error, re-throw
                    throw err;
                }
            }
        }
        
        // Create a new channel - we reach here if:
        // - User doesn't have a channel ID in settings
        // - The channel ID doesn't exist anymore
        // - The channel exists in a different Discord server we can't access
        console.log(`[CHANNEL] Creating new channel for user ${userName}`);
        
        // Get admin role for permissions
        const adminRoleName = process.env.ADMIN_ROLE_NAME || 'Aramid-Admin';
        console.log(`[CHANNEL] Adding admin role permissions: ${adminRoleName}`);
        const adminRole = guild.roles.cache.find(role => role.name === adminRoleName);
        
        // Set up channel permissions
        const channelName = `trading-${userName.toLowerCase()}`;
        console.log(`[CHANNEL] Creating channel with name: ${channelName}`);
        
        // Create permission overwrites for the channel
        const permissionOverwrites = [
            {
                // Default role (@everyone) - deny access
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                // User - allow access to their personal channel
                id: userId,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ];
        
        // Add admin role permissions if available
        if (adminRole) {
            permissionOverwrites.push({
                id: adminRole.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            });
        }
        
        // Create the channel
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: `Personal trading channel for ${userName} (${userId})`,
            permissionOverwrites
        });
        
        console.log(`[CHANNEL] Created channel ${channelName} (${channel.id}) for user ${userName}`);
        
        // Save the channel information to the user's settings
        const updatedSettings = {
            channelId: channel.id,
            channelName: channel.name,
            guildId: guild.id
        };
        await saveTradeSettings(userId, updatedSettings);
        console.log(`[CHANNEL] Saved channel information to trade settings for ${userName}`);
        
        return channel;
    } catch (error) {
        console.error(`[CHANNEL] Error creating channel for ${userName}:`, error);
        throw new Error(`Failed to create channel: ${error.message}`);
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
