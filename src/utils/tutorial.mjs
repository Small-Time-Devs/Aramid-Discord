import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const tutorialSteps = {
    start: {
        title: '🎓 Welcome to the Tutorial',
        description: 'Let\'s walk through everything you need to know about using the Crypto Research Assistant.',
        fields: [
            {
                name: '📚 Tutorial Sections',
                value: '1️⃣ Security Setup\n2️⃣ Wallet Features\n3️⃣ Research Tools',
                inline: false
            }
        ],
        nextStep: 'security_1'
    },
    security_1: {
        title: '🔒 Security Setup - Step 1',
        description: 'First, you need to accept the Terms of Service.',
        fields: [
            {
                name: '📜 Terms of Service',
                value: 'Click "View Terms" to read and accept the disclaimer.',
                inline: false
            }
        ],
        nextStep: 'security_2'
    },
    security_2: {
        title: '🔐 Security Setup - Step 2',
        description: 'Enable Two-Factor Authentication (2FA)',
        fields: [
            {
                name: '🛡️ Why 2FA?',
                value: 'Protects your wallet from unauthorized access',
                inline: false
            },
            {
                name: '📱 Setup Steps',
                value: '1. Use `/enable2fa` command\n2. Scan QR code with authenticator app\n3. Save backup codes',
                inline: false
            }
        ],
        nextStep: 'wallet_1'
    },
    wallet_1: {
        title: '💼 Wallet Features - Step 1',
        description: 'Setting up your crypto wallet',
        fields: [
            {
                name: '🏦 Create Wallet',
                value: 'Click "View Wallet" in the main menu to create your wallet',
                inline: false
            },
            {
                name: '🔑 Important',
                value: 'Never share your private keys with anyone',
                inline: false
            }
        ],
        nextStep: 'wallet_2'
    },
    wallet_2: {
        title: '📤 Wallet Features - Step 2',
        description: 'Managing your wallet',
        fields: [
            {
                name: '💰 Available Actions',
                value: '• Send tokens\n• Receive tokens\n• View balances\n• Track portfolio',
                inline: false
            }
        ],
        nextStep: 'research_1'
    },
    research_1: {
        title: '📊 Research Tools - Step 1',
        description: 'Learn how to research tokens and markets',
        fields: [
            {
                name: '🔍 Research Features',
                value: '• Token analysis\n• Price tracking\n• Market statistics\n• DeFi insights',
                inline: false
            }
        ],
        nextStep: 'research_2'
    },
    research_2: {
        title: '📈 Research Tools - Step 2',
        description: 'Using market analysis tools',
        fields: [
            {
                name: '📑 Available Data',
                value: '• Market caps\n• Trading volume\n• Price charts\n• Token metrics',
                inline: false
            }
        ],
        nextStep: 'complete'
    },
    complete: {
        title: '🎉 Tutorial Complete!',
        description: 'You\'re now ready to use all features of the Crypto Research Assistant',
        fields: [
            {
                name: '📝 Summary',
                value: '• Security setup complete\n• Wallet management learned\n• Research tools explored',
                inline: false
            },
            {
                name: '🚀 Next Steps',
                value: 'Return to the main menu to start using the bot!',
                inline: false
            }
        ]
    }
};

export async function handleTutorial(interaction, step = 'start') {
    const currentStep = tutorialSteps[step];
    
    const embed = new EmbedBuilder()
        .setTitle(currentStep.title)
        .setDescription(currentStep.description)
        .setColor(0x0099FF)
        .addFields(currentStep.fields);

    // Create main row of buttons
    const rows = [];
    const mainRow = new ActionRowBuilder();
    
    if (currentStep.nextStep) {
        mainRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`tutorial_${currentStep.nextStep}`)
                .setLabel('Next Step')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➡️')
        );
    }

    if (step !== 'start') {
        mainRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`tutorial_${getPreviousStep(step)}`)
                .setLabel('Previous Step')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
        );
    }

    rows.push(mainRow);

    // Add Open Menu button for the final step
    if (step === 'complete') {
        const menuRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_menu')  // Changed from 'open_main_menu' to match startup message
                    .setLabel('Open Main Menu')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏠')
            );
        rows.push(menuRow);
    }

    await interaction.update({
        embeds: [embed],
        components: rows
    }).catch(async () => {
        await interaction.reply({
            embeds: [embed],
            components: rows,
            ephemeral: true
        });
    });
}

function getPreviousStep(currentStep) {
    const steps = Object.entries(tutorialSteps);
    const currentIndex = steps.findIndex(([key]) => key === currentStep);
    return steps[currentIndex - 1]?.[0] || 'start';
}

export async function startTutorial(interaction) {
    await handleTutorial(interaction, 'start');
}
