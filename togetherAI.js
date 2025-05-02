// Together AI API Integration Module

// Import configuration
// Note: This assumes config.js is loaded before this script
// const config = window.config || {};

// Cache for API key to avoid repeated storage lookups
let cachedAPIKey = null;

/**
 * Get the Together AI API key from storage or use default
 * @returns {Promise<string>} API key
 */
async function getAPIKey() {
    // Return cached key if available
    if (cachedAPIKey) {
        console.log('Using cached API key');
        return cachedAPIKey;
    }
    
    try {
        // Try to get API key from storage
        return new Promise((resolve) => {
            chrome.storage.sync.get(['togetherApiKey'], (result) => {
                if (result.togetherApiKey && result.togetherApiKey.trim() !== '') {
                    console.log('Using user-provided API key');
                    cachedAPIKey = result.togetherApiKey;
                    resolve(result.togetherApiKey);
                } else {
                    // Use default API key from config
                    console.log('Using default API key from config:', config.togetherAI.defaultApiKey ? 'Key found' : 'No key found');
                    cachedAPIKey = config.togetherAI.defaultApiKey;
                    resolve(config.togetherAI.defaultApiKey);
                }
            });
        });
    } catch (error) {
        console.error('Error getting API key:', error);
        // Fallback to default API key
        console.log('Falling back to default API key');
        return config.togetherAI.defaultApiKey;
    }
}

/**
 * Clear the API key cache
 * This should be called when the API key is updated
 */
function clearAPIKeyCache() {
    cachedAPIKey = null;
    console.log('API key cache cleared');
}

/**
 * Simplify text using Together AI API
 * @param {string} text - Text to simplify
 * @param {string} systemPrompt - System prompt for the AI
 * @param {number} maxRetries - Maximum number of retries on failure
 * @returns {Promise<string>} Simplified text
 */
async function simplifyText(text, systemPrompt, maxRetries = 3) {
    const apiKey = await getAPIKey();
    if (!apiKey) {
        throw new Error('API key not available');
    }
    
    const endpoint = config.togetherAI.apiEndpoint;
    const model = config.togetherAI.model;
    
    console.log(`Simplifying text with Together AI (${model})`);
    console.log(`System prompt: ${systemPrompt.substring(0, 50)}...`);
    console.log(`Text length: ${text.length} characters`);
    console.log(`API endpoint: ${endpoint}`);
    
    const requestBody = {
        model: model,
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: text
            }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        stream: false
    };
    
    // Function to make the API request with retry logic
    const makeRequest = async (retryCount = 0) => {
        try {
            console.log(`API request attempt ${retryCount + 1}/${maxRetries + 1}`);
            console.log('Request payload:', JSON.stringify(requestBody, null, 2));
            console.log('Using API key:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorData = {};
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    console.error('Error parsing error response:', e);
                    console.log('Raw error response:', errorText);
                }
                
                console.error('API error:', response.status, errorData);
                
                // Check for specific error types
                if (response.status === 401) {
                    // Invalid API key
                    clearAPIKeyCache(); // Clear the cache to force a refresh
                    throw new Error('Invalid API key. Please check your API key in the options page.');
                } else if (response.status === 429) {
                    // Rate limit exceeded
                    if (retryCount < maxRetries) {
                        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                        console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return makeRequest(retryCount + 1);
                    }
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else if (response.status >= 500) {
                    // Server error
                    if (retryCount < maxRetries) {
                        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                        console.log(`Server error. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return makeRequest(retryCount + 1);
                    }
                    throw new Error('Server error. Please try again later.');
                }
                
                throw new Error(`API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`);
            }
            
            const data = await response.json();
            console.log('API response received', data);
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from API');
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            if (retryCount < maxRetries && !error.message.includes('Invalid API key')) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                console.log(`Error: ${error.message}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return makeRequest(retryCount + 1);
            }
            throw error;
        }
    };
    
    return makeRequest();
}

// Export functions for use in other scripts
window.togetherAI = {
    getAPIKey,
    clearAPIKeyCache,
    simplifyText
};
