import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { checkMarketMakingConfig, checkUserWallet } from '../../../../src/db/dynamo.mjs';

export function registerMarketMakerHandlers(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        switch (interaction.customId) {
            case 'SOLANA_MARKET_MAKING':
                await handleMarketMaking(interaction);
                break;
            case 'SOLANA_VIEW_PAST_SESSIONS':
                await handlePastSessions(interaction);
                break;
            case 'SOLANA_VIEW_CURRENT_SESSION':
                await handleCurrentSession(interaction);
                break;
            case 'SOLANA_START_BOT':
                await handleStartBot(interaction);
                break;
        }
    });
}

async function handleMarketMaking(interaction) {
    const userId = interaction.user.id;
    const { exists, solanaDepositPublicKey } = await checkUserWallet(userId);

    const embed = new EmbedBuilder()
        .setTitle('Solana Market Maker')
        .setDescription(`Welcome to the Solana Market Maker!\n\nMarket Maker Deposit Address: [${solanaDepositPublicKey}](https://explorer.solana.com/address/${solanaDepositPublicKey})`)
        .setColor(0x0099FF);

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SOLANA_VIEW_PAST_SESSIONS')
                .setLabel('View Past Sessions')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('SOLANA_VIEW_CURRENT_SESSION')
                .setLabel('View Current Session')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('SOLANA_MARKET_MAKING_SETTINGS')
                .setLabel('Settings')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('SOLANA_START_BOT')
                .setLabel('Start Bot')
                .setStyle(ButtonStyle.Success)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
    });
}

async function handleStartBot(interaction) {
    const userId = interaction.user.id;
    const configExists = await checkMarketMakingConfig(userId);

    if (configExists) {
        await interaction.reply({
            content: '✅ Bot started successfully!',
            ephemeral: true
        });
    } else {
        const embed = new EmbedBuilder()
            .setTitle('Configuration Required')
            .setDescription('You need to configure settings for the bot first.')
            .setColor(0xFF0000);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('SOLANA_MARKET_MAKING_SETTINGS')
                    .setLabel('Settings')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
}

// Add other handler functions...
