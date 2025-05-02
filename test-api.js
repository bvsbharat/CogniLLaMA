// Test script for Together AI API connection

// Configuration (same as in config.js)
const config = {
    togetherAI: {
        apiEndpoint: "https://api.together.xyz/v1/chat/completions",
        model: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
        defaultApiKey: "f2082dc55d67c63c00e0ecc647e3e5337887254acfa8d4f9a162cbbfb201779f"
    }
};

// Test function to make a direct API call
async function testAPI() {
    console.log('Starting API test...');
    
    const apiKey = config.togetherAI.defaultApiKey;
    const endpoint = config.togetherAI.apiEndpoint;
    const model = config.togetherAI.model;
    
    console.log(`API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Model: ${model}`);
    
    const requestBody = {
        model: model,
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant that simplifies text."
            },
            {
                role: "user",
                content: "Please simplify this text: The quantum mechanical model is a model that explains the movement of electrons in atoms and molecules. It is based on quantum mechanics, which is a branch of physics that deals with the behavior of matter and light on the atomic and subatomic scale."
            }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        stream: false
    };
    
    try {
        console.log('Sending request...');
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        
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
            console.error('Error response:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                console.error('Parsed error:', errorData);
            } catch (e) {
                console.error('Could not parse error response as JSON');
            }
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response:', JSON.stringify(data, null, 2));
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            console.log('Simplified text:', data.choices[0].message.content);
            console.log('Test completed successfully!');
        } else {
            console.error('Invalid response format:', data);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testAPI();
