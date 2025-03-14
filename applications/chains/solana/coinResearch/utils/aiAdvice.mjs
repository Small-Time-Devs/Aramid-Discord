import axios from 'axios';

// AI advice API endpoint
const AI_ADVICE_ENDPOINT = 'https://api.smalltimedevs.com/ai/hive-engine/discord-token-advice';

/**
 * Fetch token AI advice from the API
 * @param {string} contractAddress - Solana token address
 * @returns {Promise<Object>} - AI advice response
 */
export async function fetchTokenAiAdvice(contractAddress) {
    try {
        console.log(`Fetching AI advice for token: ${contractAddress}`);
        
        // Prepare the request payload
        const payload = {
            chain: 'solana',
            contractAddress: contractAddress
        };
        
        // Make the API request
        const response = await axios.post(AI_ADVICE_ENDPOINT, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30-second timeout for AI processing
        });
        
        // Log successful response
        console.log(`AI advice received for token: ${contractAddress}`);
        return response.data;
        
    } catch (error) {
        console.error(`Error fetching AI advice for token ${contractAddress}:`, error);
        
        // Get more error details if available
        let errorMessage = 'Failed to get AI analysis';
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            errorMessage = `API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            errorMessage = 'No response received from AI service';
            console.error('Error request:', error.request);
        } else {
            // Something happened in setting up the request
            errorMessage = `Request error: ${error.message}`;
        }
        
        throw new Error(errorMessage);
    }
}
