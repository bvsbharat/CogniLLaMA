// Configuration settings for Cogni-llama extension
const config = {
    // Together AI API configuration
    togetherAI: {
        apiEndpoint: "https://api.llama.com/v1/chat/completions",
        model: "Llama-4-Maverick-17B-128E-Instruct-FP8",
        stream: false,
        defaultApiKey: "LLM|3030097687151202|IfrN-xJ3UY-ikp8PzpOlEICU7x0"
    },
    // Simplification levels configuration
    simplificationLevelsConfig: {
        levels: 2 // Number of simplification levels (Low, Mid, High)
    }
};

// Make simplificationLevelsConfig available globally for backward compatibility
const simplificationLevelsConfig = config.simplificationLevelsConfig;

// Make config available globally
window.config = config;
