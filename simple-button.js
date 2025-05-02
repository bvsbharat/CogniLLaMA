// Simple button for CogniLLaMA
(function() {
  console.log('CogniLLaMA simple-button.js loaded');
  
  // Create a simple button
  function createButton() {
    // Check if button already exists
    if (document.getElementById('cogni-llama-simple-button')) {
      return;
    }
    
    // Create button
    const button = document.createElement('button');
    button.id = 'cogni-llama-simple-button';
    button.textContent = 'CogniLLaMA';
    
    // Style the button
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '2147483647';
    button.style.backgroundColor = '#1877f2';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.padding = '10px 15px';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.fontSize = '14px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    
    // Add hover effect
    button.addEventListener('mouseover', function() {
      this.style.backgroundColor = '#0d6efd';
    });
    
    button.addEventListener('mouseout', function() {
      this.style.backgroundColor = '#1877f2';
    });
    
    // Add click handler to open the popup
    button.addEventListener('click', function() {
      console.log('CogniLLaMA button clicked');
      chrome.runtime.sendMessage({action: 'open_popup'});
    });
    
    // Add to page
    document.body.appendChild(button);
    console.log('CogniLLaMA button added to page');
  }
  
  // Create the button when the page is loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(createButton, 1000); // Delay to ensure page is fully loaded
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(createButton, 1000);
    });
  }
  
  // Also listen for keyboard shortcut
  document.addEventListener('keydown', function(event) {
    console.log('Key pressed:', event.key, 'Meta:', event.metaKey, 'Ctrl:', event.ctrlKey, 'Shift:', event.shiftKey);
    
    // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
      console.log('CogniLLaMA keyboard shortcut detected');
      event.preventDefault();
      event.stopPropagation();
      
      // Send message to open the popup
      chrome.runtime.sendMessage({action: 'open_popup'});
    }
  }, true);
  
  console.log('CogniLLaMA simple-button.js initialized');
})();
