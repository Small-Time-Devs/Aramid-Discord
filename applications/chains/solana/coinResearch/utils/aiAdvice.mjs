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
        
        // Log the payload being sent
        console.log(`[AI ADVICE] Sending payload: ${JSON.stringify(payload)}`);
        
        // Create a custom axios instance with a much longer timeout
        const axiosInstance = axios.create({
            timeout: 120000 // 2 minutes timeout (or you can set to 0 for no timeout)
        });
        
        // Start time for tracking
        const startTime = Date.now();
        
        // Make the API request
        const response = await axiosInstance.post(AI_ADVICE_ENDPOINT, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Calculate how long it took
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[AI ADVICE] Response received in ${elapsedTime} seconds`);
        
        // Log successful response with full data for debugging
        console.log(`AI advice received for token: ${contractAddress}`);
        console.log(`[AI ADVICE] Response status: ${response.status}`);
        console.log(`[AI ADVICE] Response data type: ${typeof response.data}`);
        
        // Log the full response for debugging
        console.log(`[AI ADVICE] Full API response:`, JSON.stringify(response.data, null, 2));
        
        // Early return if response.data is empty or undefined
        if (!response.data) {
            console.error('[AI ADVICE] Empty response data from API');
            throw new Error('Empty response from AI service');
        }
        
        // IMPORTANT: Extract the agents array from the response
        // The API returns { agents: [ ... analysis objects ... ] }
        let formattedResponse = [];
        
        if (response.data.agents && Array.isArray(response.data.agents)) {
            console.log('[AI ADVICE] Found agents array in response with', response.data.agents.length, 'items');
            formattedResponse = response.data.agents;
        } else if (Array.isArray(response.data)) {
            console.log('[AI ADVICE] Direct array in response with', response.data.length, 'items');
            formattedResponse = response.data;
        } else if (typeof response.data === 'object') {
            // Handle the case where the response might be a single object
            console.log('[AI ADVICE] Converting single object to array');
            // Check if we have an agent property and it's an object
            if (response.data.agent && typeof response.data.agent === 'object') {
                formattedResponse = [response.data.agent];
            } else {
                // Try to extract any valid-looking analysis fields
                const possibleAnalysis = {};
                if (response.data.name) possibleAnalysis.name = response.data.name;
                if (response.data.personality) possibleAnalysis.personality = response.data.personality;
                if (response.data.response) possibleAnalysis.response = response.data.response;
                if (response.data.decision) possibleAnalysis.decision = response.data.decision;
                
                // If it looks like a valid analysis, use it
                if (Object.keys(possibleAnalysis).length >= 2) {
                    formattedResponse = [possibleAnalysis];
                } else {
                    // Last resort - wrap the whole object
                    formattedResponse = [response.data];
                }
            }
        }
        
        // If we somehow still have an empty array, throw an error
        if (formattedResponse.length === 0) {
            console.error('[AI ADVICE] Could not extract valid analysis data');
            throw new Error('Invalid analysis data format');
        }
        
        // Validate each response object to make sure it has the required fields
        // BUT PRESERVE THE ORIGINAL CONTENT - don't replace with defaults
        formattedResponse = formattedResponse.map(item => {
            // Create a copy to avoid modifying the original
            const validatedItem = { ...item };
            
            // Only provide defaults for missing fields
            if (!validatedItem.name) validatedItem.name = 'TokenAnalyst';
            if (!validatedItem.personality) validatedItem.personality = 'Data analysis specialist';
            if (!validatedItem.response) validatedItem.response = 'No analysis available';
            if (!validatedItem.decision) validatedItem.decision = 'Analysis incomplete';
            
            return validatedItem;
        });
        
        console.log(`[AI ADVICE] Formatted response (first 300 chars):`, 
                   JSON.stringify(formattedResponse).substring(0, 300) + '...');
        
        // Log the actual response text length to help debug
        if (formattedResponse.length > 0) {
            console.log(`[AI ADVICE] First analysis response length: ${formattedResponse[0].response?.length || 0}`);
            console.log(`[AI ADVICE] First analysis response preview: ${formattedResponse[0].response?.substring(0, 100)}...`);
        }
        
        return formattedResponse;
        
    } catch (error) {
        console.error(`Error fetching AI advice for token ${contractAddress}:`, error);
        
        // Log more detailed error information
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('[AI ADVICE] Error response data:', error.response.data);
            console.error('[AI ADVICE] Error response status:', error.response.status);
            console.error('[AI ADVICE] Error response headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('[AI ADVICE] No response received:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('[AI ADVICE] Error message:', error.message);
        }
        
        // Create a fallback response so we don't completely fail
        // This will match the expected format in displayAiAnalysis
        return [{
            name: 'TokenAnalyst',
            personality: 'Data analysis specialist',
            response: `**Error Analyzing Token**\n\nUnable to retrieve detailed information for token ${contractAddress}. This could be due to:\n\n- The AI service timed out (this analysis can take up to 2 minutes for complex tokens)\n- Limited data available for this token\n- Network connectivity issues\n\n**Recommendation**\n\nPlease try again later or check this token on Solana blockchain explorers directly.`,
            decision: 'Unable to analyze at this time'
        }];
    }
}
