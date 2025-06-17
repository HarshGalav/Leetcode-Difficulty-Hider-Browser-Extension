// Popup script for LeetCode Difficulty Hider

document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a LeetCode page
    if (!tab.url.includes('leetcode.com')) {
      status.textContent = 'Not on LeetCode - navigate to leetcode.com';
      status.className = 'status disabled';
      toggleSwitch.style.opacity = '0.5';
      toggleSwitch.style.pointerEvents = 'none';
      return;
    }
    
    // Get current state from storage first
    const result = await chrome.storage.sync.get(['difficultyHiderEnabled']);
    let enabled = result.difficultyHiderEnabled !== false;
    updateUI(enabled);
    
    // Try to get state from content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getState' });
      if (response && typeof response.enabled === 'boolean') {
        enabled = response.enabled;
        updateUI(enabled);
      }
    } catch (error) {
      console.log('Content script not ready, using storage state');
    }
    
    // Handle toggle click
    toggleSwitch.addEventListener('click', async () => {
      try {
        // Try to communicate with content script first
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
        if (response && typeof response.enabled === 'boolean') {
          updateUI(response.enabled);
          return;
        }
      } catch (error) {
        console.log('Content script communication failed, using fallback');
      }
      
      // Fallback: update storage directly and reload page
      const currentResult = await chrome.storage.sync.get(['difficultyHiderEnabled']);
      const currentState = currentResult.difficultyHiderEnabled !== false;
      const newState = !currentState;
      
      await chrome.storage.sync.set({ difficultyHiderEnabled: newState });
      updateUI(newState);
      
      // Show temporary message
      const originalText = status.textContent;
      status.textContent = 'Reloading page to apply changes...';
      
      // Reload the page
      setTimeout(() => {
        chrome.tabs.reload(tab.id);
        window.close(); // Close popup
      }, 500);
    });
    
  } catch (error) {
    console.error('Error in popup script:', error);
    status.textContent = 'Error loading extension';
    status.className = 'status disabled';
  }
  
  function updateUI(enabled) {
    if (enabled) {
      toggleSwitch.classList.add('active');
      status.textContent = '✅ Difficulties are hidden';
      status.className = 'status enabled';
    } else {
      toggleSwitch.classList.remove('active');
      status.textContent = '❌ Difficulties are visible';
      status.className = 'status disabled';
    }
  }
});