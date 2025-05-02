// Direct keyboard shortcut handler for CogniLLaMA
(function() {
  console.log('CogniLLaMA direct-shortcut.js loaded');

  // Function to create and inject the slider panel
  function createSliderPanel() {
    console.log('Creating slider panel from direct-shortcut.js');
    
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
  
  // Add the keyboard event listener
  document.addEventListener('keydown', function(event) {
    // Log all keyboard events for debugging
    console.log('Key pressed:', event.key, 
      'Meta:', event.metaKey, 
      'Ctrl:', event.ctrlKey, 
      'Shift:', event.shiftKey,
      'Alt:', event.altKey);
    
    // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
      console.log('CogniLLaMA shortcut detected!');
      event.preventDefault();
      event.stopPropagation();
      createSliderPanel();
    }
  }, true); // Use capturing phase to ensure we get the event first
  
  // Also try to handle the message from the background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received in direct-shortcut.js:', request);
    if (request.action === 'toggle-slider') {
      createSliderPanel();
      sendResponse({success: true, source: 'direct-shortcut.js'});
    }
    return true;
  });
  
  console.log('CogniLLaMA direct-shortcut.js initialized');
})();
