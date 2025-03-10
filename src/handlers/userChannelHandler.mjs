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
 * Redirect user to their personal channel
 * @param {Object} interaction - Discord interaction
 */
export async function redirectToPersonalChannel(interaction) {
    try {
        console.log('[CHANNEL] Creating personal channel for user', interaction.user.id);
        
        // First defer the reply
        await interaction.deferReply({ ephemeral: true });
        
        console.log('[CHANNEL] About to call getOrCreateUserChannel');
        const userChannel = await getOrCreateUserChannel(interaction);
        console.log('[CHANNEL] Channel obtained:', userChannel.id);
        
        // Create the welcome message in the user's channel
        console.log('[CHANNEL] Creating welcome embed');
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('Welcome to Your Personal Trading Channel!')
            .setDescription(`Hello ${interaction.user.toString()}, this is your dedicated channel for trading with Aramid Bot.`)
            .setColor(0x0099FF)
            .addFields(
                { name: 'Privacy', value: 'Only you and server admins can see this channel.', inline: false }
            );

        console.log('[CHANNEL] Sending welcome message to channel');
        await userChannel.send({
            content: `${interaction.user.toString()} Welcome to your personal trading channel!`,
            embeds: [welcomeEmbed]
        });

        console.log('[CHANNEL] Sending crypto research menu');
        // Show the applications menu in the user's channel
        await sendCryptoResearchMenu(userChannel, interaction.user);

        // Send a temporary non-ephemeral message that we can delete
        const redirectMessage = await interaction.channel.send({
            content: `${interaction.user.toString()} I've created a personal trading channel for you: <#${userChannel.id}>. Please continue there!`,
        });
        
        // Delete the message after 10 seconds
        setTimeout(() => {
            redirectMessage.delete().catch(err => {
                console.error('Error deleting redirect message:', err);
            });
        }, 10000);

        // Update the original ephemeral message
        await interaction.editReply({
            content: "✅ Your personal trading channel is ready!",
            ephemeral: true
        });

        console.log('[CHANNEL] Successfully created channel and sent welcome message for', interaction.user.id);
        
    } catch (error) {
        console.error('[CHANNEL] Error creating personal channel:', error);
        await interaction.followUp({
            content: `❌ Error creating personal channel: ${error.message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle interactions in personal channels
 */
export async function handlePersonalChannelInteraction(interaction) {
    // Check if this is a personal channel
    const channelTopic = interaction.channel?.topic;
    if (!channelTopic || !channelTopic.includes('Personal trading channel for')) {
        return false; // Not a personal channel, let other handlers process it
    }
    
    // Extract user ID from channel topic
    const userIdMatch = channelTopic.match(/\((\d+)\)/);
    if (!userIdMatch) {
        console.log('[DEBUG] Could not extract user ID from channel topic');
        return false;
    }
    
    const channelUserId = userIdMatch[1];
    
    // Allow admins to use any channel
    const isAdmin = interaction.member?.permissions.has('ADMINISTRATOR');
    
    // If this is not the user's personal channel (and they're not admin), block the interaction
    if (channelUserId !== interaction.user.id && !isAdmin) {
        if (interaction.isButton() || interaction.isCommand()) {
            await interaction.reply({
                content: "This is someone else's personal trading channel. Please use your own channel or the main bot commands.",
                ephemeral: true
            });
            return true; // We handled it by blocking the interaction
        }
        return false;
    }
    
    // Handle the trading dashboard button
    if (interaction.isButton() && interaction.customId === 'show_trading_dashboard') {
        try {
            await interaction.deferUpdate();
            await showSolanaSpotTradingMenu(interaction);
            return true;
        } catch (error) {
            console.error('Error showing trading dashboard:', error);
            await interaction.followUp({
                content: `Error opening dashboard: ${error.message}`,
                ephemeral: true
            });
            return true;
        }
    }
    
    // Let the regular handlers process other interactions
    return false;
}
