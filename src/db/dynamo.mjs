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

const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        convertClassInstanceToMap: true,
        removeUndefinedValues: true,
    },
    unmarshallOptions: {
        wrapNumbers: false,
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
            Key: { userId: userId.toString() },
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
            Key: { userId: userId.toString() }, // Use number directly
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
            Key: { userId: userId.toString() },
            UpdateExpression: 'set twoFactorSecret = :secret',
            ExpressionAttributeValues: {
                ':secret': encryptPrivateKey(secret),
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
            Key: { userId: userId.toString() },
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
            Key: { userId: userId.toString() },
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
            Key: { userId: userId.toString() },
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
            Key: { userId: userId.toString() },
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
        await docClient.send(new PutCommand({
            TableName: 'AramidDiscord-mmSettings',
            Item: {
                userId: userId.toString(),
                ...config,
            },
        }));

        console.log(`Market making config saved for Discord user: ${userId}`);
    } catch (error) {
        console.error('Error saving market making config:', error);
        throw error;
    }
}

export async function checkMarketMakingConfig(userId) {
    try {
        const userData = await docClient.send(new GetCommand({
            TableName: 'AramidDiscord-mmSettings',
            Key: { userId: userId.toString() },
        }));

        return !!userData.Item;
    } catch (error) {
        console.error('Error checking market-making config:', error);
        throw error;
    }
}

export async function storeTrade(tradeDetails) {
    const tableName = 'AramidDiscord-Trades';
    
    try {
        await docClient.send(new PutCommand({
            TableName: tableName,
            Item: {
                ...tradeDetails,
                userId: tradeDetails.userId.toString()
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
