import dotenv from 'dotenv';
dotenv.config();

export const CHANNEL_IDS = {
    WELCOME: process.env.WELCOME_CHANNEL_ID,
    GENERAL: process.env.GENERAL_CHANNEL_ID,
    ADMIN: process.env.ADMIN_CHANNEL_ID
};

export const isValidChannel = (channelId) => {
    return Object.values(CHANNEL_IDS).includes(channelId);
};
