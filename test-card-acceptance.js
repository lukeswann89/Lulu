// Test script for suggestion card acceptance
// Run this in browser console after loading suggestions

console.log("🧪 Testing Suggestion Card Acceptance");

// Test function to simulate card acceptance
function testCardAcceptance() {
  console.log("\n📋 Testing Card Accept Button Functionality");
  
  // 1. Check if we have suggestions in state
  if (window.LULU_DEBUG && window.LULU_DEBUG.getSpecificEdits) {
    const suggestions = window.LULU_DEBUG.getSpecificEdits();
    console.log(`📊 Found ${suggestions.length} suggestions in state`);
    
    if (suggestions.length === 0) {
      console.log("❌ No suggestions to test. Please submit some text for editing first.");
      return;
    }
    
    // 2. Check if we have highlights in DOM
    const highlights = document.querySelectorAll('.suggestion-highlight');
    console.log(`📊 Found ${highlights.length} highlights in DOM`);
    
    if (highlights.length === 0) {
      console.log("❌ No highlights in DOM. Make sure you're in 'Specific Edits' mode with highlights enabled.");
      return;
    }
    
    // 3. Test the acceptSpecific function directly
    const firstSuggestion = suggestions[0];
    console.log(`🎯 Testing acceptance of suggestion: "${firstSuggestion.original?.substring(0, 50)}..."`);
    console.log(`   Suggestion ID: ${firstSuggestion.id}`);
    
    // 4. Count highlights before
    const highlightsBefore = highlights.length;
    console.log(`📊 Highlights before acceptance: ${highlightsBefore}`);
    
    // 5. Try to find the accept button and click it
    const acceptButtons = document.querySelectorAll('button');
    let acceptButton = null;
    
    for (let button of acceptButtons) {
      if (button.textContent.includes('Accept') || button.textContent.includes('✓')) {
        acceptButton = button;
        break;
      }
    }
    
    if (acceptButton) {
      console.log("🎯 Found Accept button, clicking it...");
      acceptButton.click();
      
      // 6. Check results after a delay
      setTimeout(() => {
        const highlightsAfter = document.querySelectorAll('.suggestion-highlight').length;
        console.log(`📊 Highlights after acceptance: ${highlightsAfter}`);
        
        if (highlightsAfter < highlightsBefore) {
          console.log("✅ SUCCESS! Card acceptance worked - highlight was removed");
        } else {
          console.log("❌ FAILED! Card acceptance didn't work - highlight still there");
        }
        
        // Check the suggestion state
        const updatedSuggestions = window.LULU_DEBUG.getSpecificEdits();
        const updatedSuggestion = updatedSuggestions.find(s => s.id === firstSuggestion.id);
        if (updatedSuggestion && updatedSuggestion.state === 'accepted') {
          console.log("✅ SUCCESS! Suggestion state updated to 'accepted'");
        } else {
          console.log("❌ FAILED! Suggestion state not updated properly");
        }
      }, 500);
      
    } else {
      console.log("❌ Could not find Accept button. Make sure suggestion cards are visible.");
    }
    
  } else {
    console.log("❌ LULU_DEBUG not available. Make sure the page is fully loaded.");
  }
}

// Test function to compare with highlight clicking
function testHighlightVsCardAcceptance() {
  console.log("\n📋 Comparing Highlight Click vs Card Accept");
  
  const highlights = document.querySelectorAll('.suggestion-highlight');
  if (highlights.length < 2) {
    console.log("❌ Need at least 2 suggestions to compare. Load demo suggestions first.");
    return;
  }
  
  console.log("🎯 Test 1: Clicking highlight directly");
  const firstHighlight = highlights[0];
  const firstText = firstHighlight.textContent;
  console.log(`   Clicking: "${firstText.substring(0, 50)}..."`);
  firstHighlight.click();
  
  setTimeout(() => {
    const remainingHighlights = document.querySelectorAll('.suggestion-highlight');
    console.log(`   Result: ${highlights.length - remainingHighlights.length} highlight(s) removed`);
    
    if (remainingHighlights.length > 0) {
      console.log("\n🎯 Test 2: Using card accept button");
      // Try to find and click an accept button
      testCardAcceptance();
    }
  }, 500);
}

// Export for console use
window.testCardAcceptance = {
  testCardAcceptance,
  testHighlightVsCardAcceptance
};

console.log("📝 Card acceptance test loaded. Run window.testCardAcceptance.testCardAcceptance() to test."); 