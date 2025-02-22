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

export const sendWalletDetails = async (channel, walletData) => {
    return await channel.send({
        embeds: [{
            title: 'Wallet Details',
            fields: [
                {
                    name: 'Solana',
                    value: `Public Key: ${walletData.solana.publicKey}\nBalance: ${walletData.solana.balance} SOL`,
                    inline: true
                },
                {
                    name: 'XRP',
                    value: `Public Key: ${walletData.xrp.publicKey}\nBalance: ${walletData.xrp.balance} XRP`,
                    inline: true
                }
            ],
            color: 0x0099ff
        }]
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
