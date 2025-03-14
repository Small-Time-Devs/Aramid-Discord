import { 
    showCoinResearchMenu, 
    showAddressEntryModal, 
    handleBackToResearch,
    state 
} from './coinResearchMain.mjs';
import { fetchTokenInfo } from './utils/tokenInfoFetcher.mjs';
import { 
    displayTokenResearch, 
    displayDetailedTokenInfo,
    displayAiAnalysis
} from './ui/researchDisplay.mjs';
import { fetchTokenAiAdvice } from './utils/aiAdvice.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Process the coin research address modal submission
 * This is designed to exactly match your spot trading input pattern
 * @param {Object} interaction - Modal submit interaction
 */
export async function processCoinResearchAddressModal(interaction) {
    try {
        console.log('[COIN RESEARCH MODAL] Processing address submission');
        
        // Get the token address from the modal
        const tokenAddress = interaction.fields.getTextInputValue('token_address');
        console.log(`[COIN RESEARCH MODAL] Token address entered: ${tokenAddress}`);
        
        // Validate token address
        if (!tokenAddress || tokenAddress.trim() === '') {
            await interaction.reply({
                content: '❌ Please enter a valid token address',
                ephemeral: true
            });
            return;
        }
        
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        
        // Store in state for this user
        const userId = interaction.user.id;
        state.activeResearch[userId] = {
            tokenAddress,
            startTime: Date.now()
        };
        
        // Let user know we're working on it
        await interaction.editReply({
            content: `🔍 Researching token: \`${tokenAddress}\`\nPlease wait while we gather information...`
        });
        
        // Fetch token info
        const tokenInfo = await fetchTokenInfo(tokenAddress);
        
        // Save the token info to state
        state.activeResearch[userId].tokenInfo = tokenInfo;
        
        // Show the research results
        await displayTokenResearch(interaction, tokenAddress, tokenInfo);
        
    } catch (error) {
        console.error('[COIN RESEARCH MODAL] Error processing address:', error);
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Error: ${error.message}. Please try again with a valid Solana token address.`,
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: `❌ Error: ${error.message}. Please try again with a valid Solana token address.`,
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('[COIN RESEARCH MODAL] Error sending reply:', replyError);
        }
    }
}

/**
 * Handle all coin research related interactions
 * @param {Object} interaction - Discord interaction
 * @returns {Promise<boolean>} - Whether the interaction was handled
 */
export async function handleCoinResearchInteractions(interaction) {
    try {
        // Log every interaction for debugging
        if (interaction.isButton()) {
            console.log(`[COIN RESEARCH] Button interaction: ${interaction.customId}`);
        }
        
        // Skip handling of main buttons (handled directly in applicationHandler.mjs)
        if (interaction.isButton()) {
            if (interaction.customId === 'coin_research' || 
                interaction.customId === 'research_enter_address') {
                console.log('[COIN RESEARCH] Skipping main button handling (handled in app handler)');
                return false;
            }
        }
        
        // Handle button interactions
        if (interaction.isButton()) {
            // Handle back_to_research and refresh_research buttons
            switch (interaction.customId) {
                case 'back_to_research':
                    console.log('[COIN RESEARCH] Handling back_to_research button');
                    await handleBackToResearch(interaction);  // Use the imported function
                    return true;
                    
                case 'refresh_research':
                    console.log('[COIN RESEARCH] Handling refresh_research button');
                    await handleRefreshResearch(interaction);
                    return true;
            }
            
            // Handle show basic info button (with token address in the ID)
            if (interaction.customId.startsWith('show_basic_info_')) {
                const tokenAddress = interaction.customId.replace('show_basic_info_', '');
                console.log(`[COIN RESEARCH] Showing basic info for token: ${tokenAddress}`);
                await handleShowBasicInfo(interaction, tokenAddress);
                return true;
            }
            
            // Handle ask Aramid AI button (with token address in the ID)
            if (interaction.customId.startsWith('ask_aramid_ai_')) {
                const tokenAddress = interaction.customId.replace('ask_aramid_ai_', '');
                console.log(`[COIN RESEARCH] Asking Aramid AI about token: ${tokenAddress}`);
                await handleAskAramidAi(interaction, tokenAddress);
                return true;
            }
        }
        
        // NOTE: Modal submissions are now handled directly in applicationHandler.mjs
        
        return false;
        
    } catch (error) {
        console.error('Error handling coin research interaction:', error);
        
        // Try to respond to the user
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Error processing coin research request: ${error.message}`,
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: `❌ Error processing coin research request: ${error.message}`,
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Error sending error response:', replyError);
        }
        
        return true;
    }
}

/**
 * Handle the show basic info button
 * @param {Object} interaction - Discord interaction
 * @param {string} tokenAddress - Token address
 */
async function handleShowBasicInfo(interaction, tokenAddress) {
    try {
        await interaction.deferUpdate();
        console.log(`[COIN RESEARCH] Processing basic info for token: ${tokenAddress}`);
        
        const userId = interaction.user.id;
        
        // Check if we have the token info in state
        if (!state.activeResearch[userId] || state.activeResearch[userId].tokenAddress !== tokenAddress) {
            state.activeResearch[userId] = {
                tokenAddress,
                startTime: Date.now()
            };
            
            // Fetch token info
            console.log(`[COIN RESEARCH] Fetching token info for ${tokenAddress}`);
            const tokenInfo = await fetchTokenInfo(tokenAddress);
            state.activeResearch[userId].tokenInfo = tokenInfo;
            
            // Display detailed token info
            await displayDetailedTokenInfo(interaction, tokenAddress, tokenInfo);
        } else {
            // Use existing token info
            console.log(`[COIN RESEARCH] Using cached token info for ${tokenAddress}`);
            const tokenInfo = state.activeResearch[userId].tokenInfo;
            
            // Display detailed token info
            await displayDetailedTokenInfo(interaction, tokenAddress, tokenInfo);
        }
    } catch (error) {
        console.error(`Error showing basic info for token ${tokenAddress}:`, error);
        
        try {
            await interaction.followUp({
                content: `❌ Error showing token info: ${error.message}`,
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Error sending follow-up:', followUpError);
        }
    }
}

/**
 * Handle the ask Aramid AI button
 * @param {Object} interaction - Discord interaction
 * @param {string} tokenAddress - Token address
 */
async function handleAskAramidAi(interaction, tokenAddress) {
    try {
        await interaction.deferUpdate();
        console.log(`[COIN RESEARCH] Processing AI advice for token: ${tokenAddress}`);
        
        const userId = interaction.user.id;
        
        // Let user know we're fetching AI advice
        await interaction.editReply({
            content: '🤖 Asking Aramid AI for analysis...\nThis may take up to 30 seconds.',
            embeds: [],
            components: []
        });
        
        // Ensure we have token info
        let tokenInfo;
        if (!state.activeResearch[userId] || state.activeResearch[userId].tokenAddress !== tokenAddress) {
            // Fetch token info
            console.log(`[COIN RESEARCH] Fetching token info for AI analysis of ${tokenAddress}`);
            tokenInfo = await fetchTokenInfo(tokenAddress);
            
            // Store in state
            state.activeResearch[userId] = {
                tokenAddress,
                startTime: Date.now(),
                tokenInfo
            };
        } else {
            console.log(`[COIN RESEARCH] Using cached token info for AI analysis of ${tokenAddress}`);
            tokenInfo = state.activeResearch[userId].tokenInfo;
        }
        
        // Fetch AI advice
        console.log(`[COIN RESEARCH] Requesting AI advice for ${tokenAddress}`);
        const aiResponse = await fetchTokenAiAdvice(tokenAddress);
        console.log(`[COIN RESEARCH] Received AI advice for ${tokenAddress}`);
        
        // Display AI analysis results
        await displayAiAnalysis(interaction, tokenAddress, aiResponse, tokenInfo);
        
    } catch (error) {
        console.error(`Error getting AI advice for token ${tokenAddress}:`, error);
        
        try {
            await interaction.editReply({
                content: `❌ Error getting AI analysis: ${error.message}`,
                embeds: [],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`show_basic_info_${tokenAddress}`)
                                .setLabel('Show Basic Info Instead')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('back_to_research')
                                .setLabel('Back to Research')
                                .setStyle(ButtonStyle.Secondary)
                        )
                ]
            });
        } catch (editError) {
            console.error('Error editing reply:', editError);
            
            try {
                await interaction.followUp({
                    content: `❌ Error processing AI analysis: ${error.message}`,
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending follow-up:', followUpError);
            }
        }
    }
}

/**
 * Handle the refresh research button
 * @param {Object} interaction - Discord interaction
 */
async function handleRefreshResearch(interaction) {
    try {
        const userId = interaction.user.id;
        
        // Check if we have an active research session
        if (!state.activeResearch[userId] || !state.activeResearch[userId].tokenAddress) {
            await interaction.reply({
                content: '❌ No active research session found. Please start a new search.',
                ephemeral: true
            });
            return;
        }
        
        const tokenAddress = state.activeResearch[userId].tokenAddress;
        
        await interaction.deferUpdate();
        console.log(`[COIN RESEARCH] Refreshing data for token: ${tokenAddress}`);
        
        // Fetch fresh token info
        const tokenInfo = await fetchTokenInfo(tokenAddress);
        
        // Update the research time and info
        state.activeResearch[userId].startTime = Date.now();
        state.activeResearch[userId].tokenInfo = tokenInfo;
        
        // Display research options
        await displayTokenResearch(interaction, tokenAddress, tokenInfo);
        
    } catch (error) {
        console.error('Error refreshing token research:', error);
        
        try {
            await interaction.followUp({
                content: `❌ Error refreshing data: ${error.message}`,
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Error sending follow-up:', followUpError);
        }
    }
}
