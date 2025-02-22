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

export const sendMainMenu = async (channel) => {
    console.log('Main menu requested');
    return await channel.send({
        embeds: [{
            title: 'Crypto Research Menu',
            description: 'Please select an option below:',
            color: 0x0099ff
        }],
        components: [{
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: 'view_wallet',
                    label: 'View Wallet',
                    style: 1,
                },
                {
                    type: 2,
                    custom_id: 'research_token',
                    label: 'Research Token',
                    style: 1,
                },
                {
                    type: 2,
                    custom_id: 'chain_selection',
                    label: 'Chain Selection',
                    style: 1,
                }
            ]
        }]
    });
};

export const sendChainSelection = async (channel) => {
    console.log('Chain selection menu requested');
    return await channel.send({
        embeds: [{
            title: 'Select Blockchain',
            description: 'Choose a blockchain to interact with:',
            color: 0x0099ff
        }],
        components: [{
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: 'chain_solana',
                    label: 'Solana',
                    style: 1,
                },
                {
                    type: 2,
                    custom_id: 'chain_ethereum',
                    label: 'Ethereum',
                    style: 1,
                }
            ]
        }]
    });
};
