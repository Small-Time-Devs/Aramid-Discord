import { sendApplicationMenu, sendChainSelectionForApp } from '../utils/discordMessages.mjs';

export async function handleApplicationInteractions(interaction) {
    if (!interaction.isButton()) return;

    switch (interaction.customId) {
        case 'applications':
            await sendApplicationMenu(interaction);
            break;

        case 'spot_trading':
            await sendChainSelectionForApp(interaction, 'spot');
            break;

        case 'market_maker':
            await sendChainSelectionForApp(interaction, 'market');
            break;

        case 'spot_solana':
            // Handle Solana spot trading
            await interaction.update({
                content: 'Starting Solana spot trading...',
                components: [],
                embeds: []
            });
            // Add logic to start Solana spot trading
            break;

        case 'spot_xrp':
            // Handle XRP spot trading
            await interaction.update({
                content: 'Starting XRP spot trading...',
                components: [],
                embeds: []
            });
            // Add logic to start XRP spot trading
            break;

        case 'market_solana':
            // Handle Solana market making
            await interaction.update({
                content: 'Starting Solana market making...',
                components: [],
                embeds: []
            });
            // Add logic to start Solana market making
            break;

        case 'market_xrp':
            // Handle XRP market making
            await interaction.update({
                content: 'Starting XRP market making...',
                components: [],
                embeds: []
            });
            // Add logic to start XRP market making
            break;

        case 'back_to_applications':
            await sendApplicationMenu(interaction);
            break;
    }
}
