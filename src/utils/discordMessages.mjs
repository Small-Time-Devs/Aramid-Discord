import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { developmentFlags, isFeatureAvailable } from '../globals/global.mjs';

export const sendWelcomeMessage = async (channel) => {
    await channel.send({
        embeds: [{
            title: 'Welcome!',
            description: 'Thanks for using this bot!',
            color: 0x00ff00
        }]
    });
};

export const sendErrorMessage = async (channel, error) => {
    await channel.send({
        embeds: [{
            title: 'Error',
            description: error.message || 'An error occurred',
            color: 0xff0000
        }]
    });
};

export const sendSuccessMessage = async (channel, message) => {
    await channel.send({
        embeds: [{
            title: 'Success',
            description: message,
            color: 0x00ff00
        }]
    });
};

export const sendMainMenuOriginal = async (channel) => {
    return await channel.send({
        embeds: [{
            title: '🤖 Crypto Research Assistant',
            description: 'Your advanced cryptocurrency research and management companion',
            fields: [
                {
                    name: '🔐 Security Features',
                    value: '• Two-Factor Authentication (2FA)\n• Secure wallet management\n• Protected transactions',
                    inline: true
                },
                {
                    name: '💰 Wallet Features',
                    value: '• Multi-chain support\n• Balance tracking\n• Transaction history\n• Secure transfers',
                    inline: true
                },
                {
                    name: '📊 Research Tools',
                    value: '• Token analysis\n• Market statistics\n• DeFi insights\n• Price tracking',
                    inline: true
                },
                {
                    name: '⚡ Quick Commands',
                    value: '`!menu` - Show this menu\n`!help` - Show detailed help\n`!ping` - Check bot status',
                    inline: false
                },
                {
                    name: '🔰 Getting Started',
                    value: 'New users should start with the Quick Start guide or Tutorial for a complete walkthrough.',
                    inline: false
                }
            ],
            color: 0x5865F2,
            thumbnail: {
                url: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png'
            },
            footer: {
                text: '24/7 Crypto Assistant | Version 0.0.1',
                icon_url: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png'
            },
            timestamp: new Date()
        }],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'quick_start',
                        label: '🚀 Quick Start',
                        style: 1,
                    },
                    {
                        type: 2,
                        custom_id: 'view_wallet',
                        label: '👛 View Wallet',
                        style: 1,
                        emoji: '💼'
                    },
                    {
                        type: 2,
                        custom_id: 'research_token',
                        label: '🔍 Research',
                        style: 1,
                        emoji: '📊'
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'show_tutorial',
                        label: '📚 Tutorial',
                        style: 2,
                    },
                    {
                        type: 2,
                        custom_id: 'settings',
                        label: '⚙️ Settings',
                        style: 2,
                        emoji: '🛠️'
                    },
                    {
                        type: 2,
                        custom_id: 'help',
                        label: 'Help Center',
                        style: 2,
                        emoji: '❓'
                    }
                ]
            }
        ]
    });
};

export const sendChainSelection = async (channel) => {
    return await channel.send({
        embeds: [{
            title: '⛓️ Blockchain Selection',
            description: 'Choose your preferred blockchain network for transactions and analysis.',
            fields: [
                {
                    name: '🌟 Available Networks',
                    value: '`Solana` - High performance, low fees\n`Ethereum` - Industry standard, high security',
                    inline: false
                },
                {
                    name: '📝 Network Details',
                    value: 'Each network has unique features and capabilities. Select the one that best suits your needs.',
                    inline: false
                }
            ],
            color: 0x2ECC71,
            footer: {
                text: '← Use "Back to Menu" to return',
                icon_url: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png' // Replace with your bot's icon
            },
            timestamp: new Date()
        }],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'chain_solana',
                        label: 'Solana',
                        style: 1,
                        emoji: '💫'
                    },
                    {
                        type: 2,
                        custom_id: 'chain_ethereum',
                        label: 'Ethereum',
                        style: 1,
                        emoji: '💠'
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'back_to_menu',
                        label: 'Back to Menu',
                        style: 4,
                        emoji: '↩️'
                    }
                ]
            }
        ]
    });
};

export const sendWalletDetails = async (channel, walletData) => {
    return await channel.send({
        embeds: [{
            title: '💼 Wallet Dashboard',
            description: 'Your complete crypto portfolio overview',
            fields: [
                {
                    name: '🌟 Solana Wallet',
                    value: `\`\`\`\nAddress: ${walletData.solana.publicKey}\nBalance: ${walletData.solana.balance} SOL\n\`\`\``,
                    inline: false
                },
                {
                    name: '💫 XRP Wallet',
                    value: `\`\`\`\nAddress: ${walletData.xrp.publicKey}\nBalance: ${walletData.xrp.balance} XRP\n\`\`\``,
                    inline: false
                },
                {
                    name: '📊 Portfolio Stats',
                    value: 'Click the buttons below to manage your wallet',
                    inline: false
                }
            ],
            color: 0x5865F2,
            thumbnail: {
                url: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png' // Replace with your wallet icon
            },
            footer: {
                text: 'Last updated: ' + new Date().toLocaleString(),
                icon_url: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png'
            }
        }],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'refresh_wallet',
                        label: '🔄 Refresh',
                        style: 1,
                    },
                    {
                        type: 2,
                        custom_id: 'send_tokens',
                        label: '📤 Send',
                        style: 1,
                    },
                    {
                        type: 2,
                        custom_id: 'receive_tokens',
                        label: '📥 Receive',
                        style: 1,
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'wallet_settings',
                        label: '⚙️ Settings',
                        style: 2,
                    },
                    {
                        type: 2,
                        custom_id: 'back_to_menu',
                        label: 'Back to Menu',
                        style: 4,
                        emoji: '↩️'
                    }
                ]
            }
        ]
    });
};

export const sendDefiStats = async (channel, defiData) => {
    if (!defiData || !defiData.data) return;
    
    return await channel.send({
        embeds: [{
            title: 'Global DeFi Market Data',
            fields: [
                {
                    name: 'DeFi Market Cap',
                    value: `$${parseFloat(defiData.data.defi_market_cap).toFixed(2)}`,
                    inline: true
                },
                {
                    name: 'ETH Market Cap',
                    value: `$${parseFloat(defiData.data.eth_market_cap).toFixed(2)}`,
                    inline: true
                },
                {
                    name: 'DeFi to ETH Ratio',
                    value: `${parseFloat(defiData.data.defi_to_eth_ratio).toFixed(2)}%`,
                    inline: true
                },
                {
                    name: '24h Trading Volume',
                    value: `$${parseFloat(defiData.data.trading_volume_24h).toFixed(2)}`,
                    inline: true
                },
                {
                    name: 'Top DeFi Coin',
                    value: `${defiData.data.top_coin_name} (${defiData.data.top_coin_defi_dominance.toFixed(2)}% dominance)`,
                    inline: true
                }
            ],
            color: 0x0099ff
        }]
    });
};

export const sendStartupMessage = async (channel) => {
    return await channel.send({
        embeds: [{
            title: '🤖 Crypto Research Assistant',
            description: 'Your advanced cryptocurrency research and management companion',
            fields: [
                {
                    name: '🔐 Security Features',
                    value: '• Two-Factor Authentication (2FA)\n• Secure wallet management\n• Protected transactions',
                    inline: true
                },
                {
                    name: '💰 Wallet Features',
                    value: '• Multi-chain support\n• Balance tracking\n• Transaction history\n• Secure transfers',
                    inline: true
                },
                {
                    name: '📊 Research Tools',
                    value: '• Token analysis\n• Market statistics\n• DeFi insights\n• Price tracking',
                    inline: true
                },
                {
                    name: '⚡ Quick Commands',
                    value: '`!menu` - Show this menu\n`!help` - Show detailed help\n`!ping` - Check bot status',
                    inline: false
                },
                {
                    name: '🔰 Getting Started',
                    value: 'New users should start with the Quick Start guide or Tutorial for a complete walkthrough.',
                    inline: false
                }
            ],
            color: 0x5865F2,
            thumbnail: {
                url: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png'
            },
            footer: {
                text: '24/7 Crypto Assistant | Version 0.0.1',
                icon_url: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png'
            },
            timestamp: new Date()
        }],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'quick_start',
                        label: '🚀 Quick Start',
                        style: 1,
                    },
                    {
                        type: 2,
                        custom_id: 'view_wallet',
                        label: '👛 View Wallet',
                        style: 1,
                        emoji: '💼'
                    },
                    {
                        type: 2,
                        custom_id: 'research_token',
                        label: '🔍 Research',
                        style: 1,
                        emoji: '📊'
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'show_tutorial',
                        label: '📚 Tutorial',
                        style: 2,
                    },
                    {
                        type: 2,
                        custom_id: 'settings',
                        label: '⚙️ Settings',
                        style: 2,
                        emoji: '🛠️'
                    },
                    {
                        type: 2,
                        custom_id: 'help',
                        label: 'Help Center',
                        style: 2,
                        emoji: '❓'
                    }
                ]
            }
        ]
    });
};

// Update sendMainMenu to match sendStartupMessage
export const sendMainMenu = async (channel) => {
    const embed = new EmbedBuilder()
        .setTitle('🤖 Crypto Research Assistant')
        .setDescription('Your advanced cryptocurrency research and management companion')
        .addFields(
            {
                name: '🔐 Security Features',
                value: '• Two-Factor Authentication (2FA)\n• Secure wallet management\n• Protected transactions',
                inline: true
            },
            {
                name: '💰 Wallet Features',
                value: '• Multi-chain support\n• Balance tracking\n• Transaction history\n• Secure transfers',
                inline: true
            },
            {
                name: '📊 Research Tools',
                value: '• Token analysis\n• Market statistics\n• DeFi insights\n• Price tracking',
                inline: true
            },
            {
                name: '👤 Personal Channels',
                value: 'Click "Get Started" below to create your own private trading channel!',
                inline: false
            }
        )
        .setColor(0x5865F2)
        .setThumbnail('https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png')
        .setFooter({
            text: '24/7 Crypto Assistant | Version 0.0.1',
            iconURL: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png'
        })
        .setTimestamp();

    // Create a single row with just a "Get Started" button
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_personal_channel')
                .setLabel('Get Started')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🚀')
        );

    return await channel.send({
        embeds: [embed],
        components: [row]
    });
};

export const sendApplicationMenu = async (interaction) => {
    const embed = new EmbedBuilder()
        .setTitle('🔧 Applications')
        .setDescription('Choose which application you want to use:')
        .addFields(
            { 
                name: '📈 Spot Trading', 
                value: 'Trade tokens directly on DEX platforms' 
            },
            { 
                name: '🤖 Market Maker', 
                value: 'Provide liquidity and earn fees' 
            }
        )
        .setColor(0x0099FF);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('spot_trading')
                .setLabel('Spot Trading')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📈'),
            new ButtonBuilder()
                .setCustomId('market_maker')
                .setLabel('Market Maker')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🤖'),
            new ButtonBuilder()
                .setCustomId('back_to_menu')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('↩️')
        );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
};

/**
 * Send chain selection menu for an application
 */
export async function sendChainSelectionForApp(interaction, appType) {
    try {
        const userId = interaction.user.id;
        let title, description, buttonPrefix;
        
        switch (appType) {
            case 'spot':
                title = 'Select Blockchain for Spot Trading';
                description = 'Choose which blockchain you want to use for trading:';
                buttonPrefix = 'spot_';
                break;
            case 'market':
                title = 'Select Blockchain for Market Making';
                description = 'Choose which blockchain you want to use for market making:';
                buttonPrefix = 'market_';
                break;
            default:
                title = 'Select Blockchain';
                description = 'Choose which blockchain you want to use:';
                buttonPrefix = '';
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(0x0099FF);
            
        // Create Solana button
        const solanaButton = new ButtonBuilder()
            .setCustomId(`${buttonPrefix}solana`)
            .setLabel('Solana')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💫');
        
        // If SOL chain is in development, adjust the button accordingly
        if (!isFeatureAvailable('chains', 'solChain', userId)) {
            console.log(`[DEBUG] Solana chain in dev mode for user ${userId}`);
            solanaButton
                .setLabel('Solana (Dev)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🚧');
        }
        
        // Create XRP button
        const xrpButton = new ButtonBuilder()
            .setCustomId(`${buttonPrefix}xrp`)
            .setLabel('XRP')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔶');
            
        // Check properly against the nested structure
        if (!isFeatureAvailable('chains', 'xrpChain', userId)) {
            console.log(`[DEBUG] XRP chain in dev mode for user ${userId}`);
            xrpButton
                .setLabel('XRP (Dev)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🚧');
        }
        
        const row = new ActionRowBuilder()
            .addComponents(
                solanaButton,
                xrpButton,
                new ButtonBuilder()
                    .setCustomId('back_to_applications')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
            
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error(`Error sending ${appType} chain selection menu:`, error);
        await interaction.reply({
            content: `❌ Error showing options: ${error.message}. Please try again.`,
            ephemeral: true
        });
    }
}

export const sendHelpMenu = async (interaction) => {
    await interaction.reply({
        embeds: [{
            title: '❓ Help Center',
            description: 'Complete guide to using the Crypto Research Assistant',
            fields: [
                {
                    name: '📜 Legal Requirements',
                    value: '• You must accept the Terms of Service to use this bot\n• The disclaimer protects both users and developers\n• Financial decisions are your responsibility',
                    inline: false
                },
                {
                    name: '🔒 Security Requirements',
                    value: '• 2FA setup is mandatory for wallet operations\n• Use `/enable2fa` to set up two-factor authentication\n• Keep your 2FA backup codes safe',
                    inline: false
                },
                {
                    name: '🔑 Basic Commands',
                    value: '`!menu` - Open main menu\n`!help` - Show this help\n`!ping` - Check bot status',
                    inline: false
                },
                {
                    name: '💼 Wallet Features',
                    value: '• View and manage your crypto wallets\n• Send and receive tokens\n• Track portfolio performance',
                    inline: false
                },
                {
                    name: '📊 Research Features',
                    value: '• Analyze tokens and markets\n• View DeFi statistics\n• Track price movements',
                    inline: false
                }
            ],
            color: 0xF1C40F,
            footer: {
                text: 'Use the buttons below to navigate',
                icon_url: 'https://www.smalltimedevs.com/wp-content/uploads/2024/07/smalltimedevs-secondpage-1024x626.png'
            }
        }],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: 'view_disclaimer',
                        label: '📜 View Disclaimer',
                        style: 1
                    },
                    {
                        type: 2,
                        custom_id: 'setup_2fa',
                        label: '🔒 Setup 2FA',
                        style: 1
                    },
                    {
                        type: 2,
                        custom_id: 'back_to_menu',
                        label: 'Back to Menu',
                        style: 4,
                        emoji: '↩️'
                    }
                ]
            }
        ],
        ephemeral: true
    });
};

export const sendQuickStartSecurity = async (interaction, step = '2fa_setup') => {
    const steps = {
        '2fa_setup': {
            title: '🔒 Security Setup - Step 1: Two-Factor Authentication',
            description: 'Let\'s secure your account with 2FA',
            fields: [
                {
                    name: '📱 Why 2FA?',
                    value: '• Protects your wallet from unauthorized access\n• Required for all sensitive operations\n• Industry-standard security',
                    inline: false
                },
                {
                    name: '🔐 Setup Instructions',
                    value: '1. Click "Setup 2FA" below\n2. Scan QR code with authenticator app\n3. Verify your code',
                    inline: false
                }
            ],
            nextStep: 'wallet_security'
        },
        'wallet_security': {
            title: '💼 Security Setup - Step 2: Wallet Management',
            description: 'Understanding wallet security features',
            fields: [
                {
                    name: '🛡️ Security Features',
                    value: '• Encrypted private keys\n• Automatic logout\n• Withdrawal limits\n• Address whitelisting',
                    inline: false
                }
            ],
            nextStep: 'protected_tx'
        },
        'protected_tx': {
            title: '🔐 Security Setup - Step 3: Protected Transactions',
            description: 'Learn about transaction security',
            fields: [
                {
                    name: '🛟 Transaction Protection',
                    value: '• 2FA required for all transfers\n• Transaction limits\n• Whitelisted addresses only\n• Confirmation delays for large amounts',
                    inline: false
                }
            ],
            nextStep: 'complete'
        },
        'complete': {
            title: '✅ Security Setup Complete!',
            description: 'You\'re now ready to use all features securely',
            fields: [
                {
                    name: '📝 Summary',
                    value: '• 2FA Enabled\n• Wallet Security Configured\n• Transaction Protection Active',
                    inline: false
                }
            ]
        }
    };

    const currentStep = steps[step];
    const embed = new EmbedBuilder()
        .setTitle(currentStep.title)
        .setDescription(currentStep.description)
        .setColor(0x5865F2)
        .addFields(currentStep.fields);

    const rows = [];
    const buttons = [];

    if (step === '2fa_setup') {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('setup_2fa')
                .setLabel('Setup 2FA')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔒')
        );
    }

    if (currentStep.nextStep) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`quickstart_${currentStep.nextStep}`)
                .setLabel('Next Step')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➡️')
        );
    }

    if (step === 'complete') {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('open_menu')
                .setLabel('Return to Menu')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🏠')
        );
    }

    if (buttons.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(buttons));
    }

    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        if (interaction.deferred) {
            await interaction.editReply({
                embeds: [embed],
                components: rows
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: rows,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error in sendQuickStartSecurity:', error);
        // If all else fails, try to send a followUp
        await interaction.followUp({
            embeds: [embed],
            components: rows,
            ephemeral: true
        }).catch(console.error);
    }
};
