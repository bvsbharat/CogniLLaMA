// Direct keyboard shortcut handler for CogniLLaMA
console.log('CogniLLaMA keyboard-shortcut.js loaded');

// Function to toggle the slider
function toggleCogniLLaMASlider() {
  console.log('toggleCogniLLaMASlider called from keyboard-shortcut.js');
  
  // Send a message to the slider.js content script
  try {
    chrome.runtime.sendMessage({
      action: 'toggle-slider'
    }, response => {
      console.log('Toggle slider message response:', response);
    });
  } catch (error) {
    console.error('Error sending toggle-slider message:', error);
  }
}

// Listen for the keyboard shortcut (Cmd+Shift+L)
document.addEventListener('keydown', function(event) {
  console.log('Keydown event detected in keyboard-shortcut.js:', 
    event.key, 
    'Meta:', event.metaKey, 
    'Ctrl:', event.ctrlKey, 
    'Shift:', event.shiftKey
  );
  
  // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
    console.log('Keyboard shortcut detected in keyboard-shortcut.js: Cmd/Ctrl+Shift+L');
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle the slider
    toggleCogniLLaMASlider();
    
    // Also try to call the function directly if it exists
    if (window.toggleCogniLLaMASlider) {
      console.log('Calling window.toggleCogniLLaMASlider directly');
      window.toggleCogniLLaMASlider();
    }
  }
}, true); // Use capturing phase to ensure we get the event first

console.log('CogniLLaMA keyboard-shortcut.js initialization complete');
