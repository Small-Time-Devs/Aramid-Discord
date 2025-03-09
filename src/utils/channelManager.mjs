import { getTradeSettings, saveTradeSettings } from '../db/dynamo.mjs';

/**
 * Register a channel for a user
 * @param {string} userId - Discord user ID
 * @param {string} channelId - Discord channel ID
 * @returns {Promise<Object>} - Result of the operation
 */
export async function registerUserChannel(userId, channelId) {
    try {
        // Get current user settings using existing function
        const settings = await getTradeSettings(userId) || {};
        
        // Initialize channels array if it doesn't exist
        if (!settings.channels) {
            settings.channels = [];
        }
        
        // Check if this channel is already registered
        if (!settings.channels.includes(channelId)) {
            settings.channels.push(channelId);
            
            // Update user settings with the new channel using existing function
            await saveTradeSettings(userId, { 
                channels: settings.channels 
            });
            
            console.log(`Registered channel ${channelId} for user ${userId}`);
            return { success: true, channels: settings.channels };
        } else {
            console.log(`Channel ${channelId} already registered for user ${userId}`);
            return { success: true, alreadyRegistered: true, channels: settings.channels };
        }
    } catch (error) {
        console.error(`Error registering channel for user ${userId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Unregister a channel for a user
 * @param {string} userId - Discord user ID
 * @param {string} channelId - Discord channel ID
 * @returns {Promise<Object>} - Result of the operation
 */
export async function unregisterUserChannel(userId, channelId) {
    try {
        // Get current user settings
        const settings = await getTradeSettings(userId) || {};
        
        // Check if channels array exists
        if (!settings.channels) {
            return { success: true, noChannels: true };
        }
        
        // Remove the channel if it exists
        if (settings.channels.includes(channelId)) {
            settings.channels = settings.channels.filter(ch => ch !== channelId);
            
            // Update user settings with the modified channel list
            await saveTradeSettings(userId, { 
                channels: settings.channels 
            });
            
            console.log(`Unregistered channel ${channelId} for user ${userId}`);
            return { success: true, channels: settings.channels };
        } else {
            console.log(`Channel ${channelId} not found for user ${userId}`);
            return { success: true, notRegistered: true, channels: settings.channels };
        }
    } catch (error) {
        console.error(`Error unregistering channel for user ${userId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all channels registered for a user
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array<string>>} - Array of channel IDs
 */
export async function getUserChannels(userId) {
    try {
        const settings = await getTradeSettings(userId) || {};
        return settings.channels || [];
    } catch (error) {
        console.error(`Error getting channels for user ${userId}:`, error);
        return [];
    }
}

/**
 * Check if a channel is registered for a user
 * @param {string} userId - Discord user ID
 * @param {string} channelId - Discord channel ID
 * @returns {Promise<boolean>} - True if the channel is registered
 */
export async function isChannelRegistered(userId, channelId) {
    try {
        const channels = await getUserChannels(userId);
        return channels.includes(channelId);
    } catch (error) {
        console.error(`Error checking if channel ${channelId} is registered for user ${userId}:`, error);
        return false;
    }
}

/**
 * Set user's primary channel
 * @param {string} userId - Discord user ID
 * @param {string} channelId - Discord channel ID to set as primary
 * @returns {Promise<Object>} - Result of the operation
 */
export async function setPrimaryChannel(userId, channelId) {
    try {
        // Get current user settings
        const settings = await getTradeSettings(userId) || {};
        
        // Make sure the channel is registered
        if (!settings.channels || !settings.channels.includes(channelId)) {
            // Register the channel first if it's not already registered
            await registerUserChannel(userId, channelId);
        }
        
        // Update primary channel setting
        await saveTradeSettings(userId, { primaryChannel: channelId });
        
        console.log(`Set primary channel ${channelId} for user ${userId}`);
        return { success: true, primaryChannel: channelId };
    } catch (error) {
        console.error(`Error setting primary channel for user ${userId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user's primary channel
 * @param {string} userId - Discord user ID
 * @returns {Promise<string|null>} - Primary channel ID or null if not set
 */
export async function getPrimaryChannel(userId) {
    try {
        const settings = await getTradeSettings(userId) || {};
        
        // Return primary channel if set
        if (settings.primaryChannel) {
            return settings.primaryChannel;
        }
        
        // If no primary channel but channels exist, return the first one
        if (settings.channels && settings.channels.length > 0) {
            return settings.channels[0];
        }
        
        // No channels registered
        return null;
    } catch (error) {
        console.error(`Error getting primary channel for user ${userId}:`, error);
        return null;
    }
}
