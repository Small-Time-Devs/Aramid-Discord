import { PermissionsBitField, ChannelType } from 'discord.js';
import { getTradeSettings, saveTradeSettings } from '../db/dynamo.mjs';

/**
 * Get or create a personal trading channel for a user
 * @param {Object} interaction - Discord interaction
 * @returns {Promise<Object>} - Discord channel object
 */
export async function getOrCreateUserChannel(interaction) {
    // Convert user ID to string to ensure it doesn't exceed Number.MAX_SAFE_INTEGER
    const userId = String(interaction.user.id);
    const userName = interaction.user.username;
    const guild = interaction.guild;
    
    console.log(`[CHANNEL] Checking if user ${userName} (${userId}) already has a channel`);
    
    try {
        // Get the user's settings from the database
        const settings = await getTradeSettings(userId);
        
        // Check if the user already has a channel ID saved
        if (settings && settings.channelId) {
            console.log(`[CHANNEL] Found existing channel ID in settings: ${settings.channelId}`);
            
            // Try to find the channel explicitly by name first - more reliable than by ID across instances
            const channelName = `trading-${userName.toLowerCase()}`;
            const existingChannelsByName = guild.channels.cache.filter(
                ch => ch.name === channelName && ch.type === ChannelType.GuildText
            );
            
            console.log(`[CHANNEL] Found ${existingChannelsByName.size} channels matching name "${channelName}"`);
            
            // If we found a channel by name, use it
            if (existingChannelsByName.size > 0) {
                const existingChannel = existingChannelsByName.first();
                console.log(`[CHANNEL] Using existing channel by name: ${existingChannel.name} (${existingChannel.id})`);
                
                // Update settings if the ID doesn't match - ensure we store as string
                if (settings.channelId !== String(existingChannel.id)) {
                    console.log(`[CHANNEL] Updating stored channel ID from ${settings.channelId} to ${existingChannel.id}`);
                    await saveTradeSettings(userId, {
                        channelId: String(existingChannel.id),
                        channelName: existingChannel.name,
                        guildId: String(guild.id)
                    });
                }
                
                return existingChannel;
            }
            
            // If we didn't find by name, try to get it by ID
            try {
                // Ensure channel ID is handled as string
                const channelById = await guild.channels.fetch(String(settings.channelId)).catch(error => {
                    if (error.code === 10003 || error.code === 50001) { // Unknown Channel or Missing Access
                        console.log(`[CHANNEL] Channel with ID ${settings.channelId} not found or not accessible`);
                        return null;
                    }
                    throw error; // Re-throw any other errors
                });
                
                if (channelById) {
                    console.log(`[CHANNEL] Successfully retrieved channel by ID: ${channelById.name} (${channelById.id})`);
                    return channelById;
                }
                
                console.log('[CHANNEL] Could not find channel by ID, will create a new one');
            } catch (err) {
                if (err.code === 50001 || err.message.includes('Missing Access')) {
                    console.log(`[CHANNEL] Failed to fetch existing channel: ${err.message}`);
                } else {
                    // For any other error, log but continue
                    console.error(`[CHANNEL] Error fetching channel:`, err);
                }
                // We'll fall through to create a new channel
            }
        }
        
        // Check if the channel already exists by name (even if not in settings)
        const channelName = `trading-${userName.toLowerCase()}`;
        const existingChannel = guild.channels.cache.find(
            ch => ch.name === channelName && 
            ch.type === ChannelType.GuildText
        );
        
        if (existingChannel) {
            console.log(`[CHANNEL] Found existing channel by name: ${existingChannel.name} (${existingChannel.id})`);
            
            // Update settings with this channel - ensure IDs are stored as strings
            await saveTradeSettings(userId, {
                channelId: String(existingChannel.id),
                channelName: existingChannel.name,
                guildId: String(guild.id)
            });
            
            return existingChannel;
        }
        
        // Create a new channel - we reach here if:
        // - User doesn't have a channel ID in settings
        // - The channel ID doesn't exist anymore
        // - No channel with the expected name exists
        console.log(`[CHANNEL] Creating new channel for user ${userName}`);
        
        // First, try to find the "Trading" category
        const tradingCategoryName = process.env.TRADING_CATEGORY_NAME || 'Trading';
        console.log(`[CHANNEL] Looking for category: ${tradingCategoryName}`);
        
        let tradingCategory = guild.channels.cache.find(
            ch => ch.type === ChannelType.GuildCategory && ch.name === tradingCategoryName
        );
        
        // If trading category doesn't exist, create it
        if (!tradingCategory) {
            console.log(`[CHANNEL] Creating new category: ${tradingCategoryName}`);
            tradingCategory = await guild.channels.create({
                name: tradingCategoryName,
                type: ChannelType.GuildCategory
            });
        }
        
        // Get admin role for permissions
        const adminRoleName = process.env.ADMIN_ROLE_NAME || 'Aramid-Admin';
        console.log(`[CHANNEL] Adding admin role permissions: ${adminRoleName}`);
        const adminRole = guild.roles.cache.find(role => role.name === adminRoleName);
        
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
        
        // Create the channel and place it in the Trading category
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: `Personal trading channel for ${userName} (${userId})`,
            parent: tradingCategory.id, // Set the category ID
            permissionOverwrites
        });
        
        console.log(`[CHANNEL] Created channel ${channelName} (${channel.id}) for user ${userName} in category ${tradingCategory.name}`);
        
        // Save the channel information to the user's settings - ensure all IDs are saved as strings
        const updatedSettings = {
            channelId: String(channel.id),
            channelName: channel.name,
            guildId: String(guild.id),
            categoryId: String(tradingCategory.id)
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
        // Ensure userId is a string
        userId = String(userId);
        
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
        
        // Ensure ALL IDs are strings
        await saveTradeSettings(String(userId), {
            channelId: String(channelId),
            channelName: channelName,
            guildId: String(guildId)
        });
        return true;
    } catch (error) {
        console.error(`[CHANNEL] Error saving channel info:`, error);
        return false;
    }
}
