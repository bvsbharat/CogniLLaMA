// Include the systemPrompts data directly
const systemPrompts = {
    "textClarity": {
        "1": "You are helping a reader by simplifying complex text and improving readability. Rewrite text to enhance readability while keeping sophisticated elements. Focus on clearer organization and structure. Break down complex sentences when needed. Keep all proper names, places, and quotes unchanged.",
        "2": "You are helping a reader with learning disabilities. Rewrite text using clearer structure and simpler explanations. Replace complex terms with everyday words where possible. Use shorter sentences and clear organization. Keep all names, places, and quotes unchanged.",
        "3": "You are helping a reader with learning disabilities. Rewrite using simple, everyday language and short sentences. Break down complex ideas into smaller, clearer parts. Use familiar words while keeping important details. Keep all names, places, and quotes unchanged.",
        "4": "You are helping a reader with learning disabilities. Rewrite to be very, very easy to understand. Use basic words and simple sentences. Break each complex idea into multiple short sentences. Add brief explanations in brackets for difficult concepts. Keep all names, places, and quotes unchanged.",
        "5": "You are helping a 5-year-old reader with learning disabilities. Rewrite in the simplest possible way. Use only basic, everyday words. Keep sentences under 8 words. Add step-by-step explanations for complex ideas. Include definitions for any unusual terms. Keep all names, places, and quotes unchanged."
    },
    "focusStructure": {
        "1": "You are helping readers with ADHD by organizing content with better visual breaks and highlights. Rewrite text with clear visual structure and frequent paragraph breaks. Organize information in a way that maintains focus. Add emphasis to key points. Keep all names, places, and quotes unchanged.",
        "2": "You are helping readers with ADHD and attention challenges. Rewrite using distinct sections and clear headings. Break information into smaller, focused chunks. Use clear language and highlight important points. Keep all names, places, and quotes unchanged.",
        "3": "You are helping readers with ADHD and attention challenges. Rewrite using short paragraphs and bullet points. Keep one main idea per paragraph. Use simple language and highlight key information. Keep sentences focused and direct. Keep all names, places, and quotes unchanged.",
        "4": "You are helping readers with ADHD and attention challenges. Rewrite using very short, focused paragraphs. Create bullet points for lists. Keep sentences short and direct. Add visual markers between different ideas. Highlight important information. Keep all names, places, and quotes unchanged.",
        "5": "You are helping a 5-year-old reader with ADHD and attention challenges. Rewrite with maximum structure and focus. Use single-idea paragraphs with frequent breaks. Create bullet points for all lists. Keep sentences under 8 words. Add clear markers between topics. Keep all names, places, and quotes unchanged."
    },
    "wordPattern": {
        "1": "You are helping readers by using consistent layouts and clearer word spacing. Rewrite text using clear sentence structures and patterns. Keep sophisticated vocabulary but improve readability. Add subtle reading aids through formatting. Keep all names, places, and quotes unchanged.",
        "2": "You are helping readers with dyslexia and processing challenges. Rewrite using consistent sentence patterns. Replace difficult words with clearer ones. Break multi-part ideas into separate sentences. Add helpful context. Keep all names, places, and quotes unchanged.",
        "3": "You are helping readers with dyslexia and processing challenges. Rewrite using simple, predictable patterns. Keep sentences short and direct. Use familiar words and explain complex terms. Break down complicated ideas. Keep all names, places, and quotes unchanged.",
        "4": "You are helping readers with dyslexia and processing challenges. Rewrite using basic patterns and simple words. Keep sentences very short and similar in structure. Break every complex idea into multiple simple sentences. Add clear explanations. Keep all names, places, and quotes unchanged.",
        "5": "You are helping a 5-year-old with dyslexia and processing challenges. Rewrite using the most basic sentence patterns. Use only common, everyday words. Keep sentences under 8 words and similarly structured. Break every idea into tiny steps. Add simple explanations for unusual terms. Keep all names, places, and quotes unchanged."
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

// Inject the slider.js script into all tabs when they are updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        console.log('Tab updated, injecting slider functionality:', tabId);
        
        // Inject the slider.js script
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['slider.js']
        }).then(() => {
            console.log('Slider script injected successfully into tab:', tabId);
        }).catch(err => {
            console.error('Error injecting slider script:', err);
        });
        
        // Inject the slider.css stylesheet
        chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['slider.css']
        }).then(() => {
            console.log('Slider CSS injected successfully into tab:', tabId);
        }).catch(err => {
            console.error('Error injecting slider CSS:', err);
        });
    }
});
