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
            
            const tokenAddressInput = new TextInputBuilder()
            .setCustomId('token_address')
            .setLabel('Token Contract Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter Solana token address')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(tokenAddressInput);
        modal.addComponents(row);
        
        console.log('Showing modal with ID:', modal.data.custom_id);
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing token address modal:', error);
        await interaction.reply({
            content: `❌ Failed to open token address input: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle "Enter Token Address" button click
 */
export async function handleEnterTokenAddress(interaction) {
    try {
        console.log('Opening token address modal...');
        
        // Use consistent modal ID and input field name
        const modal = new ModalBuilder()
            .setCustomId('token_address_modal')
            .setTitle('Enter Token Address');

        const tokenAddressInput = new TextInputBuilder()
            .setCustomId('token_address')
            .setLabel('Token Contract Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter Solana token address')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(tokenAddressInput);
        modal.addComponents(row);
        
        console.log('Showing modal with ID:', modal.data.custom_id);
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing token address modal:', error);
        await interaction.reply({
            content: `❌ Failed to open token address input: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Handle address submission and start research - MATCHING TOKEN SUBMISSION PATTERN
 * @param {Object} interaction - Modal submit interaction
 */
export async function handleAddressSubmit(interaction) {
    try {
        console.log('[COIN RESEARCH] Processing address submission from modal');
        
        // Get token address (same pattern as your token submission)
        let tokenAddress;
        if (interaction.fields.getTextInputValue('token_address')) {
            tokenAddress = interaction.fields.getTextInputValue('token_address');
        } else if (interaction.fields.getTextInputValue('token_address_input')) {
            tokenAddress = interaction.fields.getTextInputValue('token_address_input');
        } else {
            throw new Error('Token address field not found in modal submission');
        }
        
        // Basic validation
        if (!tokenAddress || tokenAddress.trim() === '') {
            await interaction.reply({
                content: '❌ Please provide a valid token address!',
                ephemeral: true
            });
            return;
        }
        
        // Reply to user with loading message
        await interaction.reply({
            content: `🔍 Researching token: \`${tokenAddress}\`\nPlease wait while we gather information...`,
            ephemeral: true
        });
        
        // Store in state
        const userId = interaction.user.id;
        state.activeResearch[userId] = {
            tokenAddress: tokenAddress.trim(),
            startTime: Date.now()
        };
        
        // Fetch token information
        console.log(`[COIN RESEARCH] Fetching token info for ${tokenAddress}`);
        const tokenInfo = await fetchTokenInfo(tokenAddress);
        
        // Save to state
        state.activeResearch[userId].tokenInfo = tokenInfo;
        
        // Display research results
        await displayTokenResearch(interaction, tokenAddress, tokenInfo);
        
    } catch (error) {
        console.error('[COIN RESEARCH] Error in handleAddressSubmit:', error);
        
        try {
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: `❌ Error researching token: ${error.message}. Please try again.`,
                    ephemeral: true 
                });
            } else {
                await interaction.followUp({ 
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
