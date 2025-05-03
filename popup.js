function initializePopup() {
    // Restore selected simplification level and font settings
    chrome.storage.sync.get(['simplificationLevel', 'optimizeFor', 'fontEnabled', 'selectedLanguage'], function(result) {
        const level = result.simplificationLevel || '3'; // Default to '3' for "Mid"
        const slider = document.getElementById('simplificationSlider');
        if (slider) {
            slider.value = level;
        }
        
        // Restore optimize for selection with new option cards
        const optimizeFor = result.optimizeFor || 'focusStructure';
        const optionCard = document.querySelector(`.option-card[data-value="${optimizeFor}"]`);
        if (optionCard) {
            document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
            optionCard.classList.add('selected');
        }
        
        // Restore language selection
        const languageSelector = document.getElementById('languageSelector');
        if (languageSelector) {
            languageSelector.value = result.selectedLanguage || 'original';
        }
        
        // Restore font toggle state
        document.getElementById('fontToggle').checked = result.fontEnabled || false;
    });

    // Restore theme, toggle and slider states
    chrome.storage.sync.get(['selectedTheme'], function(result) {
        document.getElementById('themeSelector').value = result.selectedTheme || 'default';
    });
    chrome.storage.sync.get(['lineSpacing', 'letterSpacing', 'wordSpacing'], function(result) {
        document.getElementById('lineSpacing').value = result.lineSpacing || 1.5;
        document.getElementById('lineSpacingValue').textContent = result.lineSpacing || 1.5;
        
        document.getElementById('letterSpacing').value = result.letterSpacing || 0;
        document.getElementById('letterSpacingValue').textContent = (result.letterSpacing || 0) + 'px';
        
        document.getElementById('wordSpacing').value = result.wordSpacing || 0;
        document.getElementById('wordSpacingValue').textContent = (result.wordSpacing || 0) + 'px';
    });
    
    chrome.storage.sync.get(['fontEnabled'], function(result) {
        document.getElementById('fontToggle').checked = result.fontEnabled || false;
    });
}

// Get references to the button and its elements
const simplifyButton = document.getElementById('simplifyText');
const simplifyButtonText = document.getElementById('simplifyButtonText');
const loader = document.getElementById('loader');

// Function to animate text replacement
function animateTextReplacement(element, newText, duration = 500) {
    // Add transition class
    element.classList.add('text-transition');
    
    // Fade out
    element.classList.add('text-fade-out');
    
    // After fade out, change text and fade in
    setTimeout(() => {
        element.textContent = newText;
        element.classList.remove('text-fade-out');
        element.classList.add('text-fade-in');
        
        // Clean up classes after animation completes
        setTimeout(() => {
            element.classList.remove('text-transition', 'text-fade-in');
        }, duration);
    }, duration);
}

// Button click handler
simplifyButton.addEventListener('click', function() {
    console.log('Simplify button clicked');
    
    // Add visual feedback
    simplifyButton.classList.add('active');
    
    // Disable the button
    simplifyButton.disabled = true;

    // Update the button text and show loader with animation
    animateTextReplacement(simplifyButtonText, 'Processing...');
    loader.style.display = 'inline-block';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log('Active tab:', tabs[0]);
        
        if (tabs[0] && /^https?:/.test(tabs[0].url)) {
            console.log('Sending simplify message to tab:', tabs[0].id);
            
            chrome.tabs.sendMessage(tabs[0].id, {action: "simplify"}, function(response) {
                console.log('Received response from content script:', response);
                
                if (chrome.runtime.lastError) {
                    console.error("Could not send simplify message:", chrome.runtime.lastError.message);

                    // Re-enable the button and reset text and loader with animation
                    simplifyButton.disabled = false;
                    animateTextReplacement(simplifyButtonText, 'Llama Magic');
                    loader.style.display = 'none';
                    simplifyButton.classList.remove('active');
                } else {
                    if(response && response.success) {
                        // Simplification succeeded with animation
                        animateTextReplacement(simplifyButtonText, 'Done!');
                    } else {
                        // Handle error with animation
                        animateTextReplacement(simplifyButtonText, 'Error!');
                    }
                    
                    // Re-enable the button and hide loader after a delay
                    setTimeout(() => {
                        simplifyButton.disabled = false;
                        loader.style.display = 'none';
                        simplifyButton.classList.remove('active');
                        
                        // Reset button text after showing status
                        setTimeout(() => {
                            animateTextReplacement(simplifyButtonText, 'Llama Magic');
                        }, 1000);
                    }, 2000);
                }
            });
        } else {
            console.error("Active tab is not a valid web page.");

            // Re-enable the button and reset text and loader with animation
            simplifyButton.disabled = false;
            animateTextReplacement(simplifyButtonText, 'Llama Magic');
            loader.style.display = 'none';
            simplifyButton.classList.remove('active');
        }
    });
});

// Function to initialize simplification slider
function initializeSimplificationSlider() {
    const slider = document.getElementById('simplificationSlider');
    if (!slider) {
        console.error('Simplification slider element not found');
        return;
    }
    
    // Set default value if not already set
    if (!slider.value) {
        slider.value = '3'; // Default to '3' for "Mid"
    }
    
    // Add event listener for slider changes
    slider.addEventListener('input', function() {
        // Add ripple effect for feedback
        addRippleEffect(this);
        
        // Save the selected level
        chrome.storage.sync.set({ simplificationLevel: this.value });
        notifyConfigChange(true);
    });
}

// Add ripple effect for better visual feedback
function addRippleEffect(element) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    element.appendChild(ripple);
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${0}px`;
    ripple.style.top = `${0}px`;
    
    ripple.classList.add('active');
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Function to send configuration updates to the content script
function notifyConfigChange(isSimplificationChange = false) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateConfig",
                config: {
                    simplificationLevel: document.getElementById('simplificationSlider').value,
                    optimizeFor: document.querySelector('.option-card.selected').getAttribute('data-value'),
                    fontEnabled: document.getElementById('fontToggle').checked,
                    selectedLanguage: document.getElementById('languageSelector').value
                },
                isSimplificationChange: isSimplificationChange
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeSimplificationSlider();
    document.getElementById('mainContent').style.display = 'block';
    initializePopup();

    // Add help icon click handler
    const helpIcon = document.querySelector('.help-icon');
    const simplificationGuide = document.getElementById('simplificationGuide');
    
    helpIcon.addEventListener('click', function() {
        simplificationGuide.classList.toggle('expanded');
        const expanded = simplificationGuide.classList.contains('expanded');
        helpIcon.setAttribute('aria-expanded', expanded.toString());
    });

    // Add language help icon click handler
    const helpIconLanguage = document.getElementById('helpIconLanguage');
    const languageGuide = document.getElementById('languageGuide');
    
    if (helpIconLanguage && languageGuide) {
        helpIconLanguage.addEventListener('click', function() {
            languageGuide.classList.toggle('expanded');
            const expanded = languageGuide.classList.contains('expanded');
            helpIconLanguage.setAttribute('aria-expanded', expanded.toString());
        });
    }

    // Add language selector change handler
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        languageSelector.addEventListener('change', function(e) {
            const selectedLanguage = e.target.value;
            
            // Save preference
            chrome.storage.sync.set({ selectedLanguage: selectedLanguage });
            
            // Notify content script
            notifyConfigChange(true);
        });
    }

    // Add option card click handlers
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selected class from all cards
            optionCards.forEach(c => c.classList.remove('selected'));
            
            // Add selected class to clicked card
            this.classList.add('selected');
            
            // Add ripple effect for feedback
            addRippleEffect(this);
            
            // Save preference
            chrome.storage.sync.set({ optimizeFor: this.getAttribute('data-value') });
            
            // Notify content script
            notifyConfigChange(true);
        });
    });

    // Reset to Defaults button handler
    document.getElementById('resetDefaults').addEventListener('click', function() {
        chrome.storage.sync.set({
            fontEnabled: false,
            selectedTheme: 'default',
            lineSpacing: 1.5,
            letterSpacing: 0,
            wordSpacing: 0
        }, function() {
            // Update the UI elements
            document.getElementById('fontToggle').checked = false;
            document.getElementById('themeSelector').value = 'default';

            document.getElementById('lineSpacing').value = 1.5;
            document.getElementById('lineSpacingValue').textContent = '1.5';

            document.getElementById('letterSpacing').value = 0;
            document.getElementById('letterSpacingValue').textContent = '0px';

            document.getElementById('wordSpacing').value = 0;
            document.getElementById('wordSpacingValue').textContent = '0px';

            // Apply defaults to the current tab
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0]) {
                    // Reset font
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleFont',
                        enabled: false
                    });

                    // Reset theme
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'applyTheme',
                        theme: 'default'
                    });

                    // Reset spacing
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'adjustSpacing',
                        lineSpacing: 1.5,
                        letterSpacing: 0,
                        wordSpacing: 0
                    });
                }
            });

            // Show confirmation message
            const statusMessage = document.createElement('div');
            statusMessage.textContent = 'Settings have been reset to defaults.';
            statusMessage.style.color = '#1877f2';
            statusMessage.style.marginTop = '10px';
            statusMessage.style.textAlign = 'center';
            statusMessage.style.padding = '8px';
            statusMessage.style.borderRadius = '8px';
            statusMessage.style.backgroundColor = 'rgba(24, 119, 242, 0.1)';
            document.querySelector('.container').appendChild(statusMessage);
            setTimeout(() => statusMessage.remove(), 3000);
        });
    });

    // Settings navigation
    const settingsButton = document.querySelector('.settings-button');
    const backButton = document.querySelector('.back-button');
    const mainContent = document.getElementById('mainContent');
    const settingsPage = document.getElementById('settingsPage');

    settingsButton.addEventListener('click', function() {
        mainContent.style.display = 'none';
        settingsPage.style.display = 'block';
    });

    backButton.addEventListener('click', function() {
        settingsPage.style.display = 'none';
        mainContent.style.display = 'block';
    });

    // Handle optimize help icon
    const helpIconOptimize = document.getElementById('helpIconOptimize');
    const optimizeGuide = document.getElementById('optimizeGuide');
    
    if (helpIconOptimize && optimizeGuide) {
        helpIconOptimize.addEventListener('click', function() {
            optimizeGuide.classList.toggle('expanded');
            const expanded = optimizeGuide.classList.contains('expanded');
            helpIconOptimize.setAttribute('aria-expanded', expanded.toString());
        });
    }

    // OpenDyslexic font toggle handler
    const fontToggle = document.getElementById('fontToggle');
    
    // Request current font state when popup opens
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && /^https?:/.test(tabs[0].url)) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getFontState' }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error("Could not get font state:", chrome.runtime.lastError.message);
                    fontToggle.checked = false; // Default to unchecked
                } else if (response && response.fontEnabled !== undefined) {
                    fontToggle.checked = response.fontEnabled;
                }
            });
        } else {
            console.warn("Active tab is not a valid web page. Cannot get font state.");
            fontToggle.checked = false; // Default to unchecked
        }
    });

    fontToggle.addEventListener('change', function(e) {
        const enabled = e.target.checked;
        
        // Save preference
        chrome.storage.sync.set({ fontEnabled: enabled });
        
        // Apply to current tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && /^https?:/.test(tabs[0].url)) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleFont',
                    enabled: enabled
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('Could not toggle font:', chrome.runtime.lastError.message);
                    }
                });
            } else {
                console.warn("Active tab is not a valid web page. Cannot toggle font.");
            }
        });
    });

    // Spacing adjustment handlers
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function applySpacingAdjustments() {
        const lineSpacing = document.getElementById('lineSpacing').value;
        const letterSpacing = document.getElementById('letterSpacing').value;
        const wordSpacing = document.getElementById('wordSpacing').value;

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && /^https?:/.test(tabs[0].url)) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'adjustSpacing',
                    lineSpacing: lineSpacing,
                    letterSpacing: letterSpacing,
                    wordSpacing: wordSpacing
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('Could not adjust spacing:', chrome.runtime.lastError.message);
                    }
                });
            } else {
                console.warn("Active tab is not a valid web page. Cannot adjust spacing.");
            }
        });
    }

    const debouncedApplySpacing = debounce(applySpacingAdjustments, 100);

    // Define a debounced function to save settings and apply spacing
    const debouncedSaveAndApplySpacing = debounce(function() {
        const lineSpacing = document.getElementById('lineSpacing').value;
        const letterSpacing = document.getElementById('letterSpacing').value;
        const wordSpacing = document.getElementById('wordSpacing').value;

        // Save the current values to storage
        chrome.storage.sync.set({
            lineSpacing: lineSpacing,
            letterSpacing: letterSpacing,
            wordSpacing: wordSpacing
        });

        // Apply the spacing adjustments
        applySpacingAdjustments();
    }, 200);

    // Line Spacing Slider
    document.getElementById('lineSpacing').addEventListener('input', function(e) {
        const value = e.target.value;
        document.getElementById('lineSpacingValue').textContent = value;
        debouncedSaveAndApplySpacing();
    });

    // Letter Spacing Slider
    document.getElementById('letterSpacing').addEventListener('input', function(e) {
        const value = e.target.value;
        document.getElementById('letterSpacingValue').textContent = value + 'px';
        debouncedSaveAndApplySpacing();
    });

    // Word Spacing Slider
    document.getElementById('wordSpacing').addEventListener('input', function(e) {
        const value = e.target.value;
        document.getElementById('wordSpacingValue').textContent = value + 'px';
        debouncedSaveAndApplySpacing();
    });

    // Theme Selector Handler
    document.getElementById('themeSelector').addEventListener('change', function(e) {
        const selectedTheme = e.target.value;
        
        // Save the selected theme
        chrome.storage.sync.set({ selectedTheme: selectedTheme });
        
        // Send message to content script to apply the theme
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'applyTheme',
                theme: selectedTheme
            });
        });
    });

    // Apply initial spacing and theme
    debouncedApplySpacing();
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && /^https?:/.test(tabs[0].url)) {
            chrome.storage.sync.get(['selectedTheme'], function(result) {
                const selectedTheme = result.selectedTheme || 'default';
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'applyTheme',
                    theme: selectedTheme
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('Could not apply theme:', chrome.runtime.lastError.message);
                    }
                });
            });
        } else {
            console.warn("Active tab is not a valid web page. Cannot apply theme.");
        }
    });

    // Add a restore button
    const restoreButton = document.createElement('button');
    restoreButton.id = 'restore-button';
    restoreButton.className = 'action-button';
    restoreButton.textContent = 'Restore Original';
    restoreButton.style.marginTop = '10px';
    
    // Function to handle restore action
    function handleRestore(buttonElement) {
        // Update button state to show loading with animation
        const isIconButton = buttonElement.id === 'restore-icon-button';
        const originalText = isIconButton ? '' : buttonElement.textContent;
        const originalHTML = isIconButton ? buttonElement.innerHTML : '';
        
        if (isIconButton) {
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            animateTextReplacement(buttonElement, 'Restoring...');
        }
        buttonElement.disabled = true;
        
        // Send message to content script to restore original content
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "restoreOriginalContent"}, function(response) {
                    // Reset button state with animation
                    setTimeout(() => {
                        if (isIconButton) {
                            buttonElement.innerHTML = originalHTML;
                        } else {
                            animateTextReplacement(buttonElement, originalText);
                        }
                        buttonElement.disabled = false;
                    }, 500);
                    
                    if (response && response.success) {
                        console.log('Content restored successfully');
                        // Show success message
                        showNotification('Original content restored!', 'success');
                    } else {
                        console.error('Error restoring content:', response ? response.error : 'No response');
                        // Show error message
                        showNotification(response && response.error ? response.error : 'No content to restore', 'error');
                    }
                });
            }
        });
    }
    
    // Add click event listener to the original restore button
    restoreButton.addEventListener('click', function() {
        handleRestore(this);
    });
    
    // Add click event listener to the restore icon button in the header
    document.getElementById('restore-icon-button').addEventListener('click', function() {
        handleRestore(this);
    });
    
    // Add the restore button to the popup
    document.getElementById('actionButtons').appendChild(restoreButton);
    
    // Function to show notifications
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = 'notification ' + type;
        notification.textContent = message;
        notification.style.backgroundColor = type === 'success' ? 'rgba(24, 119, 242, 0.1)' : 'rgba(255, 0, 0, 0.1)';
        notification.style.color = type === 'success' ? '#1877f2' : '#e41e3f';
        notification.style.padding = '8px 12px';
        notification.style.borderRadius = '8px';
        notification.style.marginTop = '10px';
        notification.style.textAlign = 'center';
        
        document.getElementById('actionButtons').appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});