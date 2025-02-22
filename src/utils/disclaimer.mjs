import { checkUserAgreement, storeUserAgreement } from '../db/dynamo.mjs';

export const handleDisclaimerCheck = async (userId, username, interaction) => {
    try {
        const { agreed } = await checkUserAgreement(userId);
        return agreed;
    } catch (error) {
        console.error('Error checking disclaimer:', error);
        throw error;
    }
};

export const sendDisclaimer = async (channel) => {
    const disclaimer = `**Disclaimer for Small Time Devs Crypto Bot:**

By using the Small Time Devs Crypto Bot ("Aramid"), you agree to the following:

1. **No Financial Advice:** Information is for educational purposes only. Consult a licensed advisor before investing.
2. **Use at Your Own Risk:** Small Time Devs is not liable for errors, delays, or actions you take using the bot.
3. **No Warranty:** The bot is provided "as is" with no guarantees.
4. **Limited Liability:** Small Time Devs is not responsible for losses or damages, including financial or data loss.
5. **User Responsibility:** Users are solely responsible for misuse or illegal activity.
6. **Compliance Risks:** Ensure you follow all applicable laws and regulations.
7. **Indemnification:** You agree to hold Small Time Devs harmless from claims related to your use of the bot.
8. **Updates:** This disclaimer may change without notice; continued use means acceptance.
9. **Governing Law:** Governed by your jurisdiction's laws.

By using the bot, you acknowledge and accept these terms. Stop using the bot if you disagree.`;

    return await channel.send({
        embeds: [{
            title: 'Terms of Service Agreement',
            description: disclaimer,
            color: 0xFF0000,
        }],
        components: [{
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: 'agree_terms',
                    label: 'I Agree',
                    style: 3, // Green button
                },
                {
                    type: 2,
                    custom_id: 'disagree_terms',
                    label: 'I Disagree',
                    style: 4, // Red button
                }
            ]
        }]
    });
};

export const handleDisclaimerResponse = async (interaction) => {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    if (interaction.customId === 'agree_terms') {
        try {
            await storeUserAgreement(userId, username);
            await interaction.reply({
                content: 'Thank you for accepting the terms. You can now use the bot.',
                ephemeral: true
            });
            return true;
        } catch (error) {
            console.error('Error storing agreement:', error);
            await interaction.reply({
                content: 'Error processing your agreement. Please try again.',
                ephemeral: true
            });
            return false;
        }
    } else if (interaction.customId === 'disagree_terms') {
        await interaction.reply({
            content: 'You must accept the terms to use this bot. You can try again by using the !menu command.',
            ephemeral: true
        });
        return false;
    }
};

export const checkAndHandleDisclaimer = async (interaction) => {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    try {
        const hasAgreed = await handleDisclaimerCheck(userId, username);
        if (!hasAgreed) {
            await sendDisclaimer(interaction.channel);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error in disclaimer check:', error);
        await interaction.reply({
            content: 'Error checking terms agreement. Please try again.',
            ephemeral: true
        });
        return false;
    }
};
