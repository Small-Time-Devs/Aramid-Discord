import { 
    EmbedBuilder,
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { fetchTokenInfo } from './utils/tokenInfoFetcher.mjs';
import { displayTokenResearch } from './ui/researchDisplay.mjs';

// Track current research sessions
export const state = {
    activeResearch: {}
};

/**
 * Display the coin research entry screen
 * @param {Object} interaction - Discord interaction
 */
export async function showCoinResearchMenu(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const embed = new EmbedBuilder()
            .setTitle('🔍 Solana Coin Research Tool')
            .setDescription('Research tokens on Solana blockchain. Enter a contract address to get detailed information.')
            .setColor(0x00AAFF)
            .addFields(
                {
                    name: 'How to use',
                    value: 'Click the button below to enter a Solana token contract address. You\'ll get information about the token such as market cap, TVL, volume, and more.'
                }
            );
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('research_enter_address')
                    .setLabel('Enter Token Address')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔎'),
                new ButtonBuilder()
                    .setCustomId('back_to_applications')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
            
        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error showing coin research menu:', error);
        await interaction.followUp({
            content: '❌ Error displaying coin research tool. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Show modal for entering token address - SUPER SIMPLIFIED
 * @param {Object} interaction - Discord interaction
 */
export async function showAddressEntryModal(interaction) {
    try {
        console.log('[COIN RESEARCH] Creating address entry modal');
        
        // Create the simplest possible modal
        const modal = new ModalBuilder()
            .setCustomId('coin_research_address_modal')
            .setTitle('Research Solana Token');
            
        // Create a very simple text input with minimal options
        const addressInput = new TextInputBuilder()
            .setCustomId('token_address')
            .setLabel('Token Contract Address')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        // Add input to modal
        modal.addComponents(new ActionRowBuilder().addComponents(addressInput));
        
        // Show the modal
        await interaction.showModal(modal);
        console.log('[COIN RESEARCH] Modal shown successfully');
        
    } catch (error) {
        console.error('[COIN RESEARCH] Error showing token address modal:', error);
        // Try to respond with an error message
        try {
            await interaction.reply({
                content: '❌ Error showing address input. Please try again.',
                ephemeral: true
            });
        } catch (replyError) {
            console.error('[COIN RESEARCH] Error sending error reply:', replyError);
        }
    }
}

/**
 * Handle address submission and start research - FIXED TO MATCH TOKEN SELECTION PATTERN
 * @param {Object} interaction - Modal submit interaction
 */
export async function handleAddressSubmit(interaction) {
    try {
        // First defer the reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        console.log('[COIN RESEARCH] Processing coin research address submission');
        
        // Get token address from modal fields
        const tokenAddress = interaction.fields.getTextInputValue('token_address');
        console.log(`[COIN RESEARCH] Token address received: ${tokenAddress}`);
        
        // Validate the token address
        if (!tokenAddress || tokenAddress.trim() === '') {
            await interaction.editReply({ 
                content: '❌ Please provide a valid token address!' 
            });
            return;
        }
        
        // Update the UI to show we're working on it
        await interaction.editReply({
            content: `🔍 Researching token: \`${tokenAddress}\`\nPlease wait while I gather information...`
        });
        
        // Save to state
        const userId = interaction.user.id;
        state.activeResearch[userId] = {
            tokenAddress: tokenAddress.trim(),
            startTime: Date.now()
        };
        
        // Fetch token info
        console.log(`[COIN RESEARCH] Fetching token info for ${tokenAddress}`);
        const tokenInfo = await fetchTokenInfo(tokenAddress);
        
        // Store in state
        state.activeResearch[userId].tokenInfo = tokenInfo;
        
        // Display research results with the follow-up pattern
        console.log('[COIN RESEARCH] Displaying token research results');
        await displayTokenResearch(interaction, tokenAddress.trim(), tokenInfo);
        
    } catch (error) {
        console.error('[COIN RESEARCH] Error in handleAddressSubmit:', error);
        
        try {
            // If we've already replied (which we should have due to deferReply),
            // then use editReply or followUp
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    content: `❌ Error researching token: ${error.message}. Please try again.`
                });
            } else {
                // Fallback in case somehow we haven't replied yet
                await interaction.reply({ 
                    content: `❌ Error researching token: ${error.message}. Please try again.`,
                    ephemeral: true 
                });
            }
        } catch (replyError) {
            console.error('[COIN RESEARCH] Error sending error response:', replyError);
        }
    }
}

/**
 * Handle back button to return to the main research menu
 * @param {Object} interaction - Discord interaction
 */
export async function handleBackToResearch(interaction) {
    try {
        await showCoinResearchMenu(interaction);
    } catch (error) {
        console.error('Error returning to research menu:', error);
        await interaction.followUp({
            content: '❌ Error navigating back. Please try again.',
            ephemeral: true
        });
    }
}
