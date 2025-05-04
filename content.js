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
            'ar': 'Arabic (العربية)',
            'hi': 'Hindi (हिन्दी)',
            'id': 'Indonesian (Bahasa Indonesia)',
            'tl': 'Tagalog (Filipino)',
            'th': 'Thai (ไทย)',
            'vi': 'Vietnamese (Tiếng Việt)'
        };
        
        // Create a JSON structure with IDs and text content
        // Check if the element has HTML content that needs to be preserved
        const textItemsJson = textItems.map((item, index) => {
            // Check if this is a paragraph with HTML elements - more comprehensive check
            const hasHtmlElements = item.element && (
                // Check for any HTML tags within the element
                item.element.innerHTML.includes('<') || 
                // Or check for specific common HTML elements
                item.element.getElementsByTagName('a').length > 0 || 
                item.element.getElementsByTagName('strong').length > 0 ||
                item.element.getElementsByTagName('em').length > 0 ||
                item.element.getElementsByTagName('b').length > 0 ||
                item.element.getElementsByTagName('i').length > 0 ||
                item.element.getElementsByTagName('span').length > 0 ||
                item.element.getElementsByTagName('sup').length > 0 ||
                item.element.getElementsByTagName('sub').length > 0 ||
                item.element.getElementsByTagName('cite').length > 0 ||
                item.element.getElementsByTagName('code').length > 0 ||
                item.element.getElementsByTagName('mark').length > 0
            );
            
            return {
                id: `text_${index}`,
                content: item.text,
                hasHtml: hasHtmlElements,
                // If it has HTML elements, include the innerHTML as well
                htmlContent: hasHtmlElements ? item.element.innerHTML : null
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
6. IMPORTANT: For items marked with "hasHtml": true, preserve all HTML tags (like <a>, <strong>, etc.) in your output
7. Only translate the text content, NOT the HTML tags themselves

OUTPUT FORMAT REQUIREMENTS:
I will provide you with a JSON array of text items, each with an "id", "content", and possibly "hasHtml" and "htmlContent" fields. 
You must respond with a JSON array where each item has:
1. The original "id"
2. A "simplified" field containing the TRANSLATED and simplified version in ${targetLanguageName}
3. If the original had "hasHtml": true, your "simplified" field should include the preserved HTML tags

Format requirements:
- Return ONLY valid JSON without any explanations or comments
- TRANSLATE all content into ${targetLanguageName}
- DO NOT keep any text in the original language
- Use simpler words and shorter sentences in ${targetLanguageName}
- PRESERVE all HTML tags when present in the original
- DO NOT add any additional HTML formatting not present in the original

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
PRESERVE ALL HTML TAGS IN ITEMS MARKED WITH "hasHtml": true.

${JSON.stringify(textItemsJson, null, 2)}`;
            
            console.log(`Using translation-focused prompt for ${targetLanguageName}`);
        } else {
            // For simplification only (no translation), use the original approach
            enhancedSystemPrompt = `${systemPrompt}

OUTPUT FORMAT REQUIREMENTS:
I will provide you with a JSON array of text items, each with an "id", "content", and possibly "hasHtml" and "htmlContent" fields.
You must respond with a JSON array where each item has:
1. The original "id"
2. A "simplified" field containing the simplified version of the content

Format requirements:
- Return ONLY valid JSON without any explanations or comments
- Maintain the same key points and facts as the original
- Use simpler words and shorter sentences
- DO NOT completely rewrite the content
- DO NOT add any new information
- For items with "hasHtml": true, preserve all HTML tags (like <a>, <strong>, etc.) in your output
- Only simplify the text content, NOT the HTML tags themselves

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

            userMessage = `Simplify these text items (preserve the JSON format in your response and maintain all HTML tags when present):\n${JSON.stringify(textItemsJson, null, 2)}`;
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
        console.log('Raw API response data:', JSON.stringify(data).substring(0, 200) + '...');
        
        // Add more detailed logging to help debug
        console.log('Response structure:', JSON.stringify({
            hasCompletionMessage: !!data.completion_message,
            contentType: data.completion_message?.content?.type,
            hasText: !!data.completion_message?.content?.text,
            textLength: data.completion_message?.content?.text?.length,
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length
        }));
        
        let rawResponse = null;
        
        // Handle the new Llama API response format
        if (data.completion_message && data.completion_message.content && data.completion_message.content.text) {
            rawResponse = data.completion_message.content.text;
            console.log('Raw text response from Llama API:', rawResponse.substring(0, 500) + '...');
        } 
        // Maintain backward compatibility with the old API format
        else if (data.choices && data.choices[0] && data.choices[0].message) {
            rawResponse = data.choices[0].message.content;
            console.log('Raw text response from Together AI API (legacy format):', rawResponse.substring(0, 500) + '...');
        } else {
            console.error('Unrecognized API response format:', data);
            throw new Error('Unrecognized API response format');
        }
        
        // Now that we have the raw text response, parse it
        if (rawResponse) {
            // Parse the JSON response
            try {
                // Try to clean the response if needed - some models add markdown code blocks
                let jsonString = rawResponse;
                
                // Remove any markdown code block markers if present
                if (rawResponse.includes('```json')) {
                    jsonString = rawResponse.replace(/```json\n?|\n?```/g, '');
                } else if (rawResponse.includes('```')) {
                    jsonString = rawResponse.replace(/```\n?|\n?```/g, '');
                }
                
                // Try direct parsing first (in case the response is already clean JSON)
                try {
                    const directParse = JSON.parse(jsonString);
                    console.log('Direct JSON parsing succeeded:', directParse.length);
                    
                    // Create a map of id to simplified text
                    const simplificationMap = {};
                    directParse.forEach(item => {
                        if (item.id && item.simplified) {
                            simplificationMap[item.id] = item.simplified;
                        } else {
                            console.warn('Skipping item with missing id or simplified text:', item);
                        }
                    });
                    
                    console.log('Created simplification map with keys:', Object.keys(simplificationMap));
                    console.log('=== API CALL COMPLETED SUCCESSFULLY ===');
                    return simplificationMap;
                } catch (directError) {
                    console.log('Direct parsing failed, trying to extract JSON array:', directError);
                    
                    // Find JSON array in the response (in case there's any extra text)
                    const jsonMatch = jsonString.match(/\[\s*\{\s*\"id\"[\s\S]*\}\s*\]/);
                    
                    // If JSON array is found, extract it and parse
                    if (jsonMatch) {
                        console.log('Found JSON array in response:', jsonMatch[0].substring(0, 200) + '...');
                        
                        const extractedJson = jsonMatch[0];
                        const simplifiedItems = JSON.parse(extractedJson);
                        console.log('Parsed simplified items:', simplifiedItems.length);
                        
                        // Create a map of id to simplified text
                        const simplificationMap = {};
                        simplifiedItems.forEach(item => {
                            if (item.id && item.simplified) {
                                simplificationMap[item.id] = item.simplified;
                            } else {
                                console.warn('Skipping item with missing id or simplified text:', item);
                            }
                        });
                        
                        console.log('Created simplification map with keys:', Object.keys(simplificationMap));
                        console.log('=== API CALL COMPLETED SUCCESSFULLY ===');
                        return simplificationMap;
                    } else {
                        console.error('Could not find JSON array in response');
                        throw new Error('Could not find valid JSON array in API response');
                    }
                }
            } catch (error) {
                console.error('Error parsing JSON response:', error);
                console.log('Raw response that failed to parse:', rawResponse);
                throw new Error('Failed to parse JSON response from API: ' + error.message);
            }
        } else {
            console.error('No valid text content found in API response');
            throw new Error('No valid text content found in API response');
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
        'it': 'Come funziona il pensiero nel cervello è ancora un misterio per la neuroscienza moderna.',
        'pt': 'Como o cérebro pensa ainda é um mistério para a neurociência moderna.',
        'ar': 'كيف يفكر الدماغ لا يزال لغزاً للعلوم العصبية الحديثة.',
        'hi': 'दिमाग कैसे सोचता है यह आधुनिक न्यूरोसाइंस के लिए अभी भी एक रहस्य है।',
        'id': 'Bagaimana otak berpikir masih menjadi misteri bagi ilmu saraf modern.',
        'tl': 'Ang pag-iisip ng utak ay nanatiling hiwaga sa modernong agham ng utak.',
        'th': 'วิธีการทำงานของสมองยังคงเป็นปริศนาสำหรับวิทยาศาสตร์สมองสมัยใหม่',
        'vi': 'Cách não bộ suy nghĩ vẫn còn là điều bí ẩn đối với khoa học não bộ hiện đại.'
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
                                // Remove the data attribute to ensure it can be processed again
                                el.removeAttribute('data-original-text');
                                el.removeAttribute('data-simplified');
                                console.log('Restored element to original text and removed attributes');
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
                                
                                // We're removing this check to allow elements to be processed multiple times
                                // This enables the user to apply simplification repeatedly
                                
                                // Find all text nodes in this element
                                const walker = document.createTreeWalker(
                                    element,
                                    NodeFilter.SHOW_TEXT,
                                    { acceptNode: node => node.textContent.trim().length > 30 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
                                );
                                
                                let currentNode;
                                while (currentNode = walker.nextNode()) {
                                    allTextNodes.push({
                                        node: currentNode,
                                        element: element,
                                        text: currentNode.textContent,
                                        elementIndex: i
                                    });
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
                                            // Add additional logging to debug
                                            console.log(`Processing node ${nodeId}, simplified text:`, simplifiedText.substring(0, 100) + '...');
                                            
                                            // Save original for restoration
                                            if (!nodeInfo.node._originalText) {
                                                nodeInfo.node._originalText = nodeInfo.node.textContent;
                                            }
                                            
                                            // Check if this is a node with HTML content
                                            const hasHtmlElements = nodeInfo.element && (
                                                // Check for any HTML tags within the element
                                                (nodeInfo.element.innerHTML && nodeInfo.element.innerHTML.includes('<')) || 
                                                // Or check for specific common HTML elements
                                                nodeInfo.element.getElementsByTagName('a').length > 0 || 
                                                nodeInfo.element.getElementsByTagName('strong').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('em').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('b').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('i').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('span').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('sup').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('sub').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('cite').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('code').length > 0 ||
                                                nodeInfo.element.getElementsByTagName('mark').length > 0
                                            );
                                            
                                            // Check if the simplified text contains HTML tags
                                            const containsHtmlTags = simplifiedText.includes('<') && simplifiedText.includes('>');
                                            
                                            console.log(`Node ${nodeId} - hasHtmlElements: ${hasHtmlElements}, containsHtmlTags: ${containsHtmlTags}`);
                                            
                                            if (hasHtmlElements || containsHtmlTags) {
                                                // For HTML elements, replace the innerHTML instead of textContent
                                                if (!nodeInfo.element._originalHtml) {
                                                    nodeInfo.element._originalHtml = nodeInfo.element.innerHTML;
                                                }
                                                
                                                try {
                                                    // Replace element's innerHTML with simplified content
                                                    nodeInfo.element.innerHTML = simplifiedText;
                                                    console.log(`Updated innerHTML for ${nodeId}`);
                                                    
                                                    // Track the simplified element with HTML
                                                    simplifiedElements.push({
                                                        element: nodeInfo.element,
                                                        original: nodeInfo.element._originalHtml,
                                                        simplified: simplifiedText,
                                                        isHtml: true
                                                    });
                                                } catch (e) {
                                                    console.error(`Error updating innerHTML for ${nodeId}:`, e);
                                                    // Fallback to textContent if innerHTML fails
                                                    nodeInfo.node.textContent = simplifiedText.replace(/<[^>]*>/g, '');
                                                }
                                            } else {
                                                // For regular text nodes, replace the textContent
                                                nodeInfo.node.textContent = simplifiedText;
                                                console.log(`Updated textContent for ${nodeId}`);
                                                
                                                // Track the simplified node
                                                simplifiedElements.push({
                                                    node: nodeInfo.node,
                                                    element: nodeInfo.element,
                                                    original: nodeInfo.node._originalText,
                                                    simplified: simplifiedText,
                                                    isHtml: false
                                                });
                                            }
                                            
                                            // Mark element as processed
                                            nodeInfo.element.setAttribute('data-simplified', 'true');
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
                    console.log("Toggling font...", request);
                    console.log("Font name received:", request.fontName);
                    console.log("Font enabled:", request.enabled);
                    fontEnabled = request.enabled;
                    
                    // Ensure we're using the correct font name
                    if (typeof request.fontName === 'string') {
                        applyFont(request.fontName.toLowerCase().trim());
                    } else {
                        console.error("Invalid font name received:", request.fontName);
                    }
                    
                    sendResponse({success: true, appliedFont: request.fontName});
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

// Function to apply selected font
function applyFont(fontName) {
    console.log(`Applying font: ${fontName}`);
    console.log(`Font type: ${typeof fontName}`);
    
    // Debug: Check if fontName is valid
    if (!fontName || typeof fontName !== 'string') {
        console.error('Invalid font name:', fontName);
        return;
    }
    
    // Remove any existing font styles
    const existingFontStyle = document.getElementById('cogni-font-style');
    if (existingFontStyle) {
        existingFontStyle.parentNode.removeChild(existingFontStyle);
    }
    
    // Remove any existing font imports
    const existingFontImport = document.getElementById('cogni-font-import');
    if (existingFontImport) {
        existingFontImport.parentNode.removeChild(existingFontImport);
    }
    
    // Remove any existing OpenDyslexic font-face definitions
    const existingOpenDyslexic = document.getElementById('opendyslexic-font-face');
    if (existingOpenDyslexic) {
        existingOpenDyslexic.parentNode.removeChild(existingOpenDyslexic);
    }
    
    // If default font is selected, just return after removing existing styles
    if (fontName === 'default') {
        console.log('Reverting to default font');
        return;
    }
    
    // Define font properties for each font type
    const fontProperties = {
        verdana: {
            fontFamily: 'Verdana, sans-serif',
            lineHeight: '1.5',
            letterSpacing: '0.5px',
            wordSpacing: '3px',
            needsImport: false
        },
        opensans: {
            fontFamily: '"Open Sans", sans-serif',
            lineHeight: '1.6',
            letterSpacing: '0.3px',
            wordSpacing: '2px',
            needsImport: true,
            importUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap'
        },
        comicsans: {
            fontFamily: '"Comic Sans MS", cursive',
            lineHeight: '1.5',
            letterSpacing: '0.5px',
            wordSpacing: '4px',
            needsImport: false
        },
        bbc: {
            fontFamily: '"IBM Plex Sans", Arial, sans-serif',
            lineHeight: '1.6',
            letterSpacing: '0.2px',
            wordSpacing: '2.5px',
            needsImport: true,
            importUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap'
        },
        carnaby: {
            fontFamily: '"Baloo 2", Arial, sans-serif',
            lineHeight: '1.5',
            letterSpacing: '0.4px',
            wordSpacing: '3px',
            needsImport: true,
            importUrl: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600&display=swap'
        },
        opendyslexic: {
            fontFamily: 'OpenDyslexic, sans-serif',
            lineHeight: '1.5',
            letterSpacing: '0.5px',
            wordSpacing: '3px',
            needsImport: false
        }
    };
    
    console.log('Font properties available:', Object.keys(fontProperties));
    console.log('Looking for font properties for:', fontName);
    
    const props = fontProperties[fontName];
    if (!props) {
        console.error(`Unknown font: ${fontName}`);
        return;
    }
    
    console.log('Found font properties:', props);
    
    // Import web font if needed
    if (props.needsImport && props.importUrl) {
        const fontImport = document.createElement('link');
        fontImport.id = 'cogni-font-import';
        fontImport.rel = 'stylesheet';
        fontImport.href = props.importUrl;
        document.head.appendChild(fontImport);
        console.log(`Imported font from: ${props.importUrl}`);
    }
    
    // Only add OpenDyslexic font-face if that specific font is selected
    if (fontName === 'opendyslexic') {
        const fontFaceStyle = document.createElement('style');
        fontFaceStyle.id = 'opendyslexic-font-face';
        fontFaceStyle.textContent = `
            @font-face {
                font-family: 'OpenDyslexic';
                src: url('${chrome.runtime.getURL('fonts/OpenDyslexic-Regular.otf')}') format('opentype');
                font-weight: normal;
                font-style: normal;
            }
            @font-face {
                font-family: 'OpenDyslexic';
                src: url('${chrome.runtime.getURL('fonts/OpenDyslexic-Bold.otf')}') format('opentype');
                font-weight: bold;
                font-style: normal;
            }
        `;
        document.head.appendChild(fontFaceStyle);
        console.log('Added OpenDyslexic font-face definitions');
    }
    
    // Create and apply the font style with !important to override existing styles
    const fontStyle = document.createElement('style');
    fontStyle.id = 'cogni-font-style';
    
    fontStyle.textContent = `
        html, body, div, p, span, h1, h2, h3, h4, h5, h6, a, ul, ol, li, article, section, main, header, footer, nav, aside, button, input, textarea, select, label, table, tr, td, th {
            font-family: ${props.fontFamily} !important;
            line-height: ${props.lineHeight} !important;
            letter-spacing: ${props.letterSpacing} !important;
            word-spacing: ${props.wordSpacing} !important;
        }
    `;
    document.head.appendChild(fontStyle);
    console.log(`Applied font style: ${props.fontFamily}`);
    
    // Force a repaint to ensure the font is applied
    document.body.style.visibility = 'hidden';
    setTimeout(() => {
        document.body.style.visibility = 'visible';
    }, 50);
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
        if (item.isHtml && item.element && item.original) {
            // Restore HTML content
            item.element.innerHTML = item.original;
            console.log('Restored HTML element to original content');
        } else if (item.node && item.original) {
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
    
    // Apply saved font
    chrome.storage.sync.get(['selectedFont'], function(result) {
        const selectedFont = result.selectedFont || 'default';
        if (selectedFont !== 'default') {
            console.log('Applying saved font:', selectedFont);
            applyFont(selectedFont);
        }
    });
    
    // Load and apply initial spacing settings
    applySpacingAdjustments(
        1.5,  // Default line spacing
        0,    // Default letter spacing
        0     // Default word spacing
    );
});
