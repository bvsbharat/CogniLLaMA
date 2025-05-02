// Save API key
document.getElementById('saveApiKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    
    if (!apiKey) {
        apiKeyStatus.textContent = 'Please enter a valid API key';
        apiKeyStatus.className = 'status error';
        apiKeyStatus.style.display = 'block';
        return;
    }
    
    chrome.storage.sync.set({
        togetherApiKey: apiKey
    }, function() {
        apiKeyStatus.textContent = 'API key saved successfully';
        apiKeyStatus.className = 'status success';
        apiKeyStatus.style.display = 'block';
        setTimeout(() => apiKeyStatus.style.display = 'none', 3000);
    });
});

// Save font preference
document.getElementById('useOpenDyslexic').addEventListener('change', function(e) {
    chrome.storage.sync.set({
        useOpenDyslexic: e.target.checked
    }, function() {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved';
        status.className = 'status success';
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 2000);
    });
});

// Load saved preferences
document.addEventListener('DOMContentLoaded', function() {
    // Load API key
    chrome.storage.sync.get(['togetherApiKey'], function(result) {
        if (result.togetherApiKey) {
            document.getElementById('apiKey').value = result.togetherApiKey;
        }
    });
    
    // Load font preference
    chrome.storage.sync.get(['useOpenDyslexic'], function(result) {
        document.getElementById('useOpenDyslexic').checked = result.useOpenDyslexic || false;
    });
});
