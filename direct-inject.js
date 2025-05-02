// Direct injection script for CogniLLaMA
console.log('CogniLLaMA direct-inject.js loaded');

// Function to create a simple floating button
function createFloatingButton() {
  // Check if button already exists
  if (document.getElementById('cogni-llama-button')) {
    return;
  }
  
  // Create button
  const button = document.createElement('button');
  button.id = 'cogni-llama-button';
  button.textContent = 'CogniLLaMA';
  
  // Style the button
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '9999999',
    backgroundColor: '#1877f2',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    padding: '10px 15px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  });
  
  // Add hover effect
  button.onmouseover = function() {
    this.style.backgroundColor = '#0d6efd';
  };
  button.onmouseout = function() {
    this.style.backgroundColor = '#1877f2';
  };
  
  // Add click handler
  button.onclick = function() {
    // Send message to open the popup
    chrome.runtime.sendMessage({action: 'open_popup'});
  };
  
  // Add to page
  document.body.appendChild(button);
  console.log('CogniLLaMA button added to page');
}

// Create the button when the page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingButton);
} else {
  createFloatingButton();
}

// Listen for keyboard shortcut
document.addEventListener('keydown', function(event) {
  // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
    console.log('CogniLLaMA keyboard shortcut detected');
    event.preventDefault();
    
    // Send message to open the popup
    chrome.runtime.sendMessage({action: 'open_popup'});
  }
}, true);
