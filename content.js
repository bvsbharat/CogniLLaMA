let promptSession = null;
let systemPrompt = null; // Store systemPrompt globally
let simplifiedElements = []; // Track simplified elements
let hoverEnabled = false; // Track hover state
let fontEnabled = false; // Track font state
let initialized = false; // Track initialization state

// Theme definitions
const themes = {
    default: {
        backgroundColor: '',
        textColor: '',
    },
    highContrast: {
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
    },
    highContrastAlt: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
    },
    darkMode: {
        backgroundColor: '#121212',
        textColor: '#E0E0E0',
    },
    sepia: {
        backgroundColor: '#F5E9D5',
        textColor: '#5B4636',
    },
    lowBlueLight: {
        backgroundColor: '#FFF8E1',
        textColor: '#2E2E2E',
    },
    softPastelBlue: {
        backgroundColor: '#E3F2FD',
        textColor: '#0D47A1',
    },
    softPastelGreen: {
        backgroundColor: '#F1FFF0',
        textColor: '#00695C',
    },
    creamPaper: {
        backgroundColor: '#FFFFF0',
        textColor: '#333333',
    },
    grayScale: {
        backgroundColor: '#F5F5F5',
        textColor: '#424242',
    },
    blueLightFilter: {
        backgroundColor: '#FFF3E0',
        textColor: '#4E342E',
    },
    highContrastYellowBlack: {
        backgroundColor: '#000000',
        textColor: '#FFFF00',
    },
    highContrastBlackYellow: {
        backgroundColor: '#FFFF00',
        textColor: '#000000',
    },
};

// Initialize the AI capabilities
async function ensureInitialized() {
    if (!initialized) {
        console.log('Initializing...');
        
        // Load system prompts
        const systemPrompts = await loadSystemPrompts();
        if (systemPrompts) {
            console.log('System prompts loaded successfully');
            
            // Get current settings
            const settings = await new Promise((resolve) => {
                chrome.storage.sync.get(['simplificationLevel', 'optimizeFor', 'selectedLanguage', 'customPromptText'], (result) => {
                    resolve({
                        level: result.simplificationLevel || '3',
                        optimizeFor: result.optimizeFor || 'textClarity',
                        language: result.selectedLanguage || 'original',
                        customPromptText: result.customPromptText || ''
                    });
                });
            });
            
            // Set system prompt based on settings
            if (settings.optimizeFor === 'customPrompt' && settings.customPromptText) {
                // Use custom prompt if selected and available
                systemPrompt = `You are a helpful assistant transforming text according to these instructions: ${settings.customPromptText}. Keep all proper names, places, and quotes unchanged.`;
                console.log('Using custom prompt:', systemPrompt);
                console.log('Custom prompt text:', settings.customPromptText);
            } else {
                // Use predefined system prompt
                systemPrompt = systemPrompts[settings.optimizeFor][settings.level];
                console.log('System prompt set:', systemPrompt ? 'Success' : 'Failed');
            }
        }
        
        initialized = true;
        console.log('Initialization complete');
    }
    return initialized;
}

// Function to simplify text using Together AI
async function simplifyTextWithTogetherAI(textItems, systemPrompt, selectedLanguage) {
    console.log('=== STARTING API CALL ===');
    console.log('Simplifying text with Together AI...');
    console.log('Number of text items:', textItems.length);
    console.log('System prompt:', systemPrompt.substring(0, 50) + '...');
    
    try {
        // Get API key directly from config
        const apiKey = config.togetherAI.defaultApiKey;
        const endpoint = config.togetherAI.apiEndpoint;
        const model = config.togetherAI.model;
        
        console.log('Using API key from config:', apiKey ? 'Key found' : 'No key found');
        console.log('API endpoint:', endpoint);
        console.log('Model:', model);
        
        // Define language names for better prompting
        const languageNames = {
            'en': 'English',
            'es': 'Spanish (Español)',
            'fr': 'French (Français)',
            'de': 'German (Deutsch)',
            'it': 'Italian (Italiano)',
            'pt': 'Portuguese (Português)',
            'ru': 'Russian (Русский)',
            'zh': 'Chinese (中文)',
            'ja': 'Japanese (日本語)',
            'hi': 'Hindi (हिन्दी)'
        };
        
        // Create a JSON structure with IDs and text content
        const textItemsJson = textItems.map((item, index) => {
            return {
                id: `text_${index}`,
                content: item.text
            };
        });
        
        // Completely different approach for translation vs. simplification
        let enhancedSystemPrompt;
        let userMessage;
        
        if (selectedLanguage !== 'original') {
            // For translation, make a completely separate prompt focused on translation
            const targetLanguageName = languageNames[selectedLanguage] || selectedLanguage;
            
            enhancedSystemPrompt = `You are a professional translator specializing in ${targetLanguageName}. 
Your task is to translate text from any language to ${targetLanguageName} while also simplifying it.

CRITICAL INSTRUCTIONS:
1. YOU MUST TRANSLATE ALL TEXT INTO ${targetLanguageName.toUpperCase()}
2. The output MUST be in ${targetLanguageName} only
3. Simplify the text to make it easier to understand
4. Maintain the same key points and facts as the original
5. Use simpler words and shorter sentences in ${targetLanguageName}

OUTPUT FORMAT REQUIREMENTS:
I will provide you with a JSON array of text items, each with an "id" and "content". 
You must respond with a JSON array where each item has:
1. The original "id"
2. A "simplified" field containing the TRANSLATED and simplified version in ${targetLanguageName}

Format requirements:
- Return ONLY valid JSON without any explanations or comments
- TRANSLATE all content into ${targetLanguageName}
- DO NOT keep any text in the original language
- Use simpler words and shorter sentences in ${targetLanguageName}
- DO NOT include any markdown or HTML formatting

Example input:
[
  {
    "id": "text_0",
    "content": "The intricate mechanisms underlying cognitive processes in the human brain remain an enigma to contemporary neuroscience."
  }
]

Example output:
[
  {
    "id": "text_0",
    "simplified": "${getTranslatedExample(selectedLanguage)}"
  }
]`;

            userMessage = `TRANSLATE THE FOLLOWING TEXT INTO ${targetLanguageName.toUpperCase()} AND SIMPLIFY IT.
YOUR RESPONSE MUST BE IN ${targetLanguageName.toUpperCase()} ONLY.
RETURN ONLY JSON FORMAT WITH NO EXPLANATIONS.

${JSON.stringify(textItemsJson, null, 2)}`;
            
            console.log(`Using translation-focused prompt for ${targetLanguageName}`);
        } else {
            // For simplification only (no translation), use the original approach
            enhancedSystemPrompt = `${systemPrompt}

OUTPUT FORMAT REQUIREMENTS:
I will provide you with a JSON array of text items, each with an "id" and "content". You must respond with a JSON array where each item has:
1. The original "id"
2. A "simplified" field containing the simplified version of the content

Format requirements:
- Return ONLY valid JSON without any explanations or comments
- Maintain the same key points and facts as the original
- Use simpler words and shorter sentences
- DO NOT completely rewrite the content
- DO NOT add any new information
- DO NOT include any markdown or HTML formatting

Example input:
[
  {
    "id": "text_0",
    "content": "The intricate mechanisms underlying cognitive processes in the human brain remain an enigma to contemporary neuroscience."
  }
]

Example output:
[
  {
    "id": "text_0",
    "simplified": "How the brain thinks is still a mystery to modern brain science."
  }
]`;

            userMessage = `Simplify these text items (preserve the JSON format in your response):\n${JSON.stringify(textItemsJson, null, 2)}`;
        }
        
        // Prepare the request payload
        const payload = {
            model: model,
            messages: [
                {
                    role: "system",
                    content: enhancedSystemPrompt
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            temperature: 0.3,
            max_tokens: 4000,
            stream: false
        };
        
        console.log('Preparing to send request to Together AI API...');
        console.log('Request payload structure:', JSON.stringify(payload).substring(0, 200) + '...');
        console.log('User message:', userMessage.substring(0, 100) + '...');
        
        // Debug: Log the full system prompt and user message
        console.log('FULL SYSTEM PROMPT:');
        console.log(enhancedSystemPrompt);
        console.log('FULL USER MESSAGE:');
        console.log(userMessage);
        
        // Make the API request
        console.log('Sending fetch request to API...');
        console.log('Selected language for API request:', selectedLanguage);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('Received response from API, status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response text:', errorText);
            
            let errorData = {};
            try {
                errorData = JSON.parse(errorText);
                console.error('Parsed error data:', errorData);
            } catch (e) {
                console.error('Error parsing error response:', e);
                console.log('Raw error response:', errorText);
            }
            throw new Error(`Together AI API error: ${response.status} ${errorData.error || response.statusText}`);
        }
        
        // Handle non-streaming response
        console.log('Parsing JSON response...');
        const data = await response.json();
        console.log('Received response from Together AI API:', data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const rawResponse = data.choices[0].message.content;
            console.log('Raw response from API:', rawResponse.substring(0, 500) + '...');
            
            // Parse the JSON response
            try {
                // Find JSON in the response (in case there's any extra text)
                const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
                const jsonString = jsonMatch ? jsonMatch[0] : rawResponse;
                
                const simplifiedItems = JSON.parse(jsonString);
                console.log('Parsed simplified items:', simplifiedItems);
                
                // Create a map of id to simplified text
                const simplificationMap = {};
                simplifiedItems.forEach(item => {
                    simplificationMap[item.id] = item.simplified;
                });
                
                console.log('=== API CALL COMPLETED SUCCESSFULLY ===');
                return simplificationMap;
            } catch (error) {
                console.error('Error parsing JSON response:', error);
                console.log('Raw response that failed to parse:', rawResponse);
                throw new Error('Failed to parse JSON response from API');
            }
        } else {
            console.error('Invalid response format from API:', data);
            throw new Error('Invalid response format from Together AI API');
        }
    } catch (error) {
        console.error('=== API CALL FAILED ===');
        console.error('Error simplifying text with Together AI:', error);
        throw error;
    }
}

// Function to get a translated example for the output format
function getTranslatedExample(language) {
    const examples = {
        'en': 'How the brain thinks is still a mystery to modern brain science.',
        'es': 'Cómo piensa el cerebro sigue siendo un misterio para la neurociencia moderna.',
        'fr': 'Comment le cerveau pense reste un mystère pour la neuroscience moderne.',
        'de': 'Wie das Gehirn denkt, ist für die moderne Neurowissenschaft immer noch ein Rätsel.',
        'it': 'Come funziona il pensiero nel cervello è ancora un mistero per la neuroscienza moderna.',
        'pt': 'Como o cérebro pensa ainda é um mistério para a neurociência moderna.',
        'ru': 'Как работает мышление в мозге до сих пор остается загадкой для современной нейронауки.',
        'zh': '大脑如何思考对现代神经科学来说仍然是个谜。',
        'ja': '脳がどのように考えるかは、現代の脳科学にとってまだ謎です。',
        'hi': 'दिमाग कैसे सोचता है यह आधुनिक न्यूरोसाइंस के लिए अभी भी एक रहस्य है।'
    };
    
    return examples[language] || examples['en'];
}

// Function to clean up AI response by removing introductory text
function cleanupAIResponse(htmlResponse) {
    // Remove common introductory phrases
    const cleanedResponse = htmlResponse
        // Remove phrases like "Here's a simplified version of the text:"
        .replace(/^(Here['']s|This is|I['']ve created|I have provided|Below is|The following is).*?(simplified|rewritten|improved|clearer|easier to read|more accessible).*?(version|text|content|html).*?[:\.]/i, '')
        // Remove any other common introductions
        .replace(/^(Here you go|As requested|As per your request|Based on your request).*?[:\.]/i, '')
        // Remove any markdown-style quotes at the beginning
        .replace(/^>+\s*/gm, '')
        // Remove any leading whitespace and newlines
        .trim();
    
    // If the response doesn't start with an HTML tag, try to find where the HTML begins
    if (!cleanedResponse.trim().startsWith('<')) {
        const htmlStartIndex = cleanedResponse.indexOf('<');
        if (htmlStartIndex > 0) {
            return cleanedResponse.substring(htmlStartIndex);
        }
    }
    
    return cleanedResponse;
}

// Function to get API key
async function getAPIKey() {
    try {
        const apiKey = await window.togetherAI.getAPIKey();
        console.log('API key retrieved:', apiKey ? 'Success' : 'Failed');
        return apiKey;
    } catch (error) {
        console.error('Error getting API key:', error);
        return null;
    }
}

// Load system prompts from background script
async function loadSystemPrompts() {
    console.log('Attempting to load system prompts from background script');
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getSystemPrompts' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message to background script:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log('Received response from background script:', response);
                if (response && response.success) {
                    console.log('Successfully loaded system prompts:', response.prompts);
                    resolve(response.prompts);
                } else {
                    console.error('Error loading system prompts:', response.error);
                    reject(new Error(response.error));
                }
            }
        });
    });
}

// Function to test the API directly
async function testAPI() {
    console.log('Running direct API test...');
    
    try {
        const testText = "This is a test paragraph to verify that the Together AI API is working correctly. The quantum mechanical model is a model that explains the movement of electrons in atoms and molecules. It is based on quantum mechanics, which is a branch of physics that deals with the behavior of matter and light on the atomic and subatomic scale.";
        
        const testSystemPrompt = "You are a helpful assistant that simplifies complex text to make it easier to understand.";
        
        console.log('Test text:', testText);
        console.log('Test system prompt:', testSystemPrompt);
        
        const simplifiedText = await simplifyTextWithTogetherAI([{text: testText}], testSystemPrompt);
        
        console.log('API test successful!');
        console.log('Simplified text:', simplifiedText);
        
        // Show a success notification
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.textContent = 'API Test Successful!';
        
        document.body.appendChild(notification);
        
        // Remove the notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
        
        return true;
    } catch (error) {
        console.error('API test failed:', error);
        
        // Show an error notification
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#F44336';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.textContent = `API Test Failed: ${error.message}`;
        
        document.body.appendChild(notification);
        
        // Remove the notification after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => notification.remove(), 500);
        }, 5000);
        
        return false;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in content script:', request);
    
    // Handle message asynchronously but keep connection open
    (async () => {
        console.log("Received action:", request.action);
        try {
            switch (request.action) {
                case "simplify":
                    console.log("Starting simplification process...");
                    try {
                        // Reset any previous state
                        simplifiedElements = [];
                        
                        // Clear any previous simplifications first
                        const allSimplifiedElements = document.querySelectorAll('[data-original-text]');
                        console.log(`Found ${allSimplifiedElements.length} previously simplified elements to clear`);
                        
                        allSimplifiedElements.forEach(el => {
                            if (el.hasAttribute('data-original-text')) {
                                const originalText = el.getAttribute('data-original-text');
                                el.textContent = originalText;
                                console.log('Restored element to original text');
                            }
                        });
                        
                        console.log("Cleared previous simplifications");
                        
                        await ensureInitialized();
                        
                        // Re-fetch system prompts to ensure we have the latest
                        const systemPrompts = await loadSystemPrompts();
                        if (systemPrompts) {
                            // Get current settings
                            const settings = await new Promise((resolve) => {
                                chrome.storage.sync.get(['simplificationLevel', 'optimizeFor', 'selectedLanguage', 'customPromptText'], (result) => {
                                    resolve({
                                        level: result.simplificationLevel || '3',
                                        optimizeFor: result.optimizeFor || 'textClarity',
                                        language: result.selectedLanguage || 'original',
                                        customPromptText: result.customPromptText || ''
                                    });
                                });
                            });
                            
                            console.log("Current settings:", settings);
                            console.log("Selected language:", settings.language);
                            
                            // Update system prompt based on current settings
                            if (settings.optimizeFor === 'customPrompt' && settings.customPromptText) {
                                // Use custom prompt if selected and available
                                systemPrompt = `You are a helpful assistant transforming text according to these instructions: ${settings.customPromptText}. Keep all proper names, places, and quotes unchanged.`;
                                console.log('Using custom prompt:', systemPrompt);
                                console.log('Custom prompt text:', settings.customPromptText);
                            } else {
                                // Use predefined system prompt
                                systemPrompt = systemPrompts[settings.optimizeFor][settings.level];
                                console.log("Updated system prompt:", systemPrompt ? "Success" : "Failed");
                            }
                        }
                        
                        // Check if API key is set - use directly from config
                        const apiKey = config.togetherAI.defaultApiKey;
                        console.log("Using API key from config:", apiKey ? "Key found" : "No key found");
                        
                        if (!apiKey) {
                            console.error('Together AI API key not set - cannot simplify text');
                            sendResponse({success: false, error: 'API key not set. Please set your Together AI API key in the options page.'});
                            return;
                        }

                        console.log('Finding main content element...');
                        
                        // Find the main content element
                        const mainContent = document.body;
                        
                        // Helper function to check if element is a header
                        const isHeader = (element) => {
                            return element.tagName.match(/^H[1-6]$/i);
                        };

                        // Helper function to estimate token count (rough approximation)
                        const estimateTokens = (text) => {
                            return text.split(/\s+/).length * 1.3; // Multiply by 1.3 as a safety factor
                        };
                        
                        // Helper function to get the path to an element
                        const getElementPath = (element) => {
                            const path = [];
                            let currentElement = element;
                            
                            while (currentElement && currentElement !== document.body) {
                                let selector = currentElement.tagName.toLowerCase();
                                
                                if (currentElement.id) {
                                    selector += `#${currentElement.id}`;
                                } else if (currentElement.className) {
                                    selector += `.${Array.from(currentElement.classList).join('.')}`;
                                }
                                
                                path.unshift(selector);
                                currentElement = currentElement.parentElement;
                            }
                            
                            return path.join(' > ');
                        };

                        // Find the main content container
                        let mainContentContainer = null;
                        
                        // Try common content container selectors
                        const contentContainerSelectors = [
                            'article',
                            'main',
                            '.article',
                            '.post',
                            '.content',
                            '.main-content',
                            '.article-content',
                            '.post-content',
                            '#content',
                            '#main-content'
                        ];
                        
                        for (const selector of contentContainerSelectors) {
                            const container = document.querySelector(selector);
                            if (container && container.textContent.trim().length > 500) {
                                mainContentContainer = container;
                                console.log(`Found main content container using selector: ${selector}`);
                                console.log(`Container path: ${getElementPath(container)}`);
                                break;
                            }
                        }
                        
                        // If no container found, use the body as fallback
                        if (!mainContentContainer) {
                            console.log('No specific content container found, using document body');
                            mainContentContainer = document.body;
                        }
                        
                        // Clone the container to work with
                        const containerClone = mainContentContainer.cloneNode(true);
                        
                        // Process each chunk
                        try {
                            // Find all text-containing elements
                            const textElements = [];
                            const findTextElements = (node) => {
                                // Skip non-element nodes
                                if (node.nodeType !== Node.ELEMENT_NODE) return;
                                
                                // Skip script, style, and other non-content elements
                                const tagName = node.tagName.toLowerCase();
                                if (['script', 'style', 'noscript', 'svg', 'img', 'video', 'audio', 'iframe', 'canvas', 'code', 'pre'].includes(tagName)) {
                                    return;
                                }
                                
                                // Check if this element has direct text content
                                let hasText = false;
                                let textContent = '';
                                
                                for (const child of node.childNodes) {
                                    if (child.nodeType === Node.TEXT_NODE) {
                                        const text = child.textContent.trim();
                                        if (text.length > 30) {  // Only consider substantial text
                                            hasText = true;
                                            textContent += text + ' ';
                                        }
                                    }
                                }
                                
                                // If this element has substantial text, add it to our list
                                if (hasText) {
                                    textElements.push({
                                        element: node,
                                        text: textContent.trim()
                                    });
                                }
                                
                                // Continue searching in child elements
                                for (const child of node.childNodes) {
                                    if (child.nodeType === Node.ELEMENT_NODE) {
                                        findTextElements(child);
                                    }
                                }
                            };
                            
                            // Start search from the main content container
                            findTextElements(mainContentContainer);
                            
                            console.log(`Found ${textElements.length} text elements to process`);
                            
                            // Collect all text nodes that need simplification
                            const allTextNodes = [];
                            
                            // Process each text element to find text nodes
                            for (let i = 0; i < textElements.length; i++) {
                                const element = textElements[i].element;
                                
                                // Skip if already processed
                                if (element.hasAttribute('data-simplified')) {
                                    console.log(`Element ${i+1} already simplified, skipping`);
                                    continue;
                                }
                                
                                // Find all text nodes in this element
                                for (const child of element.childNodes) {
                                    if (child.nodeType === Node.TEXT_NODE) {
                                        const text = child.textContent.trim();
                                        if (text.length > 30) {  // Only consider substantial text
                                            allTextNodes.push({
                                                node: child,
                                                element: element,
                                                text: text,
                                                elementIndex: i
                                            });
                                        }
                                    }
                                }
                            }
                            
                            console.log(`Found ${allTextNodes.length} text nodes to simplify`);
                            
                            // Process text nodes in batches to reduce API calls
                            const BATCH_SIZE = 10; // Adjust based on your rate limits
                            for (let i = 0; i < allTextNodes.length; i += BATCH_SIZE) {
                                const batch = allTextNodes.slice(i, i + BATCH_SIZE);
                                console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}, size: ${batch.length}`);
                                
                                try {
                                    // Get current language setting before making API call
                                    const currentLanguage = await new Promise((resolve) => {
                                        chrome.storage.sync.get(['selectedLanguage'], (result) => {
                                            resolve(result.selectedLanguage || 'original');
                                        });
                                    });
                                    console.log(`Using language for batch ${Math.floor(i/BATCH_SIZE) + 1}: ${currentLanguage}`);
                                    
                                    // Simplify this batch of text nodes
                                    const simplifiedBatch = await simplifyTextWithTogetherAI(batch, systemPrompt, currentLanguage);
                                    
                                    console.log(`Received simplified batch with ${Object.keys(simplifiedBatch).length} items`);
                                    
                                    // Apply the simplified text to each node
                                    batch.forEach((nodeInfo, index) => {
                                        const nodeId = `text_${index}`;
                                        const simplifiedText = simplifiedBatch[nodeId];
                                        
                                        if (simplifiedText) {
                                            // Save original for restoration
                                            if (!nodeInfo.node._originalText) {
                                                nodeInfo.node._originalText = nodeInfo.node.textContent;
                                            }
                                            
                                            // Replace with simplified text
                                            nodeInfo.node.textContent = simplifiedText;
                                            
                                            // Mark element as processed
                                            nodeInfo.element.setAttribute('data-simplified', 'true');
                                            
                                            // Track the simplified node
                                            simplifiedElements.push({
                                                node: nodeInfo.node,
                                                element: nodeInfo.element,
                                                original: nodeInfo.node._originalText,
                                                simplified: simplifiedText
                                            });
                                            
                                            console.log(`Replaced text node ${index} in batch`);
                                        } else {
                                            console.warn(`No simplified text found for node ${nodeId}`);
                                        }
                                    });
                                } catch (error) {
                                    console.error(`Error processing batch:`, error);
                                }
                            }
                            
                            console.log(`Simplified ${simplifiedElements.length} text nodes in total`);
                            
                            // Show a notification
                            const notification = document.createElement('div');
                            notification.style.position = 'fixed';
                            notification.style.top = '20px';
                            notification.style.left = '50%';
                            notification.style.transform = 'translateX(-50%)';
                            notification.style.backgroundColor = '#4CAF50';
                            notification.style.color = 'white';
                            notification.style.padding = '10px 20px';
                            notification.style.borderRadius = '5px';
                            notification.style.zIndex = '9999';
                            notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                            notification.textContent = `Simplified ${simplifiedElements.length} text elements`;
                            
                            document.body.appendChild(notification);
                            
                            // Remove the notification after 3 seconds
                            setTimeout(() => {
                                notification.style.opacity = '0';
                                notification.style.transition = 'opacity 0.5s';
                                setTimeout(() => notification.remove(), 500);
                            }, 3000);
                            
                            sendResponse({success: true});
                        } catch (error) {
                            console.error('Error processing chunks:', error);
                            sendResponse({success: false, error: error.message});
                        }
                    } catch (error) {
                        console.error('Error simplifying content:', error);
                        sendResponse({success: false, error: error.message});
                    }
                    break;
                
                case "toggleFont":
                    console.log("Toggling OpenDyslexic font...");
                    fontEnabled = request.enabled;
                    toggleOpenDyslexicFont(fontEnabled);
                    sendResponse({success: true});
                    break;
                
                case "applyTheme":
                    console.log("Applying theme:", request.theme);
                    applyTheme(request.theme);
                    sendResponse({success: true});
                    break;
                
                case "getFontState":
                    sendResponse({fontEnabled: fontEnabled});
                    break;
                
                case "adjustSpacing":
                    const {lineSpacing, letterSpacing, wordSpacing} = request;
                    applySpacingAdjustments(lineSpacing, letterSpacing, wordSpacing);
                    sendResponse({success: true});
                    break;
                
                case "toggleHover":
                    console.log("Toggling hover to show original text...");
                    hoverEnabled = request.enabled;
                    if (hoverEnabled) {
                        enableHoverFeature();
                    } else {
                        disableHoverFeature();
                    }
                    sendResponse({success: true});
                    break;
                
                case "getHoverState":
                    sendResponse({hoverEnabled: hoverEnabled});
                    break;
                
                case "updateConfig":
                    // Handle configuration updates
                    console.log("Updating configuration:", request.config);
                    
                    // Store the selected language
                    if (request.config.selectedLanguage) {
                        console.log("Updating selected language to:", request.config.selectedLanguage);
                        chrome.storage.sync.set({ selectedLanguage: request.config.selectedLanguage });
                    }
                    
                    // Store the custom prompt text if provided
                    if (request.config.customPromptText !== undefined) {
                        console.log("Updating custom prompt text:", request.config.customPromptText);
                        chrome.storage.sync.set({ customPromptText: request.config.customPromptText });
                    }
                    
                    // Re-simplify content with new configuration if requested
                    if (request.isSimplificationChange) {
                        console.log("Configuration changed, will re-simplify content on next request");
                        // Reset initialization flag to force reload of system prompts
                        initialized = false;
                    }
                    sendResponse({success: true});
                    break;
                
                case "restoreOriginalContent":
                    console.log("Restoring original content...");
                    const restored = restoreOriginalContent();
                    sendResponse({success: restored});
                    break;
                
                default:
                    console.log("Unknown action:", request.action);
                    sendResponse({success: false, error: 'Unknown action'});
            }
        } catch (error) {
            console.error("Error in message handler:", error);
            sendResponse({success: false, error: error.message});
        }
    })();
    return true; // Keep the message channel open for async response
});

// Function to toggle OpenDyslexic font
function toggleOpenDyslexicFont(enabled) {
    console.log(`${enabled ? 'Applying' : 'Removing'} OpenDyslexic font...`);
    
    if (enabled) {
        // Add font-face definition if it doesn't exist
        if (!document.getElementById('opendyslexic-font-face')) {
            const fontFaceStyle = document.createElement('style');
            fontFaceStyle.id = 'opendyslexic-font-face';
            fontFaceStyle.textContent = `
                @font-face {
                    font-family: 'OpenDyslexic';
                    src: url('${chrome.runtime.getURL('fonts/OpenDyslexic-Regular.otf')}') format('opentype');
                    font-weight: normal;
                    font-style: normal;
                    font-display: swap;
                }
            `;
            document.head.appendChild(fontFaceStyle);
        }

        // Create or update style element to apply font to entire page
        let fontStyle = document.getElementById('opendyslexic-font-style');
        if (!fontStyle) {
            fontStyle = document.createElement('style');
            fontStyle.id = 'opendyslexic-font-style';
            document.head.appendChild(fontStyle);
        }

        fontStyle.textContent = `
            body, body * {
                font-family: 'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
                line-height: 1.5;
                letter-spacing: 0.5px;
                word-spacing: 3px;
            }
        `;
    } else {
        // Remove the font style applied to the entire page
        const fontStyle = document.getElementById('opendyslexic-font-style');
        if (fontStyle) {
            fontStyle.parentNode.removeChild(fontStyle);
        }

        // Optionally remove the font-face definition
        const fontFaceStyle = document.getElementById('opendyslexic-font-face');
        if (fontFaceStyle) {
            fontFaceStyle.parentNode.removeChild(fontFaceStyle);
        }
    }
}

function enableHoverFeature() {
    console.log("Enabling hover feature...");
    simplifiedElements = document.querySelectorAll('.simplified-text');
    simplifiedElements.forEach(el => {
        el.addEventListener('mouseenter', showOriginalText);
        el.addEventListener('mouseleave', hideOriginalText);
    });
}

function disableHoverFeature() {
    console.log("Disabling hover feature...");
    simplifiedElements.forEach(el => {
        el.removeEventListener('mouseenter', showOriginalText);
        el.removeEventListener('mouseleave', hideOriginalText);
    });
}

function showOriginalText(event) {
    const originalText = event.currentTarget.getAttribute('data-original-text');
    if (!originalText) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'original-text-tooltip';
    tooltip.textContent = originalText;
    document.body.appendChild(tooltip);

    const rect = event.currentTarget.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 10}px`;

    event.currentTarget._originalTextTooltip = tooltip;
}

function hideOriginalText(event) {
    const tooltip = event.currentTarget._originalTextTooltip;
    if (tooltip) {
        tooltip.remove();
        event.currentTarget._originalTextTooltip = null;
    }
}

// Function to apply spacing adjustments
function applySpacingAdjustments(lineSpacing, letterSpacing, wordSpacing) {
    const existingStyle = document.getElementById('spacing-adjustments-style');
    if (existingStyle) {
        existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'spacing-adjustments-style';
    style.textContent = `
        body, body * {
            line-height: ${lineSpacing} !important;
            letter-spacing: ${letterSpacing}px !important;
            word-spacing: ${wordSpacing}px !important;
        }
    `;
    document.head.appendChild(style);
}

// Function to apply selected theme
function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    const { backgroundColor, textColor } = theme;

    let themeStyle = document.getElementById('theme-style');
    if (!themeStyle) {
        themeStyle = document.createElement('style');
        themeStyle.id = 'theme-style';
        document.head.appendChild(themeStyle);
    }

    themeStyle.textContent = `
        html, body {
            background-color: ${backgroundColor} !important;
            color: ${textColor} !important;
        }
        body * {
            background-color: ${backgroundColor} !important;
            color: ${textColor} !important;
        }
    `;
}

// Function to restore original content
function restoreOriginalContent() {
    if (simplifiedElements.length === 0) {
        console.log('No simplified content to restore');
        return false;
    }
    
    console.log(`Restoring ${simplifiedElements.length} simplified elements to original content`);
    
    // Restore each simplified node directly
    simplifiedElements.forEach(item => {
        if (item.node && item.original) {
            // Restore the text node to its original content
            item.node.textContent = item.original;
            console.log('Restored text node to original content');
        }
    });
    
    // Clear the simplified elements array
    window.simplifiedElements = [];
    
    // Show a notification
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#FF9800';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.textContent = 'Restored original content';
    
    document.body.appendChild(notification);
    
    // Remove the notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
    
    return true;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ensureInitialized();
    
    // Apply saved theme
    chrome.storage.sync.get(['selectedTheme'], function(result) {
        const selectedTheme = result.selectedTheme || 'default';
        applyTheme(selectedTheme);
    });
    
    // Load and apply initial spacing settings
    chrome.storage.sync.get(['lineSpacing', 'letterSpacing', 'wordSpacing'], function(result) {
        applySpacingAdjustments(
            result.lineSpacing || 1.5,
            result.letterSpacing || 0,
            result.wordSpacing || 0
        );
    });
});
