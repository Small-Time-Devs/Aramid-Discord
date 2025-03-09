import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { getOrCreateUserChannel } from '../services/channelManager.mjs';
import { showSolanaSpotTradingMenu } from '../../applications/chains/solana/spotTrading/ui/dashboard.mjs';

/**
 * Sends the full Crypto Research Assistant menu to a channel
 * @param {Object} channel - Discord channel
 * @param {Object} user - Discord user object
 * @returns {Promise<Object>} - Sent message
 */
async function sendCryptoResearchMenu(channel, user) {
    const embed = new EmbedBuilder()
        .setTitle('🤖 Crypto Research Assistant')
        .setDescription(`Welcome ${user.toString()}! Your advanced cryptocurrency research and management companion`)
        .setColor(0x5865F2)
        .addFields(
            {
                name: '🔐 Security Features',
                value: '• Two-Factor Authentication (2FA)\n• Secure wallet management\n• Protected transactions',
                inline: true
            },
            {
                name: '💰 Wallet Features',
                value: '• Multi-chain support\n• Balance tracking\n• Transaction history\n• Secure transfers',
                inline: true
            },
            {
                name: '📊 Research Tools',
                value: '• Token analysis\n• Market statistics\n• DeFi insights\n• Price tracking',
                inline: true
            }
        )
        .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        .setFooter({
            text: '24/7 Crypto Assistant | Version 1.0',
            iconURL: 'https://i.imgur.com/AfFp7pu.png'
        })
        .setTimestamp();
        
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('quick_start')
                .setLabel('Quick Start')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🚀'),
            new ButtonBuilder()
                .setCustomId('applications')
                .setLabel('Applications')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔧'),
            new ButtonBuilder()
                .setCustomId('view_wallet')
                .setLabel('View Wallet')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💼')
        );
        
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('show_tutorial')
                .setLabel('Tutorial')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📚'),
            new ButtonBuilder()
                .setCustomId('settings')
                .setLabel('Settings')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚙️'),
            new ButtonBuilder()
                .setCustomId('help')
                .setLabel('Help')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❓')
        );
        
    return await channel.send({
        embeds: [embed],
        components: [row1, row2]
    });
}

/**
 * Redirects a user to their personal trading channel and starts the bot there
 * @param {Object} interaction - Discord interaction
 */
export async function redirectToPersonalChannel(interaction) {
    try {
        console.log(`[CHANNEL] Creating personal channel for user ${interaction.user.id}`);
        await interaction.deferReply({ ephemeral: true });
        
        // Add explicit debug logs to track execution
        console.log('[CHANNEL] About to call getOrCreateUserChannel');
        
        // Get or create user's personal channel
        const userChannel = await getOrCreateUserChannel(interaction);
        console.log(`[CHANNEL] Channel obtained: ${userChannel ? userChannel.id : 'none'}`);
        
        if (!userChannel) {
            throw new Error('Failed to create or find personal channel');
        }
        
        // More explicit logging
        console.log('[CHANNEL] Creating welcome embed');
        
        // First send a brief welcome message to the user's channel
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('Welcome to Your Personal Trading Channel!')
            .setDescription(`Hello ${interaction.user.toString()}, this is your dedicated channel for trading with Aramid Bot.`)
            .setColor(0x0099FF)
            .addFields(
                { name: 'Privacy', value: 'Only you and server admins can see this channel.', inline: false }
            );
        
        console.log('[CHANNEL] Sending welcome message to channel');
        
        // Send the welcome message to the user's channel
        await userChannel.send({
            content: `${interaction.user.toString()} Welcome to your personal trading channel!`,
            embeds: [welcomeEmbed]
        }).catch(err => console.error(`[CHANNEL] Error sending welcome message:`, err));
        
        // Now send the full crypto research assistant menu
        console.log('[CHANNEL] Sending crypto research menu');
        await sendCryptoResearchMenu(userChannel, interaction.user)
            .catch(err => console.error(`[CHANNEL] Error sending crypto menu:`, err));
        
        console.log('[CHANNEL] Sending redirect message to user');
        
        // Redirect the user to their channel
        await interaction.editReply({
            content: `I've created a personal trading channel for you: <#${userChannel.id}>. Please continue there!`,
            ephemeral: true
        }).catch(err => console.error(`[CHANNEL] Error sending redirect:`, err));
        
        console.log(`[CHANNEL] Successfully created channel and sent welcome message for ${interaction.user.id}`);
        
    } catch (error) {
        console.error(`[CHANNEL] Error redirecting to personal channel:`, error);
        
        await interaction.editReply({
            content: `Sorry, I couldn't create your personal channel: ${error.message}. Please contact an admin.`,
            ephemeral: true
        }).catch(err => console.error(`[CHANNEL] Error sending failure response:`, err));
    }
}

// Update the handler for the new button ID
export async function handlePersonalChannelInteraction(interaction) {
    // Add debug logging
    console.log(`[DEBUG] Checking if ${interaction.customId || 'unknown'} is in a personal channel`);
    
    // Check if this is a personal channel
    const channelTopic = interaction.channel?.topic;
    if (!channelTopic || !channelTopic.includes('Personal trading channel for')) {
        console.log('[DEBUG] Not a personal channel, skipping specialized handler');
        return false; // Not a personal channel, let other handlers process it
    }
    
    // Extract user ID from channel topic
    const userIdMatch = channelTopic.match(/\((\d+)\)/);
    if (!userIdMatch) {
        console.log('[DEBUG] Could not extract user ID from channel topic');
        return false;
    }
    
    const channelUserId = userIdMatch[1];
    console.log(`[DEBUG] Channel belongs to user ${channelUserId}, interaction from ${interaction.user.id}`);
    
    // Allow admins to use any channel
    const isAdmin = interaction.member?.permissions.has('ADMINISTRATOR');
    
    // If this is not the user's personal channel (and they're not admin), block the interaction
    if (channelUserId !== interaction.user.id && !isAdmin) {
        console.log(`[DEBUG] User ${interaction.user.id} tried to use another user's channel`);
        
        if (interaction.isButton() || interaction.isCommand()) {
            await interaction.reply({
                content: "This is someone else's personal trading channel. Please use your own channel or the main bot commands.",
                ephemeral: true
            });
            return true; // We handled it by blocking the interaction
        }
        return false;
    }
    
    // Handle the new dashboard button
    if (interaction.isButton() && interaction.customId === 'show_trading_dashboard') {
        console.log('[CHANNEL] Opening trading dashboard');
        try {
            await interaction.deferUpdate().catch(err => console.log('[CHANNEL] Error deferring update:', err));
            await showSolanaSpotTradingMenu(interaction);
            return true;
        } catch (error) {
            console.error('[CHANNEL] Error showing trading dashboard:', error);
            await interaction.followUp({
                content: `Error opening dashboard: ${error.message}`,
                ephemeral: true
            }).catch(err => console.error('[CHANNEL] Error sending error response:', err));
            return true;
        }
    }
    
    // Let the regular handlers process other interactions
    console.log('[DEBUG] Letting regular handlers process interaction in personal channel');
    return false;
}
