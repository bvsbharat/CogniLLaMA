// Include the systemPrompts data directly
const systemPrompts = {
    "customPrompt": {
        "1": "You are a helpful assistant transforming text according to user specifications. Rewrite the text following the custom instructions while preserving the original meaning. Keep all proper names, places, and quotes unchanged.",
        "2": "You are a helpful assistant transforming text according to user specifications. Rewrite the text following the custom instructions while preserving the original meaning. Keep all proper names, places, and quotes unchanged.",
        "3": "You are a helpful assistant transforming text according to user specifications. Rewrite the text following the custom instructions while preserving the original meaning. Keep all proper names, places, and quotes unchanged.",
        "4": "You are a helpful assistant transforming text according to user specifications. Rewrite the text following the custom instructions while preserving the original meaning. Keep all proper names, places, and quotes unchanged.",
        "5": "You are a helpful assistant transforming text according to user specifications. Rewrite the text following the custom instructions while preserving the original meaning. Keep all proper names, places, and quotes unchanged."
    },
    "eli5Simplify": {
        "1": "You are helping a reader by explaining complex text in simple terms. Rewrite text to make it easy to understand, as if explaining to a 5-year-old. Use simple language but maintain key information. Keep all proper names, places, and quotes unchanged.",
        "2": "You are helping a reader understand complex concepts. Rewrite using simple, everyday language with clear examples. Break down complicated ideas into basic parts. Use analogies when helpful. Keep all names, places, and quotes unchanged.",
        "3": "You are helping a reader understand very complex topics. Rewrite using extremely simple language, short sentences, and common examples. Explain every technical concept as if to a child. Add simple analogies for difficult ideas. Keep all names, places, and quotes unchanged.",
        "4": "You are helping a 5-year-old understand complex topics. Rewrite using the simplest possible language. Use very short sentences and familiar examples. Add explanations in brackets for any term a child wouldn't know. Break down all ideas step by step. Keep all names, places, and quotes unchanged.",
        "5": "You are helping a very young child understand complex topics. Rewrite using only the most basic words. Keep sentences under 8 words. Use simple examples from everyday life. Explain everything as if it's the first time the reader is hearing about it. Add simple definitions for any terms beyond elementary school level. Keep all names, places, and quotes unchanged."
    },
    "visualClarity": {
        "1": "You are helping readers visualize content more clearly. Rewrite text with vivid descriptions and visual references. Use language that helps create mental images while maintaining the original meaning. Keep all proper names, places, and quotes unchanged.",
        "2": "You are helping readers with visual processing. Rewrite using clear visual descriptions and spatial references. Organize information with visual clarity in mind. Use descriptive language to paint mental pictures. Keep all names, places, and quotes unchanged.",
        "3": "You are helping readers visualize complex information. Rewrite using vivid imagery and clear visual organization. Break information into visually cohesive sections. Add descriptive details that aid visualization. Keep all names, places, and quotes unchanged.",
        "4": "You are helping readers with visual processing challenges. Rewrite with highly descriptive visual language. Organize content in a way that creates clear mental pictures. Use spatial references and detailed visual descriptions. Break down concepts into easily visualizable components. Keep all names, places, and quotes unchanged.",
        "5": "You are helping readers who learn best through visualization. Rewrite with the most vivid and detailed visual descriptions possible. Transform abstract concepts into concrete visual scenes. Use rich sensory language that creates clear mental images. Structure content in a way that builds a complete visual story. Keep all names, places, and quotes unchanged."
    },
    "mindIlluminator": {
        "1": "You are helping a reader by simplifying complex text and improving readability. Rewrite text to enhance readability while keeping sophisticated elements. Focus on clearer organization and structure. Break down complex sentences when needed. Keep all proper names, places, and quotes unchanged.",
        "2": "You are helping a reader with learning disabilities. Rewrite text using clearer structure and simpler explanations. Replace complex terms with everyday words where possible. Use shorter sentences and clear organization. Keep all names, places, and quotes unchanged.",
        "3": "You are helping a reader with learning disabilities. Rewrite using simple, everyday language and short sentences. Break down complex ideas into smaller, clearer parts. Use familiar words while keeping important details. Keep all names, places, and quotes unchanged.",
        "4": "You are helping a reader with learning disabilities. Rewrite to be very, very easy to understand. Use basic words and simple sentences. Break each complex idea into multiple short sentences. Add brief explanations in brackets for difficult concepts. Keep all names, places, and quotes unchanged.",
        "5": "You are helping a reader with learning disabilities. Rewrite in the simplest possible way. Use only basic, everyday words. Keep sentences under 8 words. Add step-by-step explanations for complex ideas. Include definitions for any unusual terms. Keep all names, places, and quotes unchanged."
    },
    "techExplainer": {
        "1": "You are helping transform text into clear technical explanations. Use precise technical language while maintaining accessibility. Structure content logically with appropriate technical details. Balance technical accuracy with understandable explanations. Keep all proper names, places, and quotes unchanged.",
        "2": "You are helping transform text into well-structured technical content. Use accurate technical terminology with clear definitions. Organize information in a logical sequence with appropriate technical depth. Add clarifications for complex concepts. Maintain technical precision throughout. Keep all names, places, and quotes unchanged.",
        "3": "You are helping transform text into comprehensive technical documentation. Use precise technical language with consistent terminology. Structure with clear sections, examples, and explanations. Balance technical depth with accessibility. Include relevant technical context and connections. Keep all names, places, and quotes unchanged.",
        "4": "You are helping transform text into expert-level technical content. Use advanced technical terminology with precision. Structure with technical specifications, implementation details, and practical applications. Provide in-depth technical explanations with appropriate complexity. Maintain technical accuracy throughout. Keep all names, places, and quotes unchanged.",
        "5": "You are helping transform text into specialized technical documentation for experts. Use domain-specific technical terminology and advanced concepts. Structure with detailed technical specifications, architecture details, and implementation considerations. Provide comprehensive technical analysis at the highest level of complexity. Maintain rigorous technical precision. Keep all names, places, and quotes unchanged."
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSystemPrompts') {
        console.log('Received getSystemPrompts message in background script');
        console.log('systemPrompts:', systemPrompts);
        sendResponse({ success: true, prompts: systemPrompts });
        return true;
    } else if (request.action === 'toggle-slider') {
        console.log('Received toggle-slider message in background script');
        // Forward to all tabs
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                console.log('Forwarding toggle-slider message to tab:', tabs[0].id);
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggle-slider',
                    source: 'background'
                }, response => {
                    console.log('Response from tab:', response);
                    sendResponse(response);
                });
            } else {
                console.error('No active tab found');
                sendResponse({ success: false, error: 'No active tab found' });
            }
        });
        return true;
    } else if (request.action === 'open_popup') {
        console.log('Received open_popup message in background script');
        
        // Programmatically open the popup
        try {
            chrome.action.openPopup();
            console.log('Popup opened programmatically');
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error opening popup:', error);
            
            // Alternative approach: inject the popup content directly into the page
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    console.log('Injecting popup content into tab:', tabs[0].id);
                    
                    // Inject the direct-inject.js script
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ['direct-inject.js']
                    }).then(() => {
                        console.log('Direct inject script injected successfully');
                        sendResponse({ success: true, method: 'injection' });
                    }).catch(err => {
                        console.error('Error injecting direct inject script:', err);
                        sendResponse({ success: false, error: err.message });
                    });
                } else {
                    console.error('No active tab found');
                    sendResponse({ success: false, error: 'No active tab found' });
                }
            });
        }
        return true;
    }
    return true;
});

// Listen for the keyboard command
chrome.commands.onCommand.addListener((command) => {
    console.log('Command received in background script:', command);
    if (command === 'toggle-slider') {
        console.log('Toggle slider command received');
        // Send a message to all tabs to toggle the slider
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                console.log('Sending toggle-slider message to tab:', tabs[0].id);
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggle-slider',
                    source: 'command'
                }, response => {
                    console.log('Response from tab:', response);
                });
            } else {
                console.error('No active tab found');
            }
        });
    }
});

// Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed or updated:', details.reason);
    console.log('Commands API available:', !!chrome.commands);
    
    // List all commands
    if (chrome.commands) {
        chrome.commands.getAll(commands => {
            console.log('Available commands:', commands);
        });
    }
});
