// Enhanced popup script with animations and better UX
document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const toggleContainer = document.getElementById('toggleContainer');
  const status = document.getElementById('status');
  
  try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on a LeetCode page
      if (!tab.url.includes('leetcode.com')) {
          updateStatus('error', '⚠️ Not on LeetCode', 'Navigate to leetcode.com to use this extension');
          toggleContainer.style.opacity = '0.5';
          toggleContainer.style.pointerEvents = 'none';
          return;
      }
      
      // Get current state from storage and show UI immediately
      const result = await chrome.storage.sync.get(['difficultyHiderEnabled']);
      let enabled = result.difficultyHiderEnabled !== false;
      updateUI(enabled);
      
      // Try to communicate with content script with timeout
      let contentScriptReady = false;
      try {
          const response = await Promise.race([
              chrome.tabs.sendMessage(tab.id, { action: 'getState' }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
          ]);
          
          if (response && typeof response.enabled === 'boolean') {
              enabled = response.enabled;
              updateUI(enabled);
              contentScriptReady = true;
          }
      } catch (error) {
          console.log('Content script not ready or timeout, using storage state');
          // Just use storage state - don't show warning
      }
      
      // Handle toggle click with animation
      toggleContainer.addEventListener('click', async () => {
          // Add click animation
          toggleContainer.style.transform = 'scale(0.95)';
          setTimeout(() => {
              toggleContainer.style.transform = '';
          }, 150);

          updateStatus('loading', 'Toggling...', 'Please wait');
          
          if (contentScriptReady) {
              try {
                  // Try to communicate with content script
                  const response = await Promise.race([
                      chrome.tabs.sendMessage(tab.id, { action: 'toggle' }),
                      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
                  ]);
                  
                  if (response && typeof response.enabled === 'boolean') {
                      updateUI(response.enabled);
                      return;
                  }
              } catch (error) {
                  console.log('Content script communication failed, using fallback');
              }
          }
          
          // Fallback: update storage directly and optionally reload page
          const currentResult = await chrome.storage.sync.get(['difficultyHiderEnabled']);
          const currentState = currentResult.difficultyHiderEnabled !== false;
          const newState = !currentState;
          
          await chrome.storage.sync.set({ difficultyHiderEnabled: newState });
          updateUI(newState);
          
          if (!contentScriptReady) {
              // Show reloading message with countdown only if content script isn't ready
              let countdown = 2;
              updateStatus('loading', `🔄 Reloading in ${countdown + 1}s`, 'Applying changes...');
              
              const countdownInterval = setInterval(() => {
                  updateStatus('loading', `🔄 Reloading in ${countdown}s`, 'Applying changes...');
                  countdown--;
                  if (countdown < 0) {
                      clearInterval(countdownInterval);
                      chrome.tabs.reload(tab.id);
                      window.close();
                  }
              }, 1000);
          }
      });
      
  } catch (error) {
      console.error('Error in popup script:', error);
      updateStatus('error', '❌ Extension Error', 'Failed to load extension properly');
      toggleContainer.style.opacity = '0.5';
      toggleContainer.style.pointerEvents = 'none';
  }
  
  function updateUI(enabled) {
      if (enabled) {
          toggleSwitch.classList.add('active');
          toggleContainer.classList.add('active');
          updateStatus('enabled', '✅ Difficulties Hidden', 'Problems will appear without difficulty labels');
      } else {
          toggleSwitch.classList.remove('active');
          toggleContainer.classList.remove('active');
          updateStatus('disabled', '👁️ Difficulties Visible', 'Problem difficulties are currently shown');
      }
  }

  function updateStatus(type, title, description) {
      status.className = `status ${type}`;
      if (type === 'loading') {
          status.innerHTML = `<span class="spinner"></span>${title}`;
      } else {
          status.innerHTML = `<div style="font-weight: 600; margin-bottom: 4px;">${title}</div><div style="font-size: 12px; opacity: 0.9;">${description}</div>`;
      }
      
      // Trigger shine effect
      status.style.position = 'relative';
      setTimeout(() => {
          const before = status.querySelector('::before');
          if (before) {
              before.style.left = '100%';
          }
      }, 100);
  }
});