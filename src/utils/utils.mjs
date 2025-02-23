import axios from 'axios';
import { fetchSolBalance, fetchTokenBalances, fetchTokenMap } from '../helpers/solana.mjs';
import { 
    sendMainMenu, 
    sendChainSelection, 
    sendHelpMenu,
    sendQuickStartSecurity  // Add this import
} from './discordMessages.mjs';
import { handleDisclaimerResponse, checkAndHandleDisclaimer, sendDisclaimer } from './disclaimer.mjs';
import { registerDiscordUser } from '../db/dynamo.mjs';
import { startTutorial, handleTutorial } from './tutorial.mjs';
import { enable2FA, check2FAStatus } from './2fa.mjs';  // Add this import
import { 
    ButtonStyle, 
    ActionRowBuilder, 
    ButtonBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';  // Add additional imports

// Token map caching
let tokenMap = new Map();

// Fetch and maintain token map
export const getTokenMap = async () => {
    if (tokenMap.size > 0) return tokenMap;
    tokenMap = await fetchTokenMap();
    return tokenMap;
};

export const fetchCoinGeckoDefiData = async () => {
    const url = 'https://pro-api.coingecko.com/api/v3/global/decentralized_finance_defi';
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'x-cg-pro-api-key': process.env.COIN_GECKO_API_KEY
        }
    };

    try {
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        console.error('Error fetching CoinGecko DeFi data:', error);
        throw error;
    }
};

export const fetchWalletDetails = async (userId) => {
    try {
        const solBalance = await fetchSolBalance(userId);
        const tokenBalances = await fetchTokenBalances(userId);
        return {
            solBalance,
            tokenBalances,
            formattedTokens: tokenBalances.length > 0 ? 
                tokenBalances.map(token => ({
                    mint: token.mint,
                    amount: token.amount.toFixed(token.decimals)
                })) : []
        };
    } catch (error) {
        console.error('Error fetching wallet details:', error);
        throw error;
    }
};

export const formatWalletDetailsData = (solPublicKey, solBalance, xrpPublicKey, xrpBalance = 0) => {
    return {
        solana: {
            publicKey: solPublicKey,
            balance: solBalance.toFixed(2)
        },
        xrp: {
            publicKey: xrpPublicKey,
            balance: xrpBalance.toFixed(2)
        }
    };
};

export const formatWalletFields = (walletDetails) => {
    const fields = [
        {
            name: 'SOL Balance',
            value: `${walletDetails.solBalance.toFixed(2)} SOL`,
            inline: true
        }
    ];

    if (walletDetails.tokenBalances.length > 0) {
        const tokenList = walletDetails.tokenBalances.map(token => 
            `${token.mint}: ${token.amount.toFixed(token.decimals)}`
        ).join('\n');
        
        fields.push({
            name: 'Token Balances',
            value: tokenList,
            inline: true
        });
    } else {
        fields.push({
            name: 'Token Balances',
            value: 'None',
            inline: true
        });
    }

    return fields;
};

export async function handleButtonInteraction(interaction) {
    // Handle disclaimer responses first
    if (interaction.customId === 'agree_terms' || interaction.customId === 'disagree_terms') {
        await handleDisclaimerResponse(interaction);
        return;
    }

    try {
        // Register user and check disclaimer
        await registerDiscordUser(interaction.user.id, interaction.user.username);
        const hasAgreed = await checkAndHandleDisclaimer(interaction);
        if (!hasAgreed) return;

        switch (interaction.customId) {
            case 'help':
                await sendHelpMenu(interaction);
                break;
            case 'view_disclaimer':
                await sendDisclaimer(interaction.channel);
                break;
            case 'setup_2fa':
                try {
                    const has2FA = await check2FAStatus(interaction.user.id);
                    
                    if (has2FA) {
                        const embed = new EmbedBuilder()
                            .setTitle('🔒 2FA Security Status')
                            .setDescription('Two-Factor Authentication is already active on your account.')
                            .setColor(0x5865F2)
                            .addFields(
                                {
                                    name: '📝 Important Note',
                                    value: 'For security reasons, 2FA cannot be disabled directly through the bot.',
                                    inline: false
                                },
                                {
                                    name: '🔐 Need to Reset?',
                                    value: 'To remove or reset 2FA:\n• Contact our support team\n• Prepare identity verification\n• Explain your situation',
                                    inline: false
                                }
                            )
                            .setFooter({ 
                                text: 'Security First | Your Protection Matters',
                                iconURL: 'https://i.imgur.com/AfFp7pu.png'
                            });

                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('quickstart_wallet_security')
                                    .setLabel('Continue to Next Step')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji('➡️')
                            );

                        await interaction.reply({
                            embeds: [embed],
                            components: [row],
                            ephemeral: true
                        });
                        return;
                    }

                    // Existing 2FA setup code...
                    const setupResult = await enable2FA(
                        interaction.user.id,
                        interaction.user.username
                    );

                    // Ensure we have QR code data
                    if (!setupResult || !setupResult.qrCodeUrl) {
                        throw new Error('Failed to generate 2FA setup data');
                    }

                    // Convert QR code to attachment
                    const qrBuffer = Buffer.from(setupResult.qrCodeUrl.split(',')[1], 'base64');
                    const attachment = { 
                        attachment: qrBuffer,
                        name: '2fa-qr.png' 
                    };

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('verify_2fa_setup')
                                .setLabel('Verify 2FA')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('✅'),
                            new ButtonBuilder()
                                .setCustomId('back_to_quick_start')
                                .setLabel('Back')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('↩️')
                        );

                    await interaction.reply({
                        content: [
                            '🔒 **2FA Setup Started**',
                            '',
                            '1️⃣ Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
                            '2️⃣ Save this backup code in a secure place: `' + setupResult.secret + '`',
                            '3️⃣ Click "Verify 2FA" and enter the code from your app',
                            '',
                            '⚠️ **DO NOT SHARE** your backup code with anyone!'
                        ].join('\n'),
                        files: [attachment],
                        components: [row],
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error in 2FA setup:', error);
                    await interaction.reply({
                        content: '❌ Error setting up 2FA. Please try again.',
                        ephemeral: true
                    });
                }
                break;

            case 'verify_2fa_setup':
                const modal = new ModalBuilder()
                    .setCustomId('verify_2fa_modal')
                    .setTitle('Verify 2FA Setup');

                const codeInput = new TextInputBuilder()
                    .setCustomId('2fa_code')
                    .setLabel('Enter the code from your authenticator app')
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(6)
                    .setMaxLength(6)
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(codeInput);
                modal.addComponents(firstActionRow);

                await interaction.showModal(modal);
                break;

            case 'back_to_quick_start':
                await sendQuickStartSecurity(interaction, '2fa_setup');
                break;

            case 'show_tutorial':
                await startTutorial(interaction);
                break;
            case 'open_main_menu':
            case 'open_menu':  // Add this case to handle both button IDs
                const newMenu = await sendMainMenu(interaction.channel);
                if (interaction.message) {
                    await interaction.message.delete().catch(console.error);
                }
                await interaction.deferUpdate().catch(console.error);
                return newMenu;
                break;
            case 'quick_start':
                await interaction.deferReply({ ephemeral: true });
                await sendQuickStartSecurity(interaction, '2fa_setup');
                break;
            case 'quickstart_wallet_security':
                await sendQuickStartSecurity(interaction, 'wallet_security');
                break;
            case 'quickstart_protected_tx':
                await sendQuickStartSecurity(interaction, 'protected_tx');
                break;
            case 'quickstart_complete':
                await sendQuickStartSecurity(interaction, 'complete');
                break;
            case 'tutorial_security_1':
            case 'tutorial_security_2':
            case 'tutorial_wallet_1':
            case 'tutorial_wallet_2':
            case 'tutorial_research_1':
            case 'tutorial_research_2':
            case 'tutorial_complete':
                const step = interaction.customId.replace('tutorial_', '');
                await handleTutorial(interaction, step);
                break;
            default:
                // Let other handlers process their specific buttons
                return;
        }
    } catch (error) {
        console.error('Button interaction error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred. Please try again.',
                ephemeral: true  // Change from flags object to direct ephemeral
            }).catch(console.error);
        }
    }
}
