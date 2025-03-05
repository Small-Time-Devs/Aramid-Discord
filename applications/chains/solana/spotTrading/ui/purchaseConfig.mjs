import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} from 'discord.js';
import { state } from '../solSpotTrading.mjs';
import { fetchSolBalance } from '../functions/utils.mjs';

/**
 * A simpler version of the token purchase config display
 * to minimize potential errors
 */
export async function showTokenPurchaseConfigSimplified(interaction, tokenDetails, tokenPrice) {
    try {
        console.log('Creating purchase config display...');
        console.log('Token details:', tokenDetails);
        
        const userId = interaction.user.id;
        const config = state.solanaBuyTokenConfig[userId];
        
        if (!config) {
            throw new Error('Configuration not found');
        }
        
        // Get token name with better fallback logic
        const tokenName = tokenDetails?.name || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || '';
        const displayName = tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName;
        
        // Fetch the user's SOL balance
        const solBalance = await fetchSolBalance(config.solPublicKey);
        
        // Create a simple embed
        const embed = new EmbedBuilder()
            .setTitle('Token Purchase Setup')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Selected Token', 
                    value: displayName, 
                    inline: true 
                },
                { 
                    name: 'Price', 
                    value: tokenPrice ? `$${tokenPrice}` : 'Unknown', 
                    inline: true 
                },
                {
                    name: 'Wallet Balance',
                    value: `${solBalance.toFixed(4)} SOL`,
                    inline: true
                },
                { 
                    name: 'Contract Address', 
                    value: `\`${config.outputMint}\``, 
                    inline: false 
                },
                {
                    name: 'Purchase Amount',
                    value: `${config.amount} SOL`,
                    inline: true
                },
                {
                    name: 'Settings',
                    value: `Slippage: ${config.slippage / 100}%\nPriority Fee: ${config.priorityFeeSol.toFixed(6)} SOL`,
                    inline: false
                }
            );
        
        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_purchase_amount')
                    .setLabel('Set Amount')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_slippage')
                    .setLabel('Set Slippage')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('set_priority_fee')
                    .setLabel('Set Priority Fee')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('execute_purchase')
                    .setLabel('Execute Purchase')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_buy_options')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        console.log('Sending embed response...');
        
        // Use editReply as we've already deferred
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
        
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Error showing simplified purchase config:', error);
        await interaction.followUp({
            content: `❌ Error displaying token information: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

/**
 * Show token purchase configuration with improved error handling
 */
export async function showTokenPurchaseConfig(interaction, tokenDetails, tokenPrice, isFollowUp = false) {
    try {
        console.log('Showing token purchase config...');
        const userId = interaction.user.id;
        const config = state.solanaBuyTokenConfig[userId];
        
        if (!config) {
            throw new Error('Configuration not found');
        }
        
        // Get token name with better fallback logic
        const tokenName = tokenDetails?.name || tokenDetails?.symbol || 'Unknown Token';
        const tokenSymbol = tokenDetails?.symbol || 'UNKNOWN';
        const displayName = tokenSymbol ? `${tokenName} (${tokenSymbol})` : tokenName;
        
        // Fetch the user's SOL balance
        const solBalance = await fetchSolBalance(config.solPublicKey);
        
        const embed = new EmbedBuilder()
            .setTitle('Token Purchase Configuration')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: 'Selected Token', 
                    value: displayName, 
                    inline: true 
                },
                { 
                    name: 'Current Price', 
                    value: tokenPrice ? `$${tokenPrice}` : 'Unknown', 
                    inline: true 
                },
                {
                    name: 'Wallet Balance',
                    value: `${solBalance.toFixed(4)} SOL`,
                    inline: true
                },
                {
                    name: 'Purchase Amount',
                    value: `${config.amount} SOL`,
                    inline: true
                },
                { 
                    name: 'Contract Address', 
                    value: `\`${config.outputMint}\``, 
                    inline: false 
                },
                {
                    name: 'Settings',
                    value: `Slippage: ${config.slippage / 100}%\nPriority Fee: ${config.priorityFeeSol.toFixed(6)} SOL`,
                    inline: false
                }
            );
            
        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_purchase_amount')
                    .setLabel('Set Amount')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_slippage')
                    .setLabel('Set Slippage')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('set_priority_fee')
                    .setLabel('Set Priority Fee')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('execute_purchase')
                    .setLabel('Execute Purchase')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_buy_options')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        console.log('Preparing response...');
        
        // Handle the response based on the interaction state
        if (isFollowUp) {
            console.log('Sending as editReply...');
            await interaction.editReply({
                embeds: [embed],
                components: [row1, row2]
            });
        } else if (interaction.isModalSubmit()) {
            console.log('Sending as reply to modal...');
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [embed],
                    components: [row1, row2],
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    embeds: [embed],
                    components: [row1, row2]
                });
            }
        } else {
            console.log('Sending as update...');
            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });
        }
        
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Error showing token purchase config:', error);
        
        // Determine the appropriate method to respond based on the interaction state
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error loading purchase configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error loading purchase configuration: ${error.message}. Please try again.`,
                ephemeral: true
            });
        }
    }
}
