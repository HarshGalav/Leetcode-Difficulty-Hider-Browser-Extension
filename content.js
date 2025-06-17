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
    // Immediately apply current state - no delay for first run
    if (this.isEnabled) {
      this.hideDifficulties();
    } else {
      this.showDifficulties();
    }
    
    // Also apply after a short delay for dynamic content
    setTimeout(() => {
      if (this.isEnabled) {
        this.hideDifficulties();
      } else {
        this.showDifficulties();
      }
    }, 100);
    
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
    
    // Force a recheck after toggle
    setTimeout(() => {
      if (this.isEnabled) {
        this.hideDifficulties();
      }
    }, 100);
  }

  hideDifficulties() {
    if (!this.isEnabled) return;
    
    try {
      // Remove any show classes first
      const showElements = document.querySelectorAll('.leetcode-difficulty-show');
      showElements.forEach(el => {
        el.classList.remove('leetcode-difficulty-show');
        el.style.display = '';
        el.style.visibility = '';
      });
      
      // Method 1: Hide exact LeetCode difficulty structure (most specific)
      this.hideExactLeetCodeStructure();
      
      // Method 2: Hide by specific difficulty text in proper context
      this.hideByDifficultyText();
      
      // Method 3: Hide difficulty columns in tables
      this.hideDifficultyColumns();
      
      console.log('Difficulties hidden');
    } catch (error) {
      console.error('Error hiding difficulties:', error);
    }
  }

  hideExactLeetCodeStructure() {
    // Target the exact HTML structure - be very specific
    const exactSelectors = [
      // Direct class matches for difficulty elements
      '.text-sd-easy',
      '.text-sd-medium', 
      '.text-sd-hard',
      
      // More specific matches with context
      'p.text-sd-easy',
      'p.text-sd-medium', 
      'p.text-sd-hard',
      
      // Even more specific - the exact structure from your HTML
      'p.mx-0.text-\\[14px\\].text-sd-easy',
      'p.mx-0.text-\\[14px\\].text-sd-medium', 
      'p.mx-0.text-\\[14px\\].text-sd-hard',
    ];
    
    exactSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // Double-check this is actually a difficulty element
          if (this.isDifficultyElement(el)) {
            el.style.display = 'none';
            el.setAttribute('data-difficulty-hidden', 'true');
            console.log('Hidden exact structure element:', selector, el.textContent);
          }
        });
      } catch (e) {
        console.warn('Could not apply selector:', selector, e);
      }
    });
    
    // Fallback: Find paragraphs with exact difficulty classes
    const allParagraphs = document.querySelectorAll('p');
    allParagraphs.forEach(p => {
      const className = p.className || '';
      if (className.includes('text-sd-easy') || 
          className.includes('text-sd-medium') || 
          className.includes('text-sd-hard')) {
        // Verify this is actually a difficulty element
        if (this.isDifficultyElement(p)) {
          p.style.display = 'none';
          p.setAttribute('data-difficulty-hidden', 'true');
          console.log('Hidden paragraph with difficulty class:', className, p.textContent);
        }
      }
    });
  }

  isDifficultyElement(element) {
    const text = element.textContent.trim().toLowerCase();
    const className = element.className || '';
    
    // Must have sd- difficulty class AND contain only difficulty text
    const hasDifficultyClass = className.includes('text-sd-easy') || 
                              className.includes('text-sd-medium') || 
                              className.includes('text-sd-hard');
    
    const isDifficultyText = text === 'easy' || text === 'medium' || text === 'hard' || text === 'med.';
    
    // Must be a small element (not a large container)
    const isSmallElement = text.length <= 10;
    
    // Additional check: element should be in a problem row context
    const isInProblemContext = this.isInProblemRowContext(element);
    
    return hasDifficultyClass && isDifficultyText && isSmallElement && isInProblemContext;
  }

  isInProblemRowContext(element) {
    // Check if element is within a problem row (table row or similar container)
    let parent = element.parentElement;
    let depth = 0;
    
    while (parent && depth < 10) {
      const tagName = parent.tagName?.toLowerCase();
      const className = parent.className || '';
      
      // Check for table row or similar container structures
      if (tagName === 'tr' || 
          tagName === 'td' ||
          className.includes('row') ||
          className.includes('problem') ||
          parent.querySelector('a[href*="/problems/"]')) {
        return true;
      }
      
      parent = parent.parentElement;
      depth++;
    }
    
    return false;
  }

  hideByDifficultyText() {
    // Find text nodes with difficulty text, but be more selective
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const difficultyTextNodes = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim().toLowerCase();
      if (text === 'easy' || text === 'medium' || text === 'hard' || text === 'med.' ) {
        difficultyTextNodes.push(node);
      }
    }
    
    difficultyTextNodes.forEach(textNode => {
      let element = textNode.parentElement;
      
      // Only hide if it's in a proper difficulty context
      if (element && this.shouldHideDifficultyElement(element, textNode.textContent.trim())) {
        element.style.display = 'none';
        element.setAttribute('data-difficulty-hidden', 'true');
        console.log('Hidden difficulty text element:', element.textContent);
      }
    });
  }

  shouldHideDifficultyElement(element, text) {
    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';
    const textContent = element.textContent.trim();
    
    // Don't hide if it's a large container with lots of text
    if (textContent.length > 15) return false;
    
    // Only hide if it has specific difficulty-related classes OR is in a table cell
    const hasDifficultyClass = className.includes('text-sd-') || 
                              className.includes('difficulty');
    
    const isTableCell = tagName === 'td' || tagName === 'th';
    
    const isSmallSpanOrDiv = (['span', 'div', 'p'].includes(tagName) && 
                             textContent.toLowerCase() === text.toLowerCase());
    
    // Must be in a problem context
    const isInProblemContext = this.isInProblemRowContext(element);
    
    return (hasDifficultyClass || isTableCell || isSmallSpanOrDiv) && isInProblemContext;
  }

  hideDifficultyColumns() {
    // Hide table headers with "Difficulty" text
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

  showDifficulties() {
    // Remove hidden elements by our extension
    const hiddenElements = document.querySelectorAll('[data-difficulty-hidden="true"]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.style.visibility = '';
      el.style.opacity = '';
      el.style.height = '';
      el.style.width = '';
      el.style.margin = '';
      el.style.padding = '';
      el.removeAttribute('data-difficulty-hidden');
    });
    
    // Override CSS hiding by adding show classes
    const cssHiddenElements = document.querySelectorAll('.text-sd-easy, .text-sd-medium, .text-sd-hard');
    cssHiddenElements.forEach(el => {
      el.classList.add('leetcode-difficulty-show');
      // Also set inline styles to override CSS
      el.style.display = 'block';
      el.style.visibility = 'visible';
      
      // For inline elements like spans, use inline display
      if (el.tagName.toLowerCase() === 'span') {
        el.style.display = 'inline';
      }
    });
    
    // Also check for elements with partial classes
    const partialElements = document.querySelectorAll('[class*="text-sd-easy"], [class*="text-sd-medium"], [class*="text-sd-hard"]');
    partialElements.forEach(el => {
      if (!el.classList.contains('leetcode-difficulty-show')) {
        el.classList.add('leetcode-difficulty-show');
        el.style.display = 'block';
        el.style.visibility = 'visible';
        
        if (el.tagName.toLowerCase() === 'span') {
          el.style.display = 'inline';
        }
      }
    });
    
    console.log('Difficulties shown, count:', hiddenElements.length + cssHiddenElements.length);
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
              // Check for difficulty classes specifically
              const className = node.className || '';
              if (className.includes('text-sd-') || 
                  node.querySelector && node.querySelector('[class*="text-sd-"]')) {
                shouldHide = true;
              }
              
              // Also check text content but be more specific
              const text = node.textContent?.toLowerCase() || '';
              if ((text.includes('easy') || text.includes('medium') || text.includes('hard')) || text.includes('med.')&&
                  text.length < 50) { // Only short text snippets
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