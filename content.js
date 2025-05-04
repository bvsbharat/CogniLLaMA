// Function to find the main content element on the page
function findMainContentElement() {
    console.log('Finding main content element...');
    
    // Try common content container selectors in priority order
    const contentSelectors = [
        'article',
        'main',
        '.article',
        '.post',
        '.content',
        '.main-content',
        '.article-content',
        '.post-content',
        '#content',
        '#main-content',
        '[role="main"]',
        '[itemprop="articleBody"]'
    ];
    
    for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 200) {
            console.log(`Found main content using selector: ${selector}`);
            return element;
        }
    }
    
    // If no specific container is found, try to find the element with the most text
    console.log('No common content container found, searching for element with most text...');
    
    const elements = document.querySelectorAll('div, section, article');
    let bestElement = null;
    let maxTextLength = 0;
    
    elements.forEach(element => {
        // Skip elements that are likely navigation, sidebars, etc.
        const isNavigation = element.tagName === 'NAV' || 
                            element.id?.toLowerCase().includes('nav') || 
                            element.className?.toLowerCase().includes('nav');
                            
        const isSidebar = element.id?.toLowerCase().includes('sidebar') || 
                        element.className?.toLowerCase().includes('sidebar');
                        
        const isFooter = element.tagName === 'FOOTER' || 
                        element.id?.toLowerCase().includes('footer') || 
                        element.className?.toLowerCase().includes('footer');
        
        if (!isNavigation && !isSidebar && !isFooter) {
            const textLength = element.textContent.trim().length;
            if (textLength > maxTextLength && textLength > 200) {
                maxTextLength = textLength;
                bestElement = element;
            }
        }
    });
    
    if (bestElement) {
        console.log('Found main content using text length heuristic', bestElement);
        return bestElement;
    }
    
    // Fallback to document body if all else fails
    console.log('Falling back to document body');
    return document.body;
}

let promptSession = null;
let systemPrompt = null; // Store systemPrompt globally
let simplifiedElements = []; // Track simplified elements
let hoverEnabled = false; // Track hover state
let fontEnabled = false; // Track font state
let initialized = false; // Track initialization state
let sliderInjected = false; // Track if the slider has been injected

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
                        optimizeFor: result.optimizeFor || 'eli5Simplify',
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
    
    // Fix the null systemprompt error by adding a null check
    if (!systemPrompt) {
        systemPrompt = "You are a helpful assistant that simplifies text while keeping the original meaning. Make the text easier to understand for general audiences.";
        console.log('Using default system prompt');
    } else {
        console.log('System prompt:', systemPrompt.substring(0, 50) + '...');
    }
    
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
            // Clean and sanitize the response before parsing
            let jsonString = rawResponse;
            
            // Remove any markdown code block markers if present
            if (rawResponse.includes('```json')) {
                jsonString = rawResponse.replace(/```json\n?|\n?```/g, '');
            } else if (rawResponse.includes('```')) {
                jsonString = rawResponse.replace(/```\n?|\n?```/g, '');
            }
            
            // Log the cleaned string for debugging
            console.log('Cleaned JSON string:', jsonString.substring(0, 200) + '...');
            
            // Handle the case where the response is not in JSON format at all
            // This happens when the API returns the simplified text directly without JSON structure
            if (!jsonString.trim().startsWith('[') && !jsonString.trim().startsWith('{')) {
                console.log('Response is not in JSON format, creating manual JSON structure');
                
                // Create a custom map using the batch items and response directly
                const simplificationMap = {};
                
                // If we have only one item in the batch, use the entire response as its simplified text
                if (textItems.length === 1) {
                    simplificationMap[`text_0`] = jsonString.trim();
                    console.log('Created single-item simplification map');
                    return simplificationMap;
                }
                
                // If we have multiple items but no JSON, try to split the response
                // Based on paragraph breaks or other heuristics
                const paragraphs = jsonString.split(/\n\s*\n/);
                textItems.forEach((item, index) => {
                    if (index < paragraphs.length) {
                        simplificationMap[`text_${index}`] = paragraphs[index].trim();
                    } else {
                        // If we don't have enough paragraphs, just return the original text
                        simplificationMap[`text_${index}`] = item.text;
                    }
                });
                
                if (Object.keys(simplificationMap).length > 0) {
                    console.log('Created paragraph-based simplification map with keys:', Object.keys(simplificationMap));
                    console.log('=== API CALL COMPLETED WITH FALLBACK PARSING ===');
                    return simplificationMap;
                }
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
                
                // Try to find JSON array in the response (in case there's any extra text)
                const jsonMatch = jsonString.match(/\[\s*\{\s*\"id\"[\s\S]*\}\s*\]/);
                
                // If JSON array is found, extract it and parse
                if (jsonMatch) {
                    console.log('Found JSON array in response:', jsonMatch[0].substring(0, 200) + '...');
                    
                    try {
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
                    } catch (matchError) {
                        console.error('Error parsing extracted JSON array:', matchError);
                    }
                }
                
                // If we reach here, try a more aggressive JSON extraction
                try {
                    // Look for any JSON-like structure with id and simplified fields
                    const looseMatch = jsonString.match(/\{[^{}]*"id"\s*:\s*"[^"]*"[^{}]*"simplified"\s*:\s*"[^"]*"[^{}]*\}/g);
                    
                    if (looseMatch && looseMatch.length > 0) {
                        console.log('Found loose JSON objects:', looseMatch.length);
                        
                        // Try to reconstruct a valid JSON array
                        const reconstructedJson = `[${looseMatch.join(',')}]`;
                        console.log('Reconstructed JSON:', reconstructedJson.substring(0, 200) + '...');
                        
                        try {
                            const simplifiedItems = JSON.parse(reconstructedJson);
                            
                            // Create a map of id to simplified text
                            const simplificationMap = {};
                            simplifiedItems.forEach(item => {
                                if (item.id && item.simplified) {
                                    simplificationMap[item.id] = item.simplified;
                                }
                            });
                            
                            if (Object.keys(simplificationMap).length > 0) {
                                console.log('Created reconstructed simplification map with keys:', Object.keys(simplificationMap));
                                console.log('=== API CALL COMPLETED WITH RECONSTRUCTED JSON ===');
                                return simplificationMap;
                            }
                        } catch (reconstructError) {
                            console.error('Error parsing reconstructed JSON:', reconstructError);
                        }
                    }
                } catch (looseError) {
                    console.error('Error during loose JSON matching:', looseError);
                }
                
                // Final fallback: just return the text as is
                console.log('All JSON parsing methods failed, using fallback text return');
                
                // Create a simplification map with original text IDs but with whatever text we received
                const fallbackMap = {};
                textItems.forEach((item, index) => {
                    // For fallback, we'll just use the original HTML-sanitized text
                    const sanitizedText = jsonString
                        .replace(/<[^>]*>/g, '') // Remove HTML tags
                        .replace(/\s+/g, ' ')    // Normalize whitespace
                        .trim();
                    
                    fallbackMap[`text_${index}`] = sanitizedText || item.text;
                });
                
                console.log('Created fallback simplification map with keys:', Object.keys(fallbackMap));
                console.log('=== API CALL COMPLETED WITH FALLBACK TEXT ===');
                return fallbackMap;
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

// Function to simplify the content of the page
async function simplifyContent(cognitiveMode = 'eli5Simplify', targetLanguage = 'en', simplificationLevel = 3, customPrompt = '') {
    

    const customPromptValue = await chrome.storage.sync.get('customPromptText');
    console.log("customPromptValue value", customPromptValue.customPromptText);

    console.log("customPrompt value", customPromptValue);
    

    // Generate the appropriate system prompt based on cognitive mode
    let systemPrompt = '';
    
    // Define system prompts for different modes
    const systemPrompts = {
        'customPrompt':  customPromptValue.customPromptText || "You are a helpful assistant that transforms text according to custom instructions while maintaining the core meaning.",
        'eli5Simplify': "You are a helpful assistant that explains complex concepts in extremely simple terms. Explain like I'm 5 years old, using simple language, examples, and analogies.",
        'visualClarity': "You are a helpful assistant that enhances the clarity of text for better comprehension. Focus on making the content more scannable and visually clear. Identify and highlight key points by wrapping them in <span class=\"highlighted\">important text</span> tags. Create clear structure with short paragraphs, use simple language, and make complex concepts easy to understand. Preserve all the important information from the original text.",
        'mindIlluminator': "You are a helpful assistant that simplifies text while maintaining clarity. Make complex concepts easier to understand and illuminate key ideas.",
        'techExplainer': "You are a helpful assistant that explains technical concepts clearly. Break down complex ideas into understandable components."
    };
    
    let selectedCognitiveMode = await chrome.storage.sync.get('cognitiveMode');

    // Set the system prompt based on the selected cognitive mode
    systemPrompt = systemPrompts[selectedCognitiveMode.cognitiveMode] || systemPrompts['eli5Simplify'];

    console.log("selectedCognitiveMode", selectedCognitiveMode.cognitiveMode);
    console.log("systemPrompt", systemPrompt);
    
    // Inject CSS for cognitive modes to ensure highlighting works properly
    injectCognitiveModeCSS();
    
    // Adjust the prompt based on simplification level (1-5)
    let levelAdjustment = '';
    if (simplificationLevel <= 2) {
        levelAdjustment = " Focus on maximum simplicity, using shorter sentences and basic vocabulary.";
    } else if (simplificationLevel >= 4) {
        levelAdjustment = " Maintain more nuance and sophistication in your simplification.";
    }
    
    systemPrompt += levelAdjustment;
    
    console.log("Using system prompt:", systemPrompt);
    
    try {
        // Find the main content element
        const mainContentElement = findMainContentElement();
        if (!mainContentElement) {
            console.error('Main content element not found');
            throw new Error('Could not identify the main content on this page');
        }
        
        console.log(`Main content element found: ${mainContentElement.tagName}#${mainContentElement.id}.${mainContentElement.className}`);
        
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
            findTextElements(mainContentElement);
            
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
                            resolve(result.selectedLanguage || targetLanguage || 'original');
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
                                    
                                    // Animate the updated element
                                    animateContentUpdate(nodeInfo.element);
                                    
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
                                    
                                    // Animate the fallback text
                                    animateContentUpdate(nodeInfo.node.parentElement || nodeInfo.node);
                                }
                            } else {
                                // For regular text nodes, replace the textContent
                                nodeInfo.node.textContent = simplifiedText;
                                console.log(`Updated textContent for ${nodeId}`);
                                
                                // Animate the text node's parent for visibility (text nodes can't be styled directly)
                                animateContentUpdate(nodeInfo.element || nodeInfo.node.parentElement);
                                
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
                            nodeInfo.element.setAttribute('data-original-text', nodeInfo.node._originalText);
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
            
            return simplifiedElements.length;
        } catch (error) {
            console.error('Error processing chunks:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error simplifying content:', error);
        throw error;
    }
}

// Helper function to animate content updates
function animateContentUpdate(element) {
    // Add the animation class
    element.classList.add('cogni-llama-content-updated');
    
    // Remove the class after animation completes to allow for future animations
    setTimeout(() => {
        element.classList.remove('cogni-llama-content-updated');
    }, 1500); // slightly longer than animation duration to ensure it completes
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
                                chrome.storage.sync.get(['simplificationLevel', 'cognitiveMode', 'selectedLanguage', 'customPromptText'], (result) => {
                                    resolve({
                                        level: result.simplificationLevel || '3',
                                        cognitiveMode: result.cognitiveMode || 'eli5Simplify',
                                        language: result.selectedLanguage || 'original',
                                        customPromptText: result.customPromptText || ''
                                    });
                                });
                            });
                            
                            console.log("Current settings:", settings);
                            console.log("Selected language:", settings.language);
                            
                            // Update system prompt based on current settings
                            if (settings.cognitiveMode === 'customPrompt' && settings.customPromptText) {
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

                        // Use the new simplifyContent function
                        const simplifiedCount = await simplifyContent(
                            settings.cognitiveMode,
                            settings.language,
                            parseInt(settings.level),
                            settings.customPromptText
                        );
                        sendResponse({success: true, count: simplifiedCount});
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
                
                case "toggle-slider":
                    console.log("Toggle slider request received");
                    await injectSlider();
                    // The slider.js will handle the toggle logic itself
                    sendResponse({success: true});
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
    console.log('Restoring original content...');
    console.log(`Found ${simplifiedElements.length} elements to restore`);
    
    if (simplifiedElements.length === 0) {
        showNotification('No simplified content to restore');
        return;
    }
    
    // Iterate through simplified elements in reverse order to handle nested elements correctly
    for (let i = simplifiedElements.length - 1; i >= 0; i--) {
        const item = simplifiedElements[i];
        
        try {
            if (item.isHtml && item.element && item.element._originalHtml) {
                // If this is an element with HTML, restore its original innerHTML
                item.element.innerHTML = item.original;
                // Animate the update
                animateContentUpdate(item.element);
            } else if (item.node) {
                // For text nodes, restore original textContent
                item.node.textContent = item.original;
                // Animate the text update (on parent element for visibility)
                animateContentUpdate(item.element || item.node.parentElement);
            }
            
            // Remove the data-simplified attribute
            if (item.element) {
                item.element.removeAttribute('data-simplified');
                item.element.removeAttribute('data-original-text');
            }
        } catch (e) {
            console.error('Error restoring original content:', e);
        }
    }
    
    // Clear the simplified elements array after restoration
    window.simplifiedElements = [];
    
    // Show a notification
    showNotification('Restored original content');
    
    return true;
}

// Function to show a notification
function showNotification(message) {
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
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove the notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Function to inject the slider resources and script
async function injectSlider() {
    console.log("Injecting slider...");
    
    if (!sliderInjected) {
        try {
            // Inject slider CSS
            const sliderCssLink = document.createElement('link');
            sliderCssLink.rel = 'stylesheet';
            sliderCssLink.href = chrome.runtime.getURL('slider.css');
            document.head.appendChild(sliderCssLink);
            console.log("Slider CSS injected");
            
            // Create the slider DOM structure directly instead of using a separate script
            const slider = document.createElement('div');
            slider.className = 'cogni-llama-slider';
            
            // Create slider HTML content (copy from slider.js createSliderHTML function)
            slider.innerHTML = `
                <div class="cogni-llama-slider-header">
                    <div class="cogni-llama-header-main">
                        <h2>
                            <img src="${chrome.runtime.getURL('images/logo.png')}" alt="Cogni Icon">
                            CogniLlama.AI
                        </h2>
                        <button id="cogni-llama-close-slider" aria-label="Close">×</button>
                    </div>
                </div>
                
                <div class="cogni-llama-tabs">
                    <div class="cogni-llama-tab active" data-tab="ai">
                        <i class="fa-solid fa-robot"></i>
                        <span>AI Cognitive</span>
                    </div>
                    <div class="cogni-llama-tab" data-tab="ui">
                        <i class="fa-solid fa-sliders"></i>
                        <span>UI Settings</span>
                    </div>
                </div>
                
                <div class="cogni-llama-slider-content">
                    <!-- AI Configuration Tab Content -->
                    <div class="cogni-llama-tab-content active" id="ai-tab">
                        <div class="cogni-llama-section">
                            <div class="cogni-llama-option-cards">
                                  <div class="cogni-llama-option-card" data-value="customPrompt">
                                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                                    <span>Custom Mode</span>
                                    <i class="fa-solid fa-pen-to-square cogni-llama-edit-icon" id="cogni-llama-edit-custom"></i>
                                </div>
                                
                                <div id="cogni-llama-custom-prompt-area" class="cogni-llama-custom-prompt-area hidden">
                                <textarea id="cogni-llama-custom-prompt-input" placeholder="Enter your custom instructions here. For example: 'Rewrite this text in the style of Shakespeare' or 'Explain this as if teaching to a high school student'"></textarea>
                                <button id="cogni-llama-save-custom-prompt" class="cogni-llama-button cogni-llama-secondary-button">
                                    <i class="fa-solid fa-save"></i> Save Custom Prompt
                                </button>
                            </div>

                                <div class="cogni-llama-option-card selected" data-value="eli5Simplify">
                                    <i class="fa-solid fa-child"></i>
                                    <span>ELI5 Simplify</span>
                                </div>
                                <div class="cogni-llama-option-card" data-value="visualClarity">
                                    <i class="fa-solid fa-eye"></i>
                                    <span>Visual Clarity</span>
                                </div>
                                <div class="cogni-llama-option-card" data-value="mindIlluminator">
                                    <i class="fa-solid fa-lightbulb"></i>
                                    <span>Mind Illuminator</span>
                                </div>
                                <div class="cogni-llama-option-card" data-value="techExplainer">
                                    <i class="fa-solid fa-code"></i>
                                    <span>Tech Explainer</span>
                                </div>
                              
                            </div>
                            
                            
                        </div>
                        
                        <div class="cogni-llama-section">
                            <h3><i class="fa-solid fa-globe"></i> Language</h3>
                            <div class="cogni-llama-control">
                                <select id="cogni-llama-language-selector">
                                    <option value="original">Original</option>
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="it">Italian</option>
                                    <option value="pt">Portuguese</option>
                                    <option value="ar">Arabic</option>
                                    <option value="hi">Hindi</option>
                                    <option value="id">Indonesian</option>
                                    <option value="tl">Tagalog</option>
                                    <option value="th">Thai</option>
                                    <option value="vi">Vietnamese</option>
                                    <option value="zh">Chinese (Simplified)</option>
                                    <option value="ja">Japanese</option>
                                    <option value="ko">Korean</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="cogni-llama-section">
                            <h3><i class="fa-solid fa-sliders"></i> Level</h3>
                            <div class="cogni-llama-slider-container">
                                <div class="cogni-llama-slider-labels">
                                    <span>Min</span>
                                    <span>Med</span>
                                    <span>Max</span>
                                </div>
                                <input type="range" id="cogni-llama-simplification-slider" class="cogni-llama-range-slider" min="1" max="5" step="1" value="3">
                            </div>
                        </div>
                    </div>
                    
                    <!-- UI Settings Tab Content -->
                    <div class="cogni-llama-tab-content" id="ui-tab">
                        <div class="cogni-llama-section">
                            <h3><i class="fa-solid fa-palette"></i> Appearance</h3>
                            <div class="cogni-llama-control">
                                <label for="cogni-llama-font-selector">Font Style</label>
                                <select id="cogni-llama-font-selector">
                                    <option value="default">Default</option>
                                    <option value="verdana">Verdana</option>
                                    <option value="opensans">Open Sans</option>
                                    <option value="comicsans">Comic Sans</option>
                                    <option value="bbc">BBC Reith</option>
                                    <option value="carnaby">Carnaby Street</option>
                                    <option value="opendyslexic">OpenDyslexic</option>
                                </select>
                            </div>
                            
                            <div class="cogni-llama-control">
                                <label for="cogni-llama-theme-selector">Theme</label>
                                <select id="cogni-llama-theme-selector">
                                    <option value="default">Default</option>
                                    <option value="darkMode">Dark Mode</option>
                                    <option value="sepia">Sepia</option>
                                    <option value="creamPaper">Cream Paper</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="cogni-llama-section">
                            <h3><i class="fa-solid fa-text-width"></i> Spacing</h3>
                            
                            <div class="cogni-llama-control">
                                <label for="cogni-llama-line-spacing">Line Spacing <span id="cogni-llama-line-spacing-value">1.5x</span></label>
                                <input type="range" id="cogni-llama-line-spacing" class="cogni-llama-range-slider" min="1" max="3" step="0.1" value="1.5">
                            </div>
                            
                            <div class="cogni-llama-control">
                                <label for="cogni-llama-letter-spacing">Letter Spacing <span id="cogni-llama-letter-spacing-value">1x</span></label>
                                <input type="range" id="cogni-llama-letter-spacing" class="cogni-llama-range-slider" min="0" max="5" step="0.1" value="1">
                            </div>
                            
                            <div class="cogni-llama-control">
                                <label for="cogni-llama-word-spacing">Word Spacing <span id="cogni-llama-word-spacing-value">4x</span></label>
                                <input type="range" id="cogni-llama-word-spacing" class="cogni-llama-range-slider" min="0" max="10" step="0.5" value="4">
                            </div>
                        </div>
                        
                        <div class="cogni-llama-section">
                            <h3><i class="fa-solid fa-keyboard"></i> Keyboard Shortcuts</h3>
                            <div class="cogni-llama-control">
                                <label>Toggle Slider</label>
                                <div class="cogni-llama-shortcut-keys">Ctrl/Cmd + Shift + L</div>
                            </div>
                            <div class="cogni-llama-control">
                                <label>Simplify Page</label>
                                <div class="cogni-llama-shortcut-keys">Ctrl/Cmd + Shift + S</div>
                            </div>
                        </div>
                        
                        <div class="cogni-llama-section">
                            <button id="cogni-llama-reset-defaults" class="cogni-llama-button">
                                <i class="fa-solid fa-rotate-left"></i> Reset to Defaults
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Llama Magic Button - Always visible at bottom -->
                <div class="cogni-llama-buttons">
                    <button id="cogni-llama-simplify" class="cogni-llama-button cogni-llama-primary-button cogni-llama-simplify-text">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Llama Magic
                    </button>
                </div>
            `;
            
            // Add fontawesome link
            const fontAwesomeLink = document.createElement('link');
            fontAwesomeLink.rel = 'stylesheet';
            fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fontAwesomeLink);
            
            // Add Inter font link
            const interFontLink = document.createElement('link');
            interFontLink.rel = 'stylesheet';
            interFontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
            document.head.appendChild(interFontLink);
            
            // Append the slider to the DOM
            document.body.appendChild(slider);
            console.log("Slider DOM created and injected");
            
            // Initialize slider functionality
            initializeSliderFunctionality();
            
            sliderInjected = true;
        } catch (error) {
            console.error("Error injecting slider:", error);
            throw error;
        }
    }
    
    // Toggle slider visibility
    toggleSlider('left');
}

// Function to toggle slider visibility
function toggleSlider(side = 'left') {
    console.log(`Toggling slider visibility (side: ${side})...`);
    const slider = document.querySelector('.cogni-llama-slider');
    if (slider) {
        // Set the side class first, before toggling visibility
        if (side === 'right') {
            slider.classList.add('right-side');
        } else {
            slider.classList.remove('right-side');
        }
        
        // Then toggle visibility
        slider.classList.toggle('visible');
        console.log("Slider visibility toggled:", slider.classList.contains('visible'), "Side:", side);
    } else {
        console.error("Slider element not found!");
    }
}

// Function to initialize slider functionality
function initializeSliderFunctionality() {
    // Get slider elements
    const closeButton = document.getElementById('cogni-llama-close-slider');
    const tabs = document.querySelectorAll('.cogni-llama-tab');
    const optionCards = document.querySelectorAll('.cogni-llama-option-card');
    const editCustomButton = document.getElementById('cogni-llama-edit-custom');
    const customPromptArea = document.getElementById('cogni-llama-custom-prompt-area');
    const simplifyButton = document.getElementById('cogni-llama-simplify');
    const themeSelector = document.getElementById('cogni-llama-theme-selector');
    const fontSizeSelector = document.getElementById('cogni-llama-font-selector');
    const saveCustomPromptButton = document.getElementById('cogni-llama-save-custom-prompt');
    const resetDefaultsButton = document.getElementById('cogni-llama-reset-defaults');
    
    console.log("Initializing slider functionality with elements:", {
        closeButton: !!closeButton,
        tabs: tabs.length,
        optionCards: optionCards.length,
        editCustomButton: !!editCustomButton,
        customPromptArea: !!customPromptArea,
        simplifyButton: !!simplifyButton,
        themeSelector: !!themeSelector,
        fontSizeSelector: !!fontSizeSelector,
        saveCustomPromptButton: !!saveCustomPromptButton,
        resetDefaultsButton: !!resetDefaultsButton
    });
    
    // Add Escape key listener to close the slider
    document.addEventListener('keydown', function(e) {
        // Check if the Escape key was pressed
        if (e.key === 'Escape') {
            // Only act if slider is visible
            const slider = document.querySelector('.cogni-llama-slider');
            if (slider && slider.classList.contains('visible')) {
                console.log('Escape key pressed - closing slider');
                toggleSlider();
                e.preventDefault(); // Prevent default browser escape behavior
            }
        }
    });
    
    // Close button functionality
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            toggleSlider();
        });
    }
    
    // Tab switching functionality
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and tab contents
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottom = 'none'; // Reset border for all tabs
            });
            document.querySelectorAll('.cogni-llama-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            const tabContent = document.getElementById(`${tabName}-tab`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
            
            // Add coral underline to active tab - using our new coral color
            tab.style.borderBottom = '3px solid var(--primary-coral)';
        });
    });
    
    // Option cards functionality
    if (optionCards && optionCards.length > 0) {
        console.log(`Found ${optionCards.length} option cards to initialize`);
        
        // Create a new array to store references to the cloned cards
        const clonedCards = [];
        
        optionCards.forEach((card, index) => {
            // Log what we're attaching events to
            console.log(`Setting up card ${index}: value=${card.getAttribute('data-value')}, classes=${card.className}`);
            
            // Remove any existing click handlers by creating a clone
            const cardClone = card.cloneNode(true);
            card.parentNode.replaceChild(cardClone, card);
            
            // Store reference to the cloned card
            clonedCards.push(cardClone);
            
            // Add new click handler to the clone
            cardClone.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Stop event bubbling
                
                // Skip if the click was directly on the edit icon
                if (e.target.classList.contains('cogni-llama-edit-icon')) {
                    console.log(`Click was on edit icon, ignoring card selection`);
                    return;
                }
                
                const value = this.getAttribute('data-value');
                console.log(`Option card clicked: ${value}`);
                
                // Clear selection from all cards with direct DOM manipulation
                document.querySelectorAll('.cogni-llama-option-card').forEach(c => {
                    c.classList.remove('selected');
                    console.log(`Removed 'selected' from card`);
                });
                
                // Add selected class to clicked card with direct DOM manipulation
                this.classList.add('selected');
                console.log(`Added 'selected' to ${value}`);
                
                // Apply inline styles for immediate visual feedback
                this.style.background = 'linear-gradient(135deg, rgba(24, 119, 242, 0.2) 0%, rgba(24, 119, 242, 0.3) 100%)';
                this.style.color = '#0a58ca';
                this.style.borderColor = '#0a58ca';
                this.style.boxShadow = '0 0 8px rgba(24, 119, 242, 0.5)';
                this.style.transform = 'translateY(-2px)';
                this.style.fontWeight = 'bold';
                
                // Reset styles on other cards
                clonedCards.forEach(otherCard => {
                    if (otherCard !== this) {
                        otherCard.style.background = '';
                        otherCard.style.color = '';
                        otherCard.style.borderColor = '';
                        otherCard.style.boxShadow = '';
                        otherCard.style.transform = '';
                        otherCard.style.fontWeight = '';
                    }
                });
                
                // Handle custom prompt area visibility
                if (value === 'customPrompt' && customPromptArea) {
                    customPromptArea.classList.remove('hidden');
                    console.log(`Made custom prompt area visible`);
                } else if (customPromptArea) {
                    customPromptArea.classList.add('hidden');
                    console.log(`Hid custom prompt area`);
                }
                
                // Save the selected option to storage with clear logging
                console.log(`Saving cognitive mode selection: ${value}`);
                chrome.storage.sync.set({ 'cognitiveMode': value }, function() {
                    console.log(`Successfully saved cognitive mode: ${value}`);
                });
            });
            
            // Add explicit pointer cursor to emphasize clickability
            cardClone.style.cursor = 'pointer';
        });
        
        // Add event delegation on the parent container as a backup
        const optionCardsContainer = document.querySelector('.cogni-llama-option-cards');
        if (optionCardsContainer) {
            optionCardsContainer.addEventListener('click', function(e) {
                const cardElement = e.target.closest('.cogni-llama-option-card');
                if (cardElement && !e.target.classList.contains('cogni-llama-edit-icon')) {
                    // Trigger click on the card if it wasn't directly clicked
                    if (e.target !== cardElement) {
                        console.log('Triggering click through delegation');
                        cardElement.click();
                    }
                }
            });
        }
    } else {
        console.error("No option cards found in the slider!");
    }
    
    // Edit custom prompt button
    if (editCustomButton) {
        editCustomButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the card's click event
            console.log("Edit custom prompt button clicked");
            customPromptArea.classList.toggle('hidden');
            
            // Select the Custom Mode card
            optionCards.forEach(card => {
                if (card.getAttribute('data-value') === 'customPrompt') {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
        });
    }
    
    // Save custom prompt button
    if (saveCustomPromptButton) {
        saveCustomPromptButton.addEventListener('click', () => {
            console.log("Save custom prompt button clicked");
            const customPromptInput = document.getElementById('cogni-llama-custom-prompt-input');
            if (customPromptInput) {
                const customPromptText = customPromptInput.value;
                chrome.storage.sync.set({ customPromptText: customPromptText });
                
                // Show feedback to the user
                saveCustomPromptButton.textContent = 'Saved!';
                
                // Hide the custom prompt area after saving
                setTimeout(() => {
                    // First restore the button text
                    saveCustomPromptButton.innerHTML = '<i class="fa-solid fa-save"></i> Save Custom Prompt';
                    
                    // Then hide the custom prompt area
                    const customPromptArea = document.getElementById('cogni-llama-custom-prompt-area');
                    if (customPromptArea) {
                        customPromptArea.classList.add('hidden');
                        console.log('Custom prompt area hidden after save');
                    }
                }, 1000); // Shorter timing to make the UI feel more responsive
            }
        });
    }
    
    // Font selector functionality
    if (fontSizeSelector) {
        fontSizeSelector.addEventListener('change', () => {
            const selectedFont = fontSizeSelector.value;
            console.log(`Font changed to: ${selectedFont}`);
            
            // Save to storage
            chrome.storage.sync.set({ selectedFont: selectedFont });
            
            // Apply font change
            applyFont(selectedFont);
        });
    }
    
    // Theme selector functionality
    if (themeSelector) {
        themeSelector.addEventListener('change', () => {
            const selectedTheme = themeSelector.value;
            console.log(`Theme changed to: ${selectedTheme}`);
            
            // Save to storage
            chrome.storage.sync.set({ selectedTheme: selectedTheme });
            
            // Apply theme change
            applyTheme(selectedTheme);
        });
    }
    
    // Spacing sliders functionality
    const lineSpacingSlider = document.getElementById('cogni-llama-line-spacing');
    const lineSpacingValue = document.getElementById('cogni-llama-line-spacing-value');
    const letterSpacingSlider = document.getElementById('cogni-llama-letter-spacing');
    const letterSpacingValue = document.getElementById('cogni-llama-letter-spacing-value');
    const wordSpacingSlider = document.getElementById('cogni-llama-word-spacing');
    const wordSpacingValue = document.getElementById('cogni-llama-word-spacing-value');
    
    if (lineSpacingSlider && lineSpacingValue) {
        lineSpacingSlider.addEventListener('input', () => {
            const value = lineSpacingSlider.value;
            lineSpacingValue.textContent = `${value}x`;
            
            // Save and apply
            chrome.storage.sync.set({ lineSpacing: value });
            applySpacingAdjustments(value, letterSpacingSlider?.value || 0, wordSpacingSlider?.value || 0);
        });
    }
    
    if (letterSpacingSlider && letterSpacingValue) {
        letterSpacingSlider.addEventListener('input', () => {
            const value = letterSpacingSlider.value;
            letterSpacingValue.textContent = `${value}px`;
            
            // Save and apply
            chrome.storage.sync.set({ letterSpacing: value });
            applySpacingAdjustments(lineSpacingSlider?.value || 1.5, value, wordSpacingSlider?.value || 0);
        });
    }
    
    if (wordSpacingSlider && wordSpacingValue) {
        wordSpacingSlider.addEventListener('input', () => {
            const value = wordSpacingSlider.value;
            wordSpacingValue.textContent = `${value}px`;
            
            // Save and apply
            chrome.storage.sync.set({ wordSpacing: value });
            applySpacingAdjustments(lineSpacingSlider?.value || 1.5, letterSpacingSlider?.value || 0, value);
        });
    }
    
    // Simplify button (Llama Magic) functionality
    if (simplifyButton) {
        simplifyButton.addEventListener('click', () => {
            console.log("Llama Magic button clicked");
            
            // Add loading state
            const originalText = simplifyButton.innerHTML;
            simplifyButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            simplifyButton.disabled = true;
            
            // Get the selected cognitive mode
            let cognitiveMode = '';
            optionCards.forEach(card => {
                if (card.classList.contains('selected')) {
                    cognitiveMode = card.getAttribute('data-value');
                }
            });
            
            // Get custom prompt if in custom mode
            let customPrompt = '';
            if (cognitiveMode === 'customPrompt') {
                customPrompt = document.getElementById('cogni-llama-custom-prompt-input').value;
                console.log(`Custom prompt: ${customPrompt}`);
            }
            
            // Get selected language
            const languageSelector = document.getElementById('cogni-llama-language-selector');
            let targetLanguage = 'en'; // Default to English
            
            if (languageSelector) {
                targetLanguage = languageSelector.value;
                console.log(`Target language: ${targetLanguage}`);
            }
            
            // Get simplification level
            const simplificationSlider = document.getElementById('cogni-llama-simplification-slider');
            let simplificationLevel = 3; // Default to medium
            
            if (simplificationSlider) {
                simplificationLevel = parseInt(simplificationSlider.value);
                console.log(`Simplification level: ${simplificationLevel}`);
            }
            
            // Call the simplifyContent function
            simplifyContent(cognitiveMode, targetLanguage, simplificationLevel, customPrompt)
                .then(() => {
                    // Restore button state
                    simplifyButton.innerHTML = originalText;
                    simplifyButton.disabled = false;
                    console.log('Content simplification completed');
                })
                .catch(error => {
                    console.error('Error simplifying content:', error);
                    // Restore button state and show error
                    simplifyButton.innerHTML = originalText;
                    simplifyButton.disabled = false;
                    alert(`Error: ${error.message}`);
                });
        });
    }
    
    // Reset defaults button
    if (resetDefaultsButton) {
        resetDefaultsButton.addEventListener('click', () => {
            console.log("Reset defaults button clicked");
            
            // Reset settings in storage
            chrome.storage.sync.set({
                cognitiveMode: 'eli5Simplify',
                targetLanguage: 'en',
                simplificationLevel: 3,
                selectedTheme: 'default',
                selectedFont: 'default',
                lineSpacing: 1.5,
                letterSpacing: 0,
                wordSpacing: 0
            });
            
            // Update UI to reflect defaults
            if (themeSelector) themeSelector.value = 'default';
            if (fontSizeSelector) fontSizeSelector.value = 'default';
            
            // Reset cognitive mode selection
            if (optionCards && optionCards.length > 0) {
                optionCards.forEach(card => {
                    card.classList.remove('selected');
                    if (card.getAttribute('data-value') === 'eli5Simplify') {
                        card.classList.add('selected');
                    }
                });
            }
            
            // Reset language selector
            const languageSelector = document.getElementById('cogni-llama-language-selector');
            if (languageSelector) languageSelector.value = 'en';
            
            // Reset simplification slider
            const simplificationSlider = document.getElementById('cogni-llama-simplification-slider');
            if (simplificationSlider) simplificationSlider.value = 3;
            
            // Reset spacing sliders
            if (lineSpacingSlider) lineSpacingSlider.value = 1.5;
            if (lineSpacingValue) lineSpacingValue.textContent = '1.5x';
            
            if (letterSpacingSlider) letterSpacingSlider.value = 0;
            if (letterSpacingValue) letterSpacingValue.textContent = '0px';
            
            if (wordSpacingSlider) wordSpacingSlider.value = 0;
            if (wordSpacingValue) wordSpacingValue.textContent = '0px';
            
            // Apply changes
            applyFont('default');
            applyTheme('default');
            applySpacingAdjustments(1.5, 0, 0);
            
            // Show feedback
            resetDefaultsButton.innerHTML = '<i class="fa-solid fa-check"></i> Settings Reset!';
            setTimeout(() => {
                resetDefaultsButton.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Reset to Defaults';
            }, 2000);
        });
    }
    
    // Load settings from storage
    chrome.storage.sync.get([
        'optimizeFor',
        'customPromptText',
        'selectedFont',
        'selectedTheme',
        'lineSpacing',
        'letterSpacing',
        'wordSpacing',
        'selectedLanguage',
        'simplificationLevel'
    ], result => {
        console.log("Loading saved settings:", result);
        
        // Initialize optimization mode
        const optimizeFor = result.optimizeFor || 'eli5Simplify';
        optionCards.forEach(card => {
            if (card.getAttribute('data-value') === optimizeFor) {
                card.classList.add('selected');
                if (optimizeFor === 'customPrompt') {
                    customPromptArea.classList.remove('hidden');
                }
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Set custom prompt
        if (result.customPromptText) {
            const customPromptInput = document.getElementById('cogni-llama-custom-prompt-input');
            if (customPromptInput) {
                customPromptInput.value = result.customPromptText;
            }
        }
        
        // Set language
        const languageSelector = document.getElementById('cogni-llama-language-selector');
        if (languageSelector && result.selectedLanguage) {
            languageSelector.value = result.selectedLanguage;
        }
        
        // Set simplification level
        const simplificationSlider = document.getElementById('cogni-llama-simplification-slider');
        if (simplificationSlider && result.simplificationLevel) {
            simplificationSlider.value = result.simplificationLevel;
        }
        
        // Set font
        if (fontSizeSelector && result.selectedFont) {
            fontSizeSelector.value = result.selectedFont;
        }
        
        // Set theme
        if (themeSelector && result.selectedTheme) {
            themeSelector.value = result.selectedTheme;
        }
    });
}

// Add a direct keyboard event listener to the document
document.addEventListener('keydown', async function(e) {  
    // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'l') {
        console.log('Direct keyboard shortcut detected: Command/Ctrl+Shift+L');
        if (!sliderInjected) {
            injectSlider();
        } else {
            toggleSlider('left');
        }
        e.preventDefault(); // Prevent default browser behavior
    }
    
    // Check for Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux) to open from the right
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
        console.log('Direct keyboard shortcut detected: Command/Ctrl+Shift+R');
        
        // First make sure the slider is injected
        if (!sliderInjected) {
            // Inject the slider first
            await injectSlider(); 
        }
        
        // Now handle the slider positioning and visibility
        const slider = document.querySelector('.cogni-llama-slider');
        if (slider) {
            // Force the right side positioning
            slider.classList.add('right-side');
            
            // If not already visible, make it visible
            if (!slider.classList.contains('visible')) {
                slider.classList.add('visible');
                console.log("Opened slider from right side");
            } else {
                // If it's already visible, toggle it off
                slider.classList.remove('visible');
                console.log("Closed slider from right side");
            }
        }
        
        e.preventDefault(); // Prevent default browser behavior (which would refresh the page)
    }
});

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

// Cognitive mode selection
const cognitiveCards = document.querySelectorAll('.cogni-llama-option-card');
    
cognitiveCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove selected class from all cards
        cognitiveCards.forEach(c => c.classList.remove('selected'));
        
        // Add selected class to clicked card
        card.classList.add('selected');
        
        const cognitiveMode = card.getAttribute('data-value');
        console.log(`Cognitive mode selected: ${cognitiveMode}`);
        
        // Show custom prompt input if the custom mode is selected
        if (cognitiveMode === 'customPrompt') {
            document.getElementById('cogni-llama-custom-prompt-area').classList.remove('hidden');
        } else {
            document.getElementById('cogni-llama-custom-prompt-area').classList.add('hidden');
        }
        
        // Save the selected cognitive mode
        chrome.storage.sync.set({ 'cognitiveMode': cognitiveMode }, function() {
            console.log(`Cognitive mode saved: ${cognitiveMode}`);
        });
    });
});

// Initialize the Llama Magic button with modern style
const simplifyButton = document.querySelector('#cogni-llama-simplify');
    
simplifyButton.addEventListener('click', function() {
    console.log("Llama Magic button clicked");
    
    // Add loading state
    const originalText = simplifyButton.innerHTML;
    simplifyButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    simplifyButton.disabled = true;
    
    // Get the selected cognitive mode
    let cognitiveMode = 'eli5Simplify'; // Default value
    
    const selectedCard = document.querySelector('.cogni-llama-option-card.selected');
    if (selectedCard) {
        cognitiveMode = selectedCard.getAttribute('data-value');
    } else {
        // If no card is selected, select the first one by default
        const firstCard = document.querySelector('.cogni-llama-option-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            cognitiveMode = firstCard.getAttribute('data-value');
        }
    }
    
    console.log(`Using cognitive mode: ${cognitiveMode}`);
    
    // Get custom prompt if in custom mode
    let customPrompt = '';
    if (cognitiveMode === 'customPrompt') {
        customPrompt = document.getElementById('cogni-llama-custom-prompt-input').value;
        console.log(`Custom prompt: ${customPrompt}`);
    }
    
    // Get selected language
    const languageSelector = document.getElementById('cogni-llama-language-selector');
    let targetLanguage = 'en'; // Default to English
    
    if (languageSelector) {
        targetLanguage = languageSelector.value;
        console.log(`Target language: ${targetLanguage}`);
    }
    
    // Get simplification level
    const simplificationSlider = document.getElementById('cogni-llama-simplification-slider');
    let simplificationLevel = 3; // Default to medium
    
    if (simplificationSlider) {
        simplificationLevel = parseInt(simplificationSlider.value);
        console.log(`Simplification level: ${simplificationLevel}`);
    }
    
    // Call the simplifyContent function
    simplifyContent(cognitiveMode, targetLanguage, simplificationLevel, customPrompt)
        .then(() => {
            // Restore button state
            simplifyButton.innerHTML = originalText;
            simplifyButton.disabled = false;
            console.log('Content simplification completed');
        })
        .catch(error => {
            console.error('Error simplifying content:', error);
            // Restore button state and show error
            simplifyButton.innerHTML = originalText;
            simplifyButton.disabled = false;
            alert(`Error: ${error.message}`);
        });
});

// Function to inject necessary CSS for cognitive modes
function injectCognitiveModeCSS() {
    const styleId = 'cogni-llama-content-styles';
    
    // If already injected, don't do it again
    if (document.getElementById(styleId)) {
        return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
        /* Visual Clarity highlighting style */
        .highlighted {
            background-color: #fff4a3; /* Light yellow background */
            padding: 0 2px;
            border-radius: 3px;
            font-weight: 500; /* Slightly bold */
            display: inline; 
            box-shadow: 0 0 3px rgba(0, 0, 0, 0.1);
        }
    `;
    
    document.head.appendChild(styleElement);
    console.log('Injected cognitive mode CSS styles');
}
