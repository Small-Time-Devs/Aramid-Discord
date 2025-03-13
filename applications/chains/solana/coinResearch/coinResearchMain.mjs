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
 * Show modal for entering token address
 * @param {Object} interaction - Discord interaction
 */
export async function showAddressEntryModal(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('coin_research_address_modal')
            .setTitle('Research Solana Token');
            
        const addressInput = new TextInputBuilder()
            .setCustomId('token_address')
            .setLabel('Token Contract Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter Solana token address/mint')
            .setRequired(true);
            
        const row = new ActionRowBuilder().addComponents(addressInput);
        modal.addComponents(row);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing token address modal:', error);
        await interaction.reply({
            content: '❌ Error showing address input. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle address submission and start research
 * @param {Object} interaction - Modal submit interaction
 */
export async function handleAddressSubmit(interaction) {
    try {
        const userId = interaction.user.id;
        const tokenAddress = interaction.fields.getTextInputValue('token_address').trim();
        
        await interaction.deferReply({ ephemeral: true });
        
        // Store in state
        state.activeResearch[userId] = {
            tokenAddress,
            startTime: Date.now()
        };
        
        await interaction.editReply({
            content: `🔍 Researching token: \`${tokenAddress}\`\nPlease wait while we gather information...`
        });
        
        // Fetch token info
        const tokenInfo = await fetchTokenInfo(tokenAddress);
        
        // Display research results
        await displayTokenResearch(interaction, tokenAddress, tokenInfo);
        
    } catch (error) {
        console.error('Error researching token:', error);
        await interaction.editReply({
            content: `❌ Error researching token: ${error.message}. Please check the address and try again.`
        });
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
