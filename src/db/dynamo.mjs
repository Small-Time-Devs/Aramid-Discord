import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Keypair, PublicKey } from '@solana/web3.js';
import xrpl from "xrpl";
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { encryptPrivateKey, decryptPrivateKey } from '../utils/encryption.mjs';

dotenv.config();

// Configure AWS DynamoDB
const client = new DynamoDBClient({
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY
    }
});

// Update marshalling options to prevent number conversion for large IDs
const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        convertEmptyValues: false,
        convertClassInstanceToMap: true,
        removeUndefinedValues: true,
        // This is important: prevent conversion of strings that look like numbers
        convertStringsToNumbers: false
    },
    unmarshallOptions: {
        wrapNumbers: false, // Consider changing this to true if needed
    },
});

export async function checkUserWallet(userId, username) {
    const usersTableName = 'AramidDiscord-Users';
    const addressBookTableName = 'AramidDiscord-AddressBook';

    console.log(`Checking for Discord user: ${userId}`);

    try {
        // Get user from users table
        const userData = await docClient.send(new GetCommand({
            TableName: usersTableName,
            Key: { userID: userId.toString() } // Changed to match other functions
        }));

        if (userData.Item) {
            // Update username if needed
            if (username && userData.Item.username !== username) {
                await updateUserName(userId, username);
            }

            // Fetch from address book
            const addressBookData = await docClient.send(new GetCommand({
                TableName: addressBookTableName,
                Key: { userID: userId.toString() } // Changed to match schema
            }));

            if (!addressBookData.Item) {
                // Create empty address book entry
                await docClient.send(new PutCommand({
                    TableName: addressBookTableName,
                    Item: { 
                        userID: userId.toString(), // Changed to match schema
                        username: username
                    }
                }));
            }

            // Generate wallets if they don't exist
            if (!addressBookData.Item?.solPublicKey || !addressBookData.Item?.solPrivateKey) {
                await generateSolanaWallet(userId);
            }

            if (!addressBookData.Item?.xrpPublicKey || !addressBookData.Item?.xrpPrivateKey) {
                await generateXrpWallet(userId);
            }
            
                        return {
                exists: true,
                solPublicKey: addressBookData.Item?.solPublicKey,
                                xrpPublicKey: addressBookData.Item?.xrpPublicKey,
                twoFactorEnabled: userData.Item.twoFactorEnabled || false,
                username: userData.Item.username,
                referredBy: userData.Item.referredBy
            };
        }

        return { exists: false };
    } catch (error) {
        console.error('Error checking user wallet:', error);
        throw error;
    }
}

export async function generateSolanaWallet(userId) {
    const keypair = Keypair.generate();
    const solPublicKey = keypair.publicKey.toBase58();
    const solPrivateKey = bs58.encode(keypair.secretKey);

    await storeSolanaWallet(userId, solPublicKey, solPrivateKey);
    return { solPublicKey, solPrivateKey };
}

export async function generateXrpWallet(userId) {
    const wallet = xrpl.Wallet.generate();
    const xrpPublicKey = wallet.classicAddress;
    const xrpPrivateKey = wallet.seed;

    await storeXrpWallet(userId, xrpPublicKey, xrpPrivateKey);
    return { xrpPublicKey, xrpPrivateKey };
}

export async function storeSolanaWallet(userId, solPublicKey, solPrivateKey) {
    const addressBookTableName = 'AramidDiscord-AddressBook';

    try {
        const updateParams = {
            TableName: addressBookTableName,
            Key: { userID: userId.toString() }, // Changed to match schema
            UpdateExpression: 'set solPublicKey = :solPublicKey, solPrivateKey = :solPrivateKey',
            ExpressionAttributeValues: {
                ':solPublicKey': solPublicKey,
                ':solPrivateKey': encryptPrivateKey(solPrivateKey),
            },
            ReturnValues: 'UPDATED_NEW',
        };

        await docClient.send(new UpdateCommand(updateParams));
        console.log(`Solana wallet stored for Discord user: ${userId}`);
    } catch (error) {
        console.error('Error storing Solana wallet:', error);
        throw error;
    }
}

export async function storeXrpWallet(userId, xrpPublicKey, xrpPrivateKey) {
    const addressBookTableName = 'AramidDiscord-AddressBook';

    try {
        const updateParams = {
            TableName: addressBookTableName,
            Key: { userID: userId.toString() }, // Changed userId to userID
            UpdateExpression: 'set xrpPublicKey = :xrpPublicKey, xrpPrivateKey = :xrpPrivateKey',
            ExpressionAttributeValues: {
                ':xrpPublicKey': xrpPublicKey,
                ':xrpPrivateKey': encryptPrivateKey(xrpPrivateKey),
            },
            ReturnValues: 'UPDATED_NEW',
        };

        await docClient.send(new UpdateCommand(updateParams));
        console.log(`XRP wallet stored for Discord user: ${userId}`);
    } catch (error) {
        console.error('Error storing XRP wallet:', error);
        throw error;
    }
}

export async function generateSolanaDepositWallet(userId) {
    const keypair = Keypair.generate();
    const solanaDepositPublicKey = keypair.publicKey.toBase58();
    const solanaDepositPrivateKey = bs58.encode(keypair.secretKey);

    await storeSolanaDepositWallet(userId, solanaDepositPublicKey, solanaDepositPrivateKey);
    return { solanaDepositPublicKey, solanaDepositPrivateKey };
}

export async function storeSolanaDepositWallet(userId, solanaDepositPublicKey, solanaDepositPrivateKey) {
    const addressBookTableName = 'AramidDiscord-AddressBook';

    try {
        const updateParams = {
            TableName: addressBookTableName,
            Key: { userID: userId.toString() }, // Changed userId to userID
            UpdateExpression: 'set solanaDepositPublicKey = :solanaDepositPublicKey, solanaDepositPrivateKey = :solanaDepositPrivateKey',
            ExpressionAttributeValues: {
                ':solanaDepositPublicKey': solanaDepositPublicKey,
                ':solanaDepositPrivateKey': encryptPrivateKey(solanaDepositPrivateKey),
            },
            ReturnValues: 'UPDATED_NEW',
        };

        await docClient.send(new UpdateCommand(updateParams));
        console.log(`Solana deposit wallet stored for Discord user: ${userId}`);
    } catch (error) {
        console.error('Error storing Solana deposit wallet:', error);
        throw error;
    }
}

export async function updateUserName(userId, username) {
    const tableName = 'AramidDiscord-Users';

    if (!username) {
        throw new Error('username must not be empty');
    }

    try {
        await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { userID: userId.toString() }, // Use number directly
            UpdateExpression: 'set username = :username',
            ExpressionAttributeValues: {
                ':username': username,
            },
        }));

        console.log(`Username updated for Discord user: ${userId}`);
    } catch (error) {
        console.error('Error updating username:', error);
        throw error;
    }
}

export async function save2FASecret(userId, secret) {
    const addressBookTableName = 'AramidDiscord-AddressBook';

    try {
        await docClient.send(new UpdateCommand({
            TableName: addressBookTableName,
            Key: { userID: userId.toString() }, // Changed from userId to userID
            UpdateExpression: 'set twoFactorSecret = :secret, twoFactorEnabled = :enabled',
            ExpressionAttributeValues: {
                ':secret': encryptPrivateKey(secret),
                ':enabled': true
            },
            ReturnValues: 'ALL_NEW',
        }));

        console.log(`2FA secret saved for Discord user: ${userId}`);
    } catch (error) {
        console.error('Error saving 2FA secret:', error);
        throw error;
    }
}

export async function get2FASecret(userId) {
    const addressBookTableName = 'AramidDiscord-AddressBook';

    try {
        const userData = await docClient.send(new GetCommand({
            TableName: addressBookTableName,
            Key: { userID: userId.toString() }, // Changed from userId to userID
        }));

        if (userData.Item?.twoFactorSecret) {
            return decryptPrivateKey(userData.Item.twoFactorSecret);
        }
        throw new Error('2FA is not enabled for this user.');
    } catch (error) {
        console.error('Error fetching 2FA secret:', error);
        throw error;
    }
}

export async function saveReferral(userId, referralCode) {
    try {
        await docClient.send(new UpdateCommand({
            TableName: 'AramidDiscord-Users',
            Key: { userID: userId.toString() }, // Changed userId to userID
            UpdateExpression: 'set referredBy = :referredBy',
            ExpressionAttributeValues: {
                ':referredBy': referralCode,
            },
        }));
        return true;
    } catch (error) {
        console.error('Error saving referral:', error);
        throw error;
    }
}

export async function checkUserAgreement(userId) {
    try {
        const userData = await docClient.send(new GetCommand({
            TableName: 'AramidDiscord-Terms',
            Key: { userID: userId.toString() } // Changed userId to userID
        }));

        return { agreed: !!userData.Item };
    } catch (error) {
        console.error('Error checking user agreement:', error);
        return { agreed: false };
    }
}

export async function storeUserAgreement(userId, username) {
    try {
        await docClient.send(new PutCommand({
            TableName: 'AramidDiscord-Terms',
            Item: {
                userID: userId.toString(), // Changed userId to userID
                username: username,
                agreedAt: new Date().toISOString(),
            },
        }));

        console.log(`User agreement stored for Discord user: ${userId}`);
        return true;
    } catch (error) {
        console.error('Error storing user agreement:', error);
        return false;
    }
}

export async function updateSolanaWithdrawAddress(userId, withdrawAddress) {
    if (!PublicKey.isOnCurve(withdrawAddress)) {
        throw new Error('Invalid Solana address.');
    }

    try {
        await docClient.send(new UpdateCommand({
            TableName: 'AramidDiscord-AddressBook',
            Key: { userID: userId.toString() }, // Changed userId to userID
            UpdateExpression: 'set solanaWithdrawAddress = :withdrawAddress',
            ExpressionAttributeValues: {
                ':withdrawAddress': withdrawAddress,
            },
        }));

        console.log(`Solana withdraw address updated for Discord user: ${userId}`);
    } catch (error) {
        console.error('Error updating Solana withdraw address:', error);
        throw error;
    }
}

export async function updateXrpWithdrawAddress(userId, withdrawAddress) {
    if (!xrpl.isValidClassicAddress(withdrawAddress)) {
        throw new Error('Invalid XRP address.');
    }

    try {
        await docClient.send(new UpdateCommand({
            TableName: 'AramidDiscord-AddressBook',
            Key: { userID: userId.toString() }, // Changed userId to userID
            UpdateExpression: 'set xrpWithdrawAddress = :withdrawAddress',
            ExpressionAttributeValues: {
                ':withdrawAddress': withdrawAddress,
            },
        }));

        console.log(`XRP withdraw address updated for Discord user: ${userId}`);
    } catch (error) {
        console.error('Error updating XRP withdraw address:', error);
        throw error;
    }
}

export async function saveMarketMakingConfig(userId, config) {
    try {
        const userIdString = String(userId);
        console.log(`Saving market making config for user ${userIdString}:`, config);
        
        // Prefix all market making keys with mm_ to avoid conflicts
        const prefixedConfig = {};
        Object.entries(config).forEach(([key, value]) => {
            prefixedConfig[`mm_${key}`] = value;
        });
        
        console.log('Prefixed market making config:', prefixedConfig);
        
        // Use the existing saveTradeSettings function to update the settings
        const success = await saveTradeSettings(userIdString, prefixedConfig);
        
        console.log(`Market making config saved successfully for user ${userIdString}`);
        return success;
    } catch (error) {
        console.error(`Error saving market making config for user ${userId}:`, error);
        throw error;
    }
}

export async function checkMarketMakingConfig(userId) {
    try {
        const config = await getMarketMakingConfig(userId);
        return !!config && !!config.tokenMint;
    } catch (error) {
        console.error('Error checking market-making config:', error);
        return false;
    }
}

export async function storeTrade(tradeDetails) {
    const tableName = 'AramidDiscord-Trades';
    
    try {
        await docClient.send(new PutCommand({
            TableName: tableName,
            Item: {
                ...tradeDetails,
                userID: tradeDetails.userId.toString() // Changed userId to userID
            }
        }));
        
        console.log(`Trade recorded for Discord user: ${tradeDetails.username}`);
        return true;
    } catch (error) {
        console.error('Error storing trade:', error);
        return false;
    }
}

export async function registerDiscordUser(userId, username, referredBy = '202145535086297088') {
    const tableName = 'AramidDiscord-Users';
    
    try {
        // Ensure all IDs are strings
        const userIdString = userId.toString();
        const referredByString = referredBy.toString();
        
        const userItem = {
            userID: userIdString,
            username: username || 'Unknown',
            referredBy: referredByString,
            isBetaUser: true,
            createdAt: new Date().toISOString()
        };

        // Check if user exists
        const existingUser = await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { userID: userIdString }
        }));

        if (!existingUser.Item) {
            await docClient.send(new PutCommand({
                TableName: tableName,
                Item: userItem
            }));
            console.log(`New Discord user registered: ${username} (${userIdString})`);
        } else {
            await docClient.send(new UpdateCommand({
                TableName: tableName,
                Key: { userID: userIdString },
                UpdateExpression: 'SET username = :username',
                ExpressionAttributeValues: {
                    ':username': username || 'Unknown'
                }
            }));
            console.log(`Updated existing Discord user: ${username} (${userIdString})`);
        }
        return true;
    } catch (error) {
        console.error('Error registering Discord user:', error);
        return false;
    }
}

/**
 * Get user's trade settings from DynamoDB
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} - User's trade settings or null if not found
 */
export async function getTradeSettings(userId) {
    try {
        // Always ensure userId is a string
        const userIdString = String(userId);
        console.log(`Fetching trade settings for user: ${userIdString}`);
        
        const result = await docClient.send(new GetCommand({
            TableName: 'AramidDiscord-Settings',
            Key: { userID: userIdString }
        }));
        
        if (result.Item) {
            console.log(`Found settings for user ${userIdString}`);
            return result.Item;
        } else {
            console.log(`No settings found for user ${userIdString}, returning default settings`);
            // Return default settings if none are found
            return {
                minQuickBuy: 0.1,
                mediumQuickBuy: 0.5,
                largeQuickBuy: 1.0,
                minQuickSell: 10,
                mediumQuickSell: 50,
                largeQuickSell: 100
            };
        }
    } catch (error) {
        console.error(`Error fetching trade settings for user ${userId}:`, error);
        return null;
    }
}

/**
 * Save user's trade settings to DynamoDB
 * @param {string} userId - Discord user ID
 * @param {Object} newSettings - Settings to save
 * @returns {Promise<boolean>} - Success status
 */
export async function saveTradeSettings(userId, newSettings) {
    try {
        // Always ensure userId is a string to avoid type issues
        const userIdString = String(userId);
        console.log(`Saving trade settings for user ${userIdString}:`, newSettings);
        
        // Get existing settings first
        const existingSettings = await getTradeSettings(userIdString) || {};
        
        // Merge existing with new settings
        const settings = {
            ...existingSettings,
            ...newSettings
        };

        // Ensure all IDs are stored as strings to avoid BigInt issues
        if (settings.channelId) settings.channelId = String(settings.channelId);
        if (settings.guildId) settings.guildId = String(settings.guildId);

        // Ensure all numeric values are properly parsed
        for (const key in settings) {
            if (!['userID', 'channelId', 'guildId', 'channelName', 'updatedAt'].includes(key) && 
                typeof settings[key] === 'string' && 
                !isNaN(parseFloat(settings[key]))) {
                settings[key] = parseFloat(settings[key]);
            }
        }

        // Create a clean object for DynamoDB without any risk of type confusion
        const itemToSave = {
            userID: userIdString, // Explicitly a string
            ...settings,
            updatedAt: new Date().toISOString()
        };

        // Delete any problematic fields
        delete itemToSave.userId; // Ensure no mixed case variants exist

        console.log('Final item being saved to DynamoDB:', JSON.stringify(itemToSave));

        await docClient.send(new PutCommand({
            TableName: 'AramidDiscord-Settings',
            Item: itemToSave
        }));

        console.log(`Trade settings saved successfully for user ${userIdString}`);
        return true;
    } catch (error) {
        console.error(`Error saving trade settings for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Get a user's referral public key if available
 * @param {string} userId - The Discord user ID
 * @returns {Promise<string|null>} - Returns the referral public key or null if not found
 */
export async function getReferralPublicKey(userId) {
    try {
        // Get user data from the users table
        const userData = await docClient.send(new GetCommand({
            TableName: 'AramidDiscord-Users',
            Key: { userID: userId.toString() }
        }));
        
        // Check if the user has a referral key set
        if (userData?.Item?.referralPublicKey) {
            return userData.Item.referralPublicKey;
        }

        // If user has no referral key, return null
        return null;
    } catch (error) {
        console.error(`Error getting referral public key for user ${userId}:`, error);
        return null;
    }
}

/**
 * Safely get and decrypt a user's Solana private key for transactions
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} - Object containing solPublicKey and solPrivateKey
 */
export async function getTransactionKeys(userId) {
    try {
        console.log(`Fetching transaction keys for user: ${userId}`);
        
        // Get user's wallet address book record
        const addressBookData = await docClient.send(new GetCommand({
            TableName: 'AramidDiscord-AddressBook',
            Key: { userID: userId.toString() }
        }));

        // Check if we have data
        if (!addressBookData.Item) {
            console.error(`No address book record found for user: ${userId}`);
            return { success: false, error: 'No wallet found' };
        }

        // Check if we have the keys we need
        if (!addressBookData.Item.solPublicKey || !addressBookData.Item.solPrivateKey) {
            console.error(`Missing wallet keys for user: ${userId}`);
            return { success: false, error: 'Incomplete wallet data' };
        }

        // Decrypt the private key
        const solPublicKey = addressBookData.Item.solPublicKey;
        let solPrivateKey;
        
        try {
            solPrivateKey = decryptPrivateKey(addressBookData.Item.solPrivateKey);
        } catch (decryptError) {
            console.error(`Failed to decrypt private key for user: ${userId}`, decryptError);
            return { success: false, error: 'Failed to decrypt private key' };
        }

        // Return the keys needed for transactions
        return {
            success: true,
            solPublicKey,
            solPrivateKey
        };
    } catch (error) {
        console.error(`Error fetching transaction keys for user ${userId}:`, error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Get user's referral key for transaction fee sharing
 * @param {string} userId - Discord user ID
 * @returns {Promise<string|null>} - Referral public key or null if not found
 */
export async function getTransactionReferral(userId) {
    try {
        // Get user data from the users table
        const userData = await docClient.send(new GetCommand({
            TableName: 'AramidDiscord-Users',
            Key: { userID: userId.toString() }
        }));
        
        return userData?.Item?.referralPublicKey || null;
    } catch (error) {
        console.error(`Error getting referral key for user ${userId}:`, error);
        return null;
    }
}

/**
 * Get user's market making configuration from the settings table
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} - Market making configuration or null if not found
 */
export async function getMarketMakingConfig(userId) {
    try {
        // Always ensure userId is a string
        const userIdString = String(userId);
        console.log(`Fetching market making config for user: ${userIdString}`);
        
        // Use the existing getTradeSettings function to get all user settings
        const settings = await getTradeSettings(userIdString);
        
        if (settings) {
            // Extract market making specific settings if they exist
            const marketMakingConfig = {
                outputMint: settings.mm_outputMint,
                slippage: settings.mm_slippage || 0.5,
                useGeneratedWallets: settings.mm_useGeneratedWallets || 'True',
                walletGenerationType: settings.mm_walletGenerationType || 'Range',
                numberOfWallets: settings.mm_numberOfWallets || 5,
                minTrades: settings.mm_minTrades || 1,
                maxTrades: settings.mm_maxTrades || 10,
                leaveDust: settings.mm_leaveDust || 'No',
                dustAmountType: settings.mm_dustAmountType || 'Static',
                staticDustAmount: settings.mm_staticDustAmount || 0,
                minSolBalance: settings.mm_minSolBalance || 0.05,
                sellPercentageType: settings.mm_sellPercentageType || 'Static',
                staticSellPercentage: settings.mm_staticSellPercentage || 100,
                rangeMinSellPercentage: settings.mm_rangeMinSellPercentage || 50,
                rangeMaxSellPercentage: settings.mm_rangeMaxSellPercentage || 100,
                retryAmount: settings.mm_retryAmount || 5,
                tradeInvestmentType: settings.mm_tradeInvestmentType || 'Range',
                staticPurchaseAmount: settings.mm_staticPurchaseAmount || 0.1,
                rangeMinPurchaseAmount: settings.mm_rangeMinPurchaseAmount || 0.1,
                rangeMaxPurchaseAmount: settings.mm_rangeMaxPurchaseAmount || 0.5,
                platform: settings.mm_platform || 'Raydium',
                isRunning: settings.mm_isRunning || false,
                tokenMint: settings.mm_outputMint, // Duplicate for compatibility with existing code
                tokenSymbol: settings.mm_tokenSymbol,
                tokenName: settings.mm_tokenName,
                finalWalletAddress: settings.mm_finalWalletAddress || null,
                autoAdjust: settings.mm_autoAdjust !== undefined ? settings.mm_autoAdjust : true,
                active: settings.mm_active || false,
                startedAt: settings.mm_startedAt,
                stoppedAt: settings.mm_stoppedAt,
            };
            
            // Check if any market making config exists
            if (marketMakingConfig.outputMint || marketMakingConfig.tokenMint) {
                console.log(`Found market making config for user ${userIdString}`);
                return marketMakingConfig;
            }
        }
        
        console.log(`No market making config found for user ${userIdString}`);
        return null;
    } catch (error) {
        console.error(`Error fetching market making config for user ${userId}:`, error);
        return null;
    }
}

/**
 * Get previous tokens used for market making by this user
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array>} - Array of token objects
 */
export async function getPreviousMMTokens(userId) {
    try {
        // Always ensure userId is a string
        const userIdString = String(userId);
        console.log(`Fetching previous MM tokens for user: ${userIdString}`);
        
        // First check if the AramidDiscord-mmSettings table exists
        let tableExists = false;
        try {
            // Try to scan with limit 1 to check if table exists
            await docClient.send(new ScanCommand({
                TableName: 'AramidDiscord-mmSettings',
                Limit: 1
            }));
            tableExists = true;
        } catch (tableError) {
            console.log('mmSettings table does not exist or is not accessible, falling back to Settings table');
        }
        
        // If dedicated table exists, use it
        if (tableExists) {
            const result = await docClient.send(new QueryCommand({
                TableName: 'AramidDiscord-mmSettings',
                KeyConditionExpression: 'userID = :userId',
                ExpressionAttributeValues: {
                    ':userId': userIdString
                }
            }));
            
            if (result.Items && result.Items.length > 0) {
                // Extract unique tokens
                const tokenMap = {};
                
                result.Items.forEach(item => {
                    const tokenMint = item.tokenMint || item.outputMint;
                    if (tokenMint && !tokenMap[tokenMint]) {
                        tokenMap[tokenMint] = {
                            tokenMint: tokenMint,
                            symbol: item.tokenSymbol || null,
                            name: item.tokenName || null,
                            lastUsed: item.updatedAt || null
                        };
                    }
                });
                
                // Convert to array and sort by last used (most recent first)
                const tokens = Object.values(tokenMap).sort((a, b) => {
                    if (!a.lastUsed) return 1;
                    if (!b.lastUsed) return -1;
                    return new Date(b.lastUsed) - new Date(a.lastUsed);
                });
                
                console.log(`Found ${tokens.length} previous MM tokens for user ${userIdString}`);
                return tokens;
            }
        }
        
        // Fall back to the Settings table and look for mm_ prefixed settings
        const settings = await getTradeSettings(userIdString);
        if (settings && settings.mm_outputMint) {
            // Create a token object from the settings
            return [{
                tokenMint: settings.mm_outputMint,
                symbol: settings.mm_tokenSymbol || null,
                name: settings.mm_tokenName || null,
                lastUsed: settings.updatedAt || null
            }];
        }
        
        console.log(`No previous MM tokens found for user ${userIdString}`);
        return [];
    } catch (error) {
        console.error(`Error fetching previous MM tokens for user ${userId}:`, error);
        return [];
    }
}

/**
 * Get market making settings for a specific token
 * @param {string} userId - Discord user ID
 * @param {string} tokenMint - Token mint address
 * @returns {Promise<Object|null>} - Token settings or null if not found
 */
export async function getMMSettings(userId, tokenMint) {
    try {
        const userIdString = String(userId);
        console.log(`Fetching MM settings for user ${userIdString} and token ${tokenMint}`);
        
        // First try dedicated mmSettings table if it exists
        let tableExists = false;
        let tokenSettings = null;
        
        try {
            // Check if the table exists
            await docClient.send(new ScanCommand({
                TableName: 'AramidDiscord-mmSettings',
                Limit: 1
            }));
            tableExists = true;
        } catch (tableError) {
            console.log('mmSettings table does not exist or is not accessible, falling back to Settings table');
        }
        
        // If table exists, get the specific token settings
        if (tableExists) {
            try {
                const result = await docClient.send(new QueryCommand({
                    TableName: 'AramidDiscord-mmSettings',
                    KeyConditionExpression: 'userID = :userId AND tokenMint = :tokenMint',
                    ExpressionAttributeValues: {
                        ':userId': userIdString,
                        ':tokenMint': tokenMint
                    }
                }));
                
                if (result.Items && result.Items.length > 0) {
                    tokenSettings = result.Items[0];
                    console.log(`Found MM settings for token ${tokenMint} in mmSettings table`);
                }
            } catch (error) {
                console.error('Error querying mmSettings table:', error);
            }
        }
        
        // If we didn't find settings in the dedicated table, check the main settings table
        if (!tokenSettings) {
            const settings = await getTradeSettings(userIdString);
            
            if (settings && (settings.mm_outputMint === tokenMint || settings.mm_tokenMint === tokenMint)) {
                // Convert mm_ prefixed settings to regular keys
                tokenSettings = {};
                Object.entries(settings).forEach(([key, value]) => {
                    if (key.startsWith('mm_')) {
                        tokenSettings[key.substring(3)] = value;
                    }
                });
                console.log(`Found MM settings for token ${tokenMint} in main settings table`);
            }
        }
        
        if (!tokenSettings) {
            console.log(`No MM settings found for token ${tokenMint}`);
            return null;
        }
        
        // Return normalized settings
        return {
            outputMint: tokenSettings.outputMint || tokenSettings.tokenMint,
            slippage: tokenSettings.slippage || 0.5,
            useGeneratedWallets: tokenSettings.useGeneratedWallets || 'True',
            walletGenerationType: tokenSettings.walletGenerationType || 'Range',
            numberOfWallets: tokenSettings.numberOfWallets || 5,
            minTrades: tokenSettings.minTrades || 1,
            maxTrades: tokenSettings.maxTrades || 10,
            leaveDust: tokenSettings.leaveDust || 'No',
            dustAmountType: tokenSettings.dustAmountType || 'Static',
            staticDustAmount: tokenSettings.staticDustAmount || 0,
            minSolBalance: tokenSettings.minSolBalance || 0.05,
            sellPercentageType: tokenSettings.sellPercentageType || 'Static',
            staticSellPercentage: tokenSettings.staticSellPercentage || 100,
            rangeMinSellPercentage: tokenSettings.rangeMinSellPercentage || 50,
            rangeMaxSellPercentage: tokenSettings.rangeMaxSellPercentage || 100,
            retryAmount: tokenSettings.retryAmount || 5,
            tradeInvestmentType: tokenSettings.tradeInvestmentType || 'Range',
            staticPurchaseAmount: tokenSettings.staticPurchaseAmount || 0.1,
            rangeMinPurchaseAmount: tokenSettings.rangeMinPurchaseAmount || 0.1,
            rangeMaxPurchaseAmount: tokenSettings.rangeMaxPurchaseAmount || 0.5,
            platform: tokenSettings.platform || 'Raydium',
            tokenSymbol: tokenSettings.tokenSymbol,
            tokenName: tokenSettings.tokenName,
            finalWalletAddress: tokenSettings.finalWalletAddress,
            isRunning: tokenSettings.isRunning || false
        };
    } catch (error) {
        console.error(`Error fetching MM settings for token ${tokenMint}:`, error);
        return null;
    }
}

/**
 * Save market making settings for a specific token
 * @param {string} userId - Discord user ID
 * @param {string} tokenMint - Token mint address
 * @param {Object} settings - Market making settings
 * @returns {Promise<boolean>} - Success status
 */
export async function saveMMSettings(userId, tokenMint, settings) {
    try {
        const userIdString = String(userId);
        console.log(`Saving MM settings for user ${userIdString} and token ${tokenMint}`);
        
        // Check if the dedicated mmSettings table exists
        let tableExists = false;
        try {
            await docClient.send(new ScanCommand({
                TableName: 'AramidDiscord-mmSettings',
                Limit: 1
            }));
            tableExists = true;
        } catch (tableError) {
            console.log('mmSettings table does not exist, falling back to Settings table');
        }
        
        // If the table exists, save to it
        if (tableExists) {
            const item = {
                userID: userIdString,
                tokenMint: tokenMint,
                ...settings,
                updatedAt: new Date().toISOString()
            };
            
            await docClient.send(new PutCommand({
                TableName: 'AramidDiscord-mmSettings',
                Item: item
            }));
            
            console.log(`Saved settings to mmSettings table for token ${tokenMint}`);
        }
        
        // Always save to the main settings table with mm_ prefix
        const prefixedSettings = {};
        Object.entries(settings).forEach(([key, value]) => {
            prefixedSettings[`mm_${key}`] = value;
        });
        
        // Add the token mint with both potential keys for backward compatibility
        prefixedSettings.mm_tokenMint = tokenMint;
        prefixedSettings.mm_outputMint = tokenMint;
        
        await saveTradeSettings(userIdString, prefixedSettings);
        
        console.log(`Saved MM settings for token ${tokenMint} in main settings table`);
        return true;
    } catch (error) {
        console.error(`Error saving MM settings for token ${tokenMint}:`, error);
        throw error;
    }
}

/**
 * Get user's market making transactions
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array>} - Array of transaction objects
 */
export async function getMMTransactions(userId) {
    try {
        const userIdString = String(userId);
        console.log(`Fetching MM transactions for user: ${userIdString}`);
        
        // Check if the table exists
        let tableExists = false;
        try {
            await docClient.send(new ScanCommand({
                TableName: 'AramidDiscord-mmTransactions',
                Limit: 1
            }));
            tableExists = true;
        } catch (tableError) {
            console.log('mmTransactions table does not exist');
            return [];
        }
        
        if (tableExists) {
            const result = await docClient.send(new QueryCommand({
                TableName: 'AramidDiscord-mmTransactions',
                KeyConditionExpression: 'userID = :userId',
                ExpressionAttributeValues: {
                    ':userId': userIdString
                }
            }));
            
            if (result.Items && result.Items.length > 0) {
                console.log(`Found ${result.Items.length} MM transactions for user ${userIdString}`);
                return result.Items;
            }
        }
        
        console.log(`No MM transactions found for user ${userIdString}`);
        return [];
    } catch (error) {
        console.error(`Error fetching MM transactions for user ${userId}:`, error);
        return [];
    }
}
