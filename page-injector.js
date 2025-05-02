// This script injects a keyboard listener directly into the page
// This bypasses any Chrome extension restrictions on keyboard shortcuts

console.log('CogniLLaMA page-injector.js loaded');

// Create a script element to inject directly into the page
const script = document.createElement('script');
script.textContent = `
  // Direct keyboard shortcut handler injected into the page
  (function() {
    console.log('CogniLLaMA direct page script injected');
    
    // Flag to track if the slider is created
    let sliderCreated = false;
    
    // Function to send a message to the extension
    function sendMessageToExtension(message) {
      window.postMessage({ 
        source: 'cogni-llama-page-script', 
        ...message 
      }, '*');
    }
    
    // Listen for keyboard events
    document.addEventListener('keydown', function(event) {
      // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
        console.log('CogniLLaMA shortcut detected in page script!');
        event.preventDefault();
        event.stopPropagation();
        
        // Send message to extension
        sendMessageToExtension({ action: 'toggle-slider' });
      }
    }, true); // Use capturing phase to ensure we get the event first
    
    console.log('CogniLLaMA keyboard shortcut listener injected into page');
  })();
`;

// Inject the script into the page
document.documentElement.appendChild(script);
script.remove();

// Listen for messages from the injected script
window.addEventListener('message', function(event) {
  // Only accept messages from our script
  if (event.source !== window || !event.data || event.data.source !== 'cogni-llama-page-script') {
    return;
  }
  
  console.log('Message received from page script:', event.data);
  
  // Handle toggle-slider action
  if (event.data.action === 'toggle-slider') {
    console.log('Toggle slider action received from page script');
    
    // Create the slider panel
    createSliderPanel();
    
    // Also try to notify the background script
    try {
      chrome.runtime.sendMessage({
        action: 'toggle-slider',
        source: 'page-injector'
      });
    } catch (error) {
      console.error('Error sending message to background script:', error);
    }
  }
});

// Function to create and inject the slider panel
function createSliderPanel() {
  console.log('Creating slider panel from page-injector.js');
  
  // Check if panel already exists
  const existingPanel = document.getElementById('cogni-llama-slider');
  if (existingPanel) {
    console.log('Panel already exists, toggling visibility');
    if (existingPanel.classList.contains('active')) {
      existingPanel.classList.remove('active');
      document.documentElement.classList.remove('cogni-llama-active');
    } else {
      existingPanel.classList.add('active');
      document.documentElement.classList.add('cogni-llama-active');
    }
    return;
  }
  
  // Create the slider container
  const sliderPanel = document.createElement('div');
  sliderPanel.id = 'cogni-llama-slider';
  sliderPanel.className = 'cogni-llama-slider';
  
  // Create a loading message
  const loadingMessage = document.createElement('div');
  loadingMessage.style.padding = '20px';
  loadingMessage.style.textAlign = 'center';
  loadingMessage.style.color = '#1877f2';
  loadingMessage.style.fontFamily = 'Arial, sans-serif';
  loadingMessage.innerHTML = '<h2>Loading CogniLLaMA...</h2><p>Please wait while we load the configuration panel.</p>';
  
  sliderPanel.appendChild(loadingMessage);
  document.body.appendChild(sliderPanel);
  
  // Load the CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('slider.css');
  document.head.appendChild(link);
  
  // Show the slider with animation
  setTimeout(() => {
    sliderPanel.classList.add('active');
    document.documentElement.classList.add('cogni-llama-active');
  }, 10);
  
  // Load the popup content via fetch
  fetch(chrome.runtime.getURL('popup.html'))
    .then(response => response.text())
    .then(html => {
      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Create the content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'cogni-llama-content';
      
      // Add a close button
      const closeButton = document.createElement('button');
      closeButton.className = 'cogni-llama-close';
      closeButton.innerHTML = '&times;';
      closeButton.addEventListener('click', () => {
        sliderPanel.classList.remove('active');
        document.documentElement.classList.remove('cogni-llama-active');
      });
      
      // Extract and add the main content
      const mainContent = doc.getElementById('mainContent');
      const settingsPage = doc.getElementById('settingsPage');
      
      if (mainContent && settingsPage) {
        // Clone the nodes
        contentContainer.appendChild(mainContent.cloneNode(true));
        contentContainer.appendChild(settingsPage.cloneNode(true));
        
        // Add the keyboard shortcut hint
        const shortcutHint = document.createElement('div');
        shortcutHint.className = 'keyboard-shortcut-hint';
        shortcutHint.textContent = 'Press Cmd+Shift+L to toggle this panel';
        contentContainer.appendChild(shortcutHint);
        
        // Clear the slider and add the new content
        sliderPanel.innerHTML = '';
        sliderPanel.appendChild(closeButton);
        sliderPanel.appendChild(contentContainer);
        
        // Load the popup CSS
        const popupCssLink = document.createElement('link');
        popupCssLink.rel = 'stylesheet';
        popupCssLink.href = chrome.runtime.getURL('popup.css');
        document.head.appendChild(popupCssLink);
        
        // Initialize basic event handlers
        initializeBasicEventHandlers(sliderPanel);
      } else {
        console.error('Could not find main content or settings page in popup.html');
      }
    })
    .catch(error => {
      console.error('Error loading popup content:', error);
      sliderPanel.innerHTML = '<div style="padding: 20px; color: red;">Error loading content</div>';
    });
}

// Initialize basic event handlers for the slider panel
function initializeBasicEventHandlers(sliderPanel) {
  // Settings button
  const settingsButton = sliderPanel.querySelector('.settings-button');
  const mainContent = sliderPanel.querySelector('#mainContent');
  const settingsPage = sliderPanel.querySelector('#settingsPage');
  
  if (settingsButton && mainContent && settingsPage) {
    settingsButton.addEventListener('click', function() {
      mainContent.style.display = 'none';
      settingsPage.style.display = 'block';
    });
  }
  
  // Back button
  const backButton = sliderPanel.querySelector('.back-button');
  if (backButton && mainContent && settingsPage) {
    backButton.addEventListener('click', function() {
      settingsPage.style.display = 'none';
      mainContent.style.display = 'block';
    });
  }
}

// Create a global function to trigger the slider
window.toggleCogniLLaMASlider = createSliderPanel;

// Also listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received in page-injector.js:', request);
  if (request.action === 'toggle-slider') {
    createSliderPanel();
    sendResponse({success: true, source: 'page-injector.js'});
  }
  return true;
});

console.log('CogniLLaMA page-injector.js initialized');
