import { 
    showCoinResearchMenu, 
    showAddressEntryModal, 
    handleAddressSubmit,
    handleBackToResearch,
    state 
} from './coinResearchMain.mjs';
import { fetchTokenInfo } from './utils/tokenInfoFetcher.mjs';
import { displayTokenResearch } from './ui/researchDisplay.mjs';

/**
 * Handle all coin research related interactions
 * @param {Object} interaction - Discord interaction
 * @returns {Promise<boolean>} - Whether the interaction was handled
 */
export async function handleCoinResearchInteractions(interaction) {
    try {
        console.log(`[COIN RESEARCH] Checking interaction: ${interaction.isButton() ? interaction.customId : 'non-button'}`);
        
        // Handle button interactions
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'coin_research':
                    console.log('[COIN RESEARCH] Handling coin_research button');
                    await showCoinResearchMenu(interaction);
                    return true;
                    
                case 'research_enter_address':
                    console.log('[COIN RESEARCH] Handling research_enter_address button');
                    await showAddressEntryModal(interaction);
                    return true;
                    
                case 'back_to_research':
                    console.log('[COIN RESEARCH] Handling back_to_research button');
                    await handleBackToResearch(interaction);
                    return true;
                    
                case 'refresh_research':
                    console.log('[COIN RESEARCH] Handling refresh_research button');
                    await handleRefreshResearch(interaction);
                    return true;
            }
        }
        
        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            console.log(`[COIN RESEARCH] Checking modal: ${interaction.customId}`);
            if (interaction.customId === 'coin_research_address_modal') {
                console.log('[COIN RESEARCH] Handling coin_research_address_modal submission');
                await handleAddressSubmit(interaction);
                return true;
            }
        }
        
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
        
        // Fetch fresh token info
        const tokenInfo = await fetchTokenInfo(tokenAddress);
        
        // Update the research time
        state.activeResearch[userId].startTime = Date.now();
        
        // Display updated research results
        await displayTokenResearch(interaction, tokenAddress, tokenInfo);
        
    } catch (error) {
        console.error('Error refreshing token research:', error);
        await interaction.followUp({
            content: `❌ Error refreshing data: ${error.message}`,
            ephemeral: true
        });
    }
}
