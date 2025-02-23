import axios from 'axios';
import { fetchSolBalance, fetchTokenBalances, fetchTokenMap } from '../helpers/solana.mjs';
import { 
    sendMainMenu, 
    sendChainSelection, 
    sendHelpMenu 
} from './discordMessages.mjs';
import { handleDisclaimerResponse, checkAndHandleDisclaimer, sendDisclaimer } from './disclaimer.mjs';
import { registerDiscordUser } from '../db/dynamo.mjs';
import { startTutorial, handleTutorial } from './tutorial.mjs';

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
                await interaction.reply({
                    content: 'Use the `/enable2fa` command to set up two-factor authentication.',
                    ephemeral: true
                });
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
        await interaction.reply({
            content: '❌ An error occurred. Please try again.',
            ephemeral: true
        }).catch(console.error);
    }
}
