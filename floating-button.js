// Floating button for CogniLLaMA configuration
(function() {
  console.log('CogniLLaMA floating-button.js loaded');
  
  // Create a floating button that users can click to open the slider
  function createFloatingButton() {
    console.log('Creating floating button');
    
    // Check if button already exists
    if (document.getElementById('cogni-llama-floating-button')) {
      console.log('Floating button already exists');
      return;
    }
    
    // Create the button
    const button = document.createElement('button');
    button.id = 'cogni-llama-floating-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#FFFFFF">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    `;
    
    // Style the button
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.width = '50px';
    button.style.height = '50px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = '#1877f2';
    button.style.border = 'none';
    button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    button.style.cursor = 'pointer';
    button.style.zIndex = '2147483647';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.transition = 'transform 0.2s, background-color 0.2s';
    
    // Add hover effect
    button.addEventListener('mouseover', function() {
      button.style.transform = 'scale(1.1)';
      button.style.backgroundColor = '#0d6efd';
    });
    
    button.addEventListener('mouseout', function() {
      button.style.transform = 'scale(1)';
      button.style.backgroundColor = '#1877f2';
    });
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Open CogniLLaMA Configuration (Cmd+Shift+L)';
    tooltip.style.position = 'absolute';
    tooltip.style.right = '60px';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.fontSize = '12px';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.2s';
    tooltip.style.pointerEvents = 'none';
    
    button.appendChild(tooltip);
    
    // Show/hide tooltip
    button.addEventListener('mouseover', function() {
      tooltip.style.opacity = '1';
    });
    
    button.addEventListener('mouseout', function() {
      tooltip.style.opacity = '0';
    });
    
    // Add click event
    button.addEventListener('click', function() {
      console.log('Floating button clicked');
      
      // Try multiple ways to open the slider
      
      // 1. Try direct function if available
      if (window.toggleCogniLLaMASlider) {
        console.log('Calling toggleCogniLLaMASlider directly');
        window.toggleCogniLLaMASlider();
      } else if (window.createCogniLLaMASlider) {
        console.log('Calling createCogniLLaMASlider directly');
        window.createCogniLLaMASlider();
      }
      
      // 2. Send message to extension
      try {
        chrome.runtime.sendMessage({
          action: 'toggle-slider',
          source: 'floating-button'
        });
      } catch (error) {
        console.error('Error sending message to extension:', error);
      }
      
      // 3. Post message to page
      window.postMessage({
        source: 'cogni-llama-floating-button',
        action: 'toggle-slider'
      }, '*');
      
      // 4. Create the slider directly
      createSliderPanel();
    });
    
    // Add the button to the page
    document.body.appendChild(button);
    console.log('Floating button added to page');
  }
  
  // Function to create and inject the slider panel
  function createSliderPanel() {
    console.log('Creating slider panel from floating-button.js');
    
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
  
  // Create the floating button when the page is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }
  
  // Also listen for messages from the background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received in floating-button.js:', request);
    if (request.action === 'toggle-slider') {
      createSliderPanel();
      sendResponse({success: true, source: 'floating-button.js'});
    }
    return true;
  });
  
  // Listen for keyboard events
  document.addEventListener('keydown', function(event) {
    // Log all keyboard events for debugging
    console.log('Key pressed in floating-button.js:', event.key, 
      'Meta:', event.metaKey, 
      'Ctrl:', event.ctrlKey, 
      'Shift:', event.shiftKey,
      'Alt:', event.altKey);
    
    // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
      console.log('CogniLLaMA shortcut detected in floating-button.js!');
      event.preventDefault();
      event.stopPropagation();
      createSliderPanel();
    }
  }, true); // Use capturing phase to ensure we get the event first
  
  console.log('CogniLLaMA floating-button.js initialized');
})();
