// Slider panel for CogniLLaMA configuration
(function() {
    console.log('CogniLLaMA slider.js loaded');
    
    // Make the createSliderPanel function globally accessible for testing
    window.createCogniLLaMASlider = function() {
        console.log('createCogniLLaMASlider called from global function');
        createSliderPanel();
    };
    
    // Create and inject the slider panel
    function createSliderPanel() {
        console.log('createSliderPanel function called');
        
        // Check if panel already exists
        if (document.getElementById('cogni-llama-slider')) {
            console.log('Panel already exists, toggling visibility');
            toggleSliderVisibility();
            return;
        }

        console.log('Creating new slider panel');
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
            console.log('Slider panel activated');
        }, 10);
        
        // Load the popup content via fetch
        fetch(chrome.runtime.getURL('popup.html'))
            .then(response => {
                console.log('Fetched popup.html:', response.status);
                return response.text();
            })
            .then(html => {
                console.log('Parsing popup.html content');
                // Parse the HTML to extract just the content we need
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
                    closeSlider();
                });
                
                // Extract and add the main content
                const mainContent = doc.getElementById('mainContent');
                const settingsPage = doc.getElementById('settingsPage');
                
                console.log('Found mainContent:', !!mainContent);
                console.log('Found settingsPage:', !!settingsPage);
                
                if (mainContent && settingsPage) {
                    // Clone the nodes to preserve event handlers
                    contentContainer.appendChild(mainContent.cloneNode(true));
                    contentContainer.appendChild(settingsPage.cloneNode(true));
                    
                    // Add the keyboard shortcut hint
                    const shortcutHint = document.createElement('div');
                    shortcutHint.className = 'keyboard-shortcut-hint';
                    shortcutHint.textContent = 'Press Alt+L to toggle this panel';
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
                    
                    // Initialize the popup functionality
                    initializePopupInSlider();
                } else {
                    console.error('Could not find main content or settings page in popup.html');
                }
            })
            .catch(error => {
                console.error('Error loading popup content:', error);
            });
    }
    
    // Toggle the slider visibility if it already exists
    function toggleSliderVisibility() {
        console.log('toggleSliderVisibility called');
        const slider = document.getElementById('cogni-llama-slider');
        if (slider) {
            if (slider.classList.contains('active')) {
                closeSlider();
            } else {
                slider.classList.add('active');
                document.documentElement.classList.add('cogni-llama-active');
                console.log('Slider activated');
            }
        }
    }
    
    // Close the slider
    function closeSlider() {
        console.log('closeSlider called');
        const slider = document.getElementById('cogni-llama-slider');
        if (slider) {
            slider.classList.remove('active');
            document.documentElement.classList.remove('cogni-llama-active');
            console.log('Slider deactivated');
        }
    }
    
    // Load CSS file
    function loadCSS(href) {
        console.log('Loading CSS:', href);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }
    
    // Initialize popup functionality in the slider
    function initializePopupInSlider() {
        console.log('Initializing popup functionality in slider');
        // Get references to elements
        const slider = document.getElementById('cogni-llama-slider');
        const mainContent = slider.querySelector('#mainContent');
        const settingsPage = slider.querySelector('#settingsPage');
        const settingsButton = slider.querySelector('.settings-button');
        const backButton = slider.querySelector('.back-button');
        
        // Handle settings button click
        if (settingsButton) {
            settingsButton.addEventListener('click', function() {
                mainContent.style.display = 'none';
                settingsPage.style.display = 'block';
                console.log('Settings page opened');
            });
        }
        
        // Handle back button click
        if (backButton) {
            backButton.addEventListener('click', function() {
                settingsPage.style.display = 'none';
                mainContent.style.display = 'block';
                console.log('Main content page opened');
            });
        }
        
        // Handle simplification buttons
        const simplificationButtons = slider.querySelectorAll('.simplification-button');
        simplificationButtons.forEach(button => {
            button.addEventListener('click', function() {
                simplificationButtons.forEach(btn => btn.classList.remove('selected'));
                this.classList.add('selected');
                
                // Save the selected level
                chrome.storage.sync.set({ 
                    simplificationLevel: this.getAttribute('data-level') 
                });
                console.log('Simplification level set:', this.getAttribute('data-level'));
            });
        });
        
        // Handle optimization options
        const optionCards = slider.querySelectorAll('.option-card');
        optionCards.forEach(card => {
            card.addEventListener('click', function() {
                optionCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                
                // Save the selected option
                chrome.storage.sync.set({ 
                    optimizeFor: this.getAttribute('data-value') 
                });
                console.log('Optimize for set:', this.getAttribute('data-value'));
            });
        });
        
        // Handle simplify button
        const simplifyButton = slider.querySelector('#simplifyText');
        if (simplifyButton) {
            simplifyButton.addEventListener('click', function() {
                // Get the selected options
                const level = slider.querySelector('.simplification-button.selected').getAttribute('data-level');
                const optimizeFor = slider.querySelector('.option-card.selected').getAttribute('data-value');
                
                console.log('Simplify button clicked with level:', level, 'and optimize for:', optimizeFor);
                
                // Send message to content script
                chrome.runtime.sendMessage({
                    action: 'simplify',
                    level: level,
                    optimizeFor: optimizeFor
                });
                
                // Show loading state
                const buttonText = simplifyButton.querySelector('#simplifyButtonText');
                const loader = simplifyButton.querySelector('#loader');
                
                if (buttonText && loader) {
                    buttonText.textContent = 'Simplifying...';
                    loader.style.display = 'inline-block';
                    
                    // Reset after 3 seconds
                    setTimeout(() => {
                        buttonText.textContent = 'Simplify Text';
                        loader.style.display = 'none';
                    }, 3000);
                }
                
                // Close the slider after simplifying
                setTimeout(() => {
                    closeSlider();
                }, 1000);
            });
        }
        
        // Handle help icons
        const helpIcons = slider.querySelectorAll('.help-icon');
        helpIcons.forEach(icon => {
            icon.addEventListener('click', function() {
                const guideId = this.id === 'helpIconOptimize' ? 'optimizeGuide' : 'simplificationGuide';
                const guide = slider.querySelector(`#${guideId}`);
                
                if (guide) {
                    guide.classList.toggle('expanded');
                    this.setAttribute('aria-expanded', guide.classList.contains('expanded'));
                    console.log('Help guide toggled:', guideId);
                }
            });
        });
    }
    
    // Listen for the keyboard shortcut (Alt+L)
    document.addEventListener('keydown', function(event) {
        console.log('Keydown event detected:', event.key, 'Alt:', event.altKey);
        
        // Check for Alt+L
        if (event.altKey && event.key.toLowerCase() === 'l') {
            console.log('Keyboard shortcut detected: Alt+L');
            event.preventDefault();
            createSliderPanel();
        }
    }, true); // Use capturing phase to ensure we get the event first
    
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Message received in slider.js:', request);
        if (request.action === 'toggle-slider') {
            console.log('Received toggle-slider message');
            createSliderPanel();
            sendResponse({ success: true });
        }
        return true;
    });
    
    // Create a floating button as a fallback
    function createFloatingButton() {
        // Check if button already exists
        if (document.getElementById('cogni-llama-button')) {
            return;
        }
        
        // Create button
        const button = document.createElement('button');
        button.id = 'cogni-llama-button';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#FFFFFF">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
        `;
        
        // Style the button
        Object.assign(button.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '2147483647',
            backgroundColor: '#1877f2',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s, background-color 0.2s'
        });
        
        // Add hover effect
        button.addEventListener('mouseover', function() {
            this.style.transform = 'scale(1.1)';
            this.style.backgroundColor = '#0d6efd';
        });
        
        button.addEventListener('mouseout', function() {
            this.style.transform = 'scale(1)';
            this.style.backgroundColor = '#1877f2';
        });
        
        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.textContent = 'Open CogniLLaMA Configuration (Alt+L)';
        Object.assign(tooltip.style, {
            position: 'absolute',
            right: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            opacity: '0',
            transition: 'opacity 0.2s',
            pointerEvents: 'none'
        });
        
        button.appendChild(tooltip);
        
        // Show/hide tooltip
        button.addEventListener('mouseover', function() {
            tooltip.style.opacity = '1';
        });
        
        button.addEventListener('mouseout', function() {
            tooltip.style.opacity = '0';
        });
        
        // Add click handler
        button.addEventListener('click', function() {
            createSliderPanel();
        });
        
        // Add to page
        document.body.appendChild(button);
        console.log('CogniLLaMA button added to page');
    }
    
    // Create the floating button when the page is loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(createFloatingButton, 1000); // Delay to ensure page is fully loaded
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createFloatingButton, 1000);
        });
    }
    
    console.log('CogniLLaMA slider.js initialization complete');
})();
