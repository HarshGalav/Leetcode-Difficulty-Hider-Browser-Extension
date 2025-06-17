// LeetCode Difficulty Hider Content Script

class DifficultyHider {
  constructor() {
    this.isEnabled = true;
    this.observer = null;
    this.hideTimeout = null;
    this.init();
  }

  async init() {
    try {
      // Load saved state
      const result = await chrome.storage.sync.get(['difficultyHiderEnabled']);
      this.isEnabled = result.difficultyHiderEnabled !== false;
      
      console.log('LeetCode Difficulty Hider initialized, enabled:', this.isEnabled);
      
      // Wait for page to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.start());
      } else {
        this.start();
      }
      
      // Listen for messages from popup
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Received message:', message);
        
        if (message.action === 'toggle') {
          this.toggle();
          sendResponse({ enabled: this.isEnabled });
        } else if (message.action === 'getState') {
          sendResponse({ enabled: this.isEnabled });
        }
        return true; // Keep message channel open
      });
      
    } catch (error) {
      console.error('Error initializing DifficultyHider:', error);
    }
  }

  start() {
    // Initial hide
    setTimeout(() => this.hideDifficulties(), 500);
    
    // Setup observer for dynamic content
    this.setupObserver();
    
    // Periodic check for new content
    setInterval(() => {
      if (this.isEnabled) {
        this.hideDifficulties();
      }
    }, 2000);
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    chrome.storage.sync.set({ difficultyHiderEnabled: this.isEnabled });
    console.log('Toggled difficulty hider:', this.isEnabled);
    
    if (this.isEnabled) {
      this.hideDifficulties();
    } else {
      this.showDifficulties();
    }
  }

  hideDifficulties() {
    if (!this.isEnabled) return;
    
    try {
      // Method 1: Hide by specific LeetCode classes (most important)
      this.hideByColorClasses();
      
      // Method 2: Hide by common difficulty text
      this.hideByText();
      
      // Method 3: Hide difficulty columns in tables
      this.hideDifficultyColumns();
      
      // Method 4: Advanced selectors for current LeetCode structure
      this.hideWithAdvancedSelectors();
      
      // Method 5: Direct targeting of the exact structure you found
      this.hideExactLeetCodeStructure();
      
      console.log('Difficulties hidden');
    } catch (error) {
      console.error('Error hiding difficulties:', error);
    }
  }

  hideExactLeetCodeStructure() {
    // Target the exact HTML structure you provided
    const exactSelectors = [
      // Direct class matches
      '.text-sd-easy',
      '.text-sd-medium', 
      '.text-sd-hard',
      
      // More specific matches
      'p.mx-0.text-\\[14px\\].text-sd-easy',
      'p.mx-0.text-\\[14px\\].text-sd-medium', 
      'p.mx-0.text-\\[14px\\].text-sd-hard',
      
      // Attribute-based selection (safer for dynamic classes)
      'p[class*="text-sd-easy"]',
      'p[class*="text-sd-medium"]',
      'p[class*="text-sd-hard"]',
      'p[class*="text-sd-"]'
    ];
    
    exactSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.style.display = 'none';
          el.setAttribute('data-difficulty-hidden', 'true');
          console.log('Hidden exact structure element:', selector, el.textContent);
        });
      } catch (e) {
        console.warn('Could not apply selector:', selector, e);
      }
    });
    
    // Fallback: Find any p element with these exact classes
    const allParagraphs = document.querySelectorAll('p');
    allParagraphs.forEach(p => {
      const className = p.className || '';
      if (className.includes('text-sd-easy') || 
          className.includes('text-sd-medium') || 
          className.includes('text-sd-hard')) {
        p.style.display = 'none';
        p.setAttribute('data-difficulty-hidden', 'true');
        console.log('Hidden paragraph with difficulty class:', className, p.textContent);
      }
    });
  }

  hideByText() {
    // Find all elements containing difficulty text
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim().toLowerCase();
      if (text === 'easy' || text === 'medium' || text === 'hard') {
        textNodes.push(node);
      }
    }
    
    textNodes.forEach(textNode => {
      let element = textNode.parentElement;
      // Go up the DOM to find the containing element
      while (element && element !== document.body) {
        if (this.shouldHideElement(element, textNode.textContent.trim())) {
          element.style.display = 'none';
          element.setAttribute('data-difficulty-hidden', 'true');
          break;
        }
        element = element.parentElement;
      }
    });
  }

  hideByColorClasses() {
    const colorSelectors = [
      // Current LeetCode difficulty classes (from your inspection)
      '.text-sd-easy',
      '.text-sd-medium', 
      '.text-sd-hard',
      // Legacy/backup classes
      '.text-green-s', '.text-green-600', '.text-green-500',
      '.text-yellow', '.text-yellow-600', '.text-yellow-500', '.text-orange-600',
      '.text-red-s', '.text-red-600', '.text-red-500', '.text-pink-600',
      // Tailwind variants
      '.text-olive', '.text-orange', '.text-pink'
    ];
    
    colorSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
        el.setAttribute('data-difficulty-hidden', 'true');
        console.log('Hidden element with selector:', selector, el);
      });
    });
  }

  hideDifficultyColumns() {
    // Hide table headers
    const headers = document.querySelectorAll('th, [role="columnheader"]');
    headers.forEach(header => {
      const text = header.textContent.trim().toLowerCase();
      if (text === 'difficulty') {
        header.style.display = 'none';
        header.setAttribute('data-difficulty-hidden', 'true');
        
        // Hide corresponding column cells
        const headerIndex = Array.from(header.parentElement.children).indexOf(header);
        const table = header.closest('table') || header.closest('[role="table"]');
        if (table) {
          const rows = table.querySelectorAll('tr, [role="row"]');
          rows.forEach(row => {
            const cell = row.children[headerIndex];
            if (cell) {
              cell.style.display = 'none';
              cell.setAttribute('data-difficulty-hidden', 'true');
            }
          });
        }
      }
    });
  }

  hideWithAdvancedSelectors() {
    // Specific LeetCode selectors based on your inspection
    const leetcodeSelectors = [
      // Current LeetCode structure - exact matches from your inspection
      'p.text-sd-easy',
      'p.text-sd-medium', 
      'p.text-sd-hard',
      'p[class*="text-sd-"]',
      
      // General patterns for the structure you found
      'p[class*="text-[14px]"][class*="text-sd-"]',
      'p.mx-0[class*="text-sd-"]',
      
      // Backup selectors
      'td:nth-child(5)', // Often the 5th column is difficulty
      'td:nth-child(4)', // Sometimes 4th column
      '[role="cell"]:nth-child(5)',
      '[role="cell"]:nth-child(4)',
      
      // Elements with difficulty-related attributes
      'span[class*="difficulty"]',
      'div[class*="difficulty"]',
      'p[class*="difficulty"]',
      
      // Elements with specific text content patterns
      'span[title="Easy"]', 'span[title="Medium"]', 'span[title="Hard"]',
      'div[title="Easy"]', 'div[title="Medium"]', 'div[title="Hard"]',
      'p[title="Easy"]', 'p[title="Medium"]', 'p[title="Hard"]'
    ];
    
    leetcodeSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent.trim().toLowerCase();
          const className = el.className || '';
          
          // Hide if it contains sd- classes or difficulty text
          if (className.includes('text-sd-') || 
              text === 'easy' || text === 'medium' || text === 'hard' || text === 'med.') {
            el.style.display = 'none';
            el.setAttribute('data-difficulty-hidden', 'true');
            console.log('Hidden advanced selector element:', selector, el);
          }
        });
      } catch (e) {
        // Selector might be invalid, continue
      }
    });
  }

  shouldHideElement(element, text) {
    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';
    const textContent = element.textContent.trim();
    
    // Don't hide if it's a large container with lots of text
    if (textContent.length > 50) return false;
    
    // Hide if it's a span, div, or td with just the difficulty text
    if (['span', 'div', 'td', 'th'].includes(tagName) && 
        textContent.toLowerCase() === text.toLowerCase()) {
      return true;
    }
    
    // Hide if it has difficulty-related classes
    if (className.includes('difficulty') || 
        className.includes('text-green') || 
        className.includes('text-yellow') || 
        className.includes('text-red') ||
        className.includes('text-orange') ||
        className.includes('text-pink')) {
      return true;
    }
    
    return false;
  }

  showDifficulties() {
    const hiddenElements = document.querySelectorAll('[data-difficulty-hidden="true"]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-difficulty-hidden');
    });
    console.log('Difficulties shown');
  }

  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;
      
      let shouldHide = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain difficulty-related content
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent?.toLowerCase() || '';
              if (text.includes('easy') || text.includes('medium') || text.includes('hard')) {
                shouldHide = true;
              }
            }
          });
        }
      });
      
      if (shouldHide) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
          this.hideDifficulties();
        }, 300);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }
}

// Initialize the extension
console.log('LeetCode Difficulty Hider content script loaded');

// Wait for page to be ready and initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DifficultyHider();
  });
} else {
  new DifficultyHider();
}