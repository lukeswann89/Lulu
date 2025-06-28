// Test script to verify ProseMirror integration
// Run this in browser console after loading the main page

console.log("🧪 Testing ProseMirror Integration");

// Test 1: Check if ProseMirror is initialized
function testProseMirrorInitialization() {
  console.log("\n📋 Test 1: ProseMirror Initialization");
  
  if (window.view) {
    console.log("✅ window.view is available:", typeof window.view);
  } else {
    console.log("❌ window.view is NOT available");
  }
  
  if (window.managerRef) {
    console.log("✅ window.managerRef is available:", typeof window.managerRef);
  } else {
    console.log("❌ window.managerRef is NOT available");
  }
  
  if (window.LULU_DEBUG) {
    console.log("✅ window.LULU_DEBUG is available:", Object.keys(window.LULU_DEBUG));
  } else {
    console.log("❌ window.LULU_DEBUG is NOT available");
  }
}

// Test 2: Load demo suggestions (same as test page)
function testLoadDemoSuggestions() {
  console.log("\n📋 Test 2: Loading Demo Suggestions");
  
  if (window.managerRef && window.managerRef.loadDemoSuggestions) {
    try {
      const result = window.managerRef.loadDemoSuggestions();
      console.log("✅ Demo suggestions loaded successfully:", result);
      
      // Check if highlights are created
      setTimeout(() => {
        const highlights = document.querySelectorAll('.suggestion-highlight');
        console.log(`✅ Found ${highlights.length} highlights in DOM`);
        highlights.forEach((h, i) => {
          console.log(`  Highlight ${i + 1}: "${h.textContent.substring(0, 50)}..."`);
        });
      }, 100);
      
    } catch (error) {
      console.log("❌ Error loading demo suggestions:", error);
    }
  } else {
    console.log("❌ managerRef.loadDemoSuggestions not available");
  }
}

// Test 3: Test highlight clicking (same as test page)
function testHighlightClicking() {
  console.log("\n📋 Test 3: Testing Highlight Clicking");
  
  const highlights = document.querySelectorAll('.suggestion-highlight');
  if (highlights.length > 0) {
    console.log(`✅ Found ${highlights.length} highlights, testing first one...`);
    const firstHighlight = highlights[0];
    const originalText = firstHighlight.textContent;
    console.log(`🎯 Clicking highlight: "${originalText.substring(0, 50)}..."`);
    
    // Click the highlight
    firstHighlight.click();
    
    // Check if it was removed
    setTimeout(() => {
      const remainingHighlights = document.querySelectorAll('.suggestion-highlight');
      if (remainingHighlights.length < highlights.length) {
        console.log("✅ Highlight click worked - suggestion was accepted and removed");
      } else {
        console.log("❌ Highlight click didn't work - suggestion still there");
      }
    }, 100);
    
  } else {
    console.log("❌ No highlights found to test");
  }
}

// Test 4: Clear all suggestions
function testClearAll() {
  console.log("\n📋 Test 4: Testing Clear All");
  
  if (window.view) {
    try {
      // Import the function (it should be available globally)
      if (window.LULU_DEBUG && window.LULU_DEBUG.acceptSuggestion) {
        console.log("✅ Clear function available");
        
        const highlightsBefore = document.querySelectorAll('.suggestion-highlight').length;
        console.log(`📊 Highlights before clear: ${highlightsBefore}`);
        
        // Clear all suggestions
        const clearAllSuggestions = window.view.state.plugins.find(p => p.key.key === 'suggestions');
        if (clearAllSuggestions) {
          const tr = window.view.state.tr;
          tr.setMeta(clearAllSuggestions.key, { type: 'clearAll' });
          window.view.dispatch(tr);
          
          setTimeout(() => {
            const highlightsAfter = document.querySelectorAll('.suggestion-highlight').length;
            console.log(`📊 Highlights after clear: ${highlightsAfter}`);
            
            if (highlightsAfter === 0) {
              console.log("✅ Clear all worked successfully");
            } else {
              console.log("❌ Clear all didn't work completely");
            }
          }, 100);
        }
      } else {
        console.log("❌ Clear function not available");
      }
    } catch (error) {
      console.log("❌ Error during clear all:", error);
    }
  } else {
    console.log("❌ window.view not available for clearing");
  }
}

// Run all tests
function runAllTests() {
  console.log("🚀 Starting ProseMirror Integration Tests");
  console.log("=" * 50);
  
  testProseMirrorInitialization();
  
  setTimeout(() => {
    testLoadDemoSuggestions();
    
    setTimeout(() => {
      testHighlightClicking();
      
      setTimeout(() => {
        testClearAll();
        console.log("\n🏁 All tests completed!");
      }, 1000);
    }, 1000);
  }, 500);
}

// Export for console use
window.testProseMirror = {
  runAllTests,
  testProseMirrorInitialization,
  testLoadDemoSuggestions,
  testHighlightClicking,
  testClearAll
};

console.log("📝 Test functions loaded. Run window.testProseMirror.runAllTests() to start testing.");

console.log("Current text state:", window.LULU_DEBUG?.getSpecificEdits?.());
console.log("Editor content:", window.view?.state?.doc?.textContent);

// ✅ QUICK FIX: Set text after editor is initialized
useEffect(() => {
  if (proseMirrorInitialised && viewRef.current && (!text || text.length < 10)) {
    const sampleText = "The door slowly opened with a creak, and they entered. He reminded Sylvia of Virginia at times, lost in his own world. The sting of the words – locked in – settled on Sylvia inside their granddad's room, her shoulders sunken. \"Your granddaughters are here to see you, Paul,\" Mrs Jenkins said from the door, startling Sylvia. I thought she'd already left.";
    
    console.log("📝 Setting sample text in editor...");
    const doc = createDocFromText(luluSchema, sampleText);
    const tr = viewRef.current.state.tr;
    tr.replaceWith(0, viewRef.current.state.doc.content.size, doc);
    viewRef.current.dispatch(tr);
    setText(sampleText);
  }
}, []); // Only run once

// ✅ QUICK FIX: Set text after editor is initialized
useEffect(() => {
  if (proseMirrorInitialised && viewRef.current && (!text || text.length < 10)) {
    const sampleText = "The door slowly opened with a creak, and they entered. He reminded Sylvia of Virginia at times, lost in his own world. The sting of the words – locked in – settled on Sylvia inside their granddad's room, her shoulders sunken. \"Your granddaughters are here to see you, Paul,\" Mrs Jenkins said from the door, startling Sylvia. I thought she'd already left.";
    
    console.log("📝 Setting sample text in editor...");
    const doc = createDocFromText(luluSchema, sampleText);
    const tr = viewRef.current.state.tr;
    tr.replaceWith(0, viewRef.current.state.doc.content.size, doc);
    viewRef.current.dispatch(tr);
    setText(sampleText);
  }
}, [proseMirrorInitialised, text]);

const [text, setText] = useState("The door slowly opened with a creak, and they entered. He reminded Sylvia of Virginia at times, lost in his own world. The sting of the words – locked in – settled on Sylvia inside their granddad's room, her shoulders sunken. \"Your granddaughters are here to see you, Paul,\" Mrs Jenkins said from the door, startling Sylvia. I thought she'd already left."); 

const handleAcceptSpecific = useCallback((id) => {
  acceptSpecific(id);
}, []); // Remove specificEdits dependency

const [text, setText] = useState("The door slowly opened with a creak, and they entered. He reminded Sylvia of Virginia at times, lost in his own world. The sting of the words – locked in – settled on Sylvia inside their granddad's room, her shoulders sunken. \"Your granddaughters are here to see you, Paul,\" Mrs Jenkins said from the door, startling Sylvia. I thought she'd already left."); 