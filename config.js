// Configuration settings for Cogni-llama extension
const config = {
    // Together AI API configuration
    togetherAI: {
        apiEndpoint: "https://api.together.xyz/v1/chat/completions",
        model: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
        stream: false,
        defaultApiKey: "f2082dc55d67c63c00e0ecc647e3e5337887254acfa8d4f9a162cbbfb201779f" // Default API key
    },
    // Simplification levels configuration
    simplificationLevelsConfig: {
        levels: 3 // Number of simplification levels (Low, Mid, High)
    }
};

// Make simplificationLevelsConfig available globally for backward compatibility
const simplificationLevelsConfig = config.simplificationLevelsConfig;
