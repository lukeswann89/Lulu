# ProseMirror Integration Testing Instructions

## Prerequisites
- Application running on http://localhost:3001
- Browser with developer console open

## Test Sequence

### Phase 1: Basic ProseMirror Functionality

1. **Open the application** at http://localhost:3001
2. **Switch to Edit Mode** (if in Write mode)
3. **Add some text** to the editor (copy the sample text from prosemirror-test.js if needed)
4. **Switch to "Specific Edits" mode** in the dropdown
5. **Open browser console** (F12)

### Phase 2: Test Demo Suggestions (Same as Test Page)

1. **Load the test script**:
   ```javascript
   // Copy and paste the contents of test-prosemirror-integration.js into console
   ```

2. **Run initialization test**:
   ```javascript
   window.testProseMirror.testProseMirrorInitialization()
   ```
   **Expected**: ✅ All three items should be available (window.view, window.managerRef, window.LULU_DEBUG)

3. **Load demo suggestions**:
   ```javascript
   window.testProseMirror.testLoadDemoSuggestions()
   ```
   **Expected**: ✅ Should see highlights appear in the editor

4. **Test highlight clicking**:
   ```javascript
   window.testProseMirror.testHighlightClicking()
   ```
   **Expected**: ✅ Clicking a highlight should remove it and replace the text

### Phase 3: Test UI Button Integration

1. **Test the "Load Demo" button** in the UI (should appear when in Specific Edits mode)
   **Expected**: ✅ Should load demo suggestions and show highlights

2. **Test the "Clear All" button** in the UI
   **Expected**: ✅ Should remove all highlights

### Phase 4: Test Real Suggestions

1. **Submit text for editing**:
   - Add some text to the editor
   - Click "Submit to Lulu"
   - Wait for suggestions to load

2. **Verify highlights appear**:
   - Should see yellow highlights in the text
   - Should see suggestion count indicator

3. **Test highlight clicking**:
   - Click on a highlight directly
   - **Expected**: ✅ Text should change and highlight should disappear

### Phase 5: Test Card Acceptance (The Critical Test)

1. **Load the card test script**:
   ```javascript
   // Copy and paste the contents of test-card-acceptance.js into console
   ```

2. **Test card acceptance**:
   ```javascript
   window.testCardAcceptance.testCardAcceptance()
   ```
   **Expected**: ✅ Should find and click an Accept button, remove highlight, and update suggestion state

3. **Compare methods**:
   ```javascript
   window.testCardAcceptance.testHighlightVsCardAcceptance()
   ```
   **Expected**: ✅ Both highlight clicking and card acceptance should work identically

## Success Criteria

### ✅ PASS Conditions:
1. ProseMirror initializes correctly (window objects available)
2. Demo suggestions load and create highlights
3. Clicking highlights removes them and changes text
4. UI buttons work (Load Demo, Clear All)
5. Real suggestions from API create highlights
6. **CRITICAL**: Card "Accept" buttons work exactly like clicking highlights

### ❌ FAIL Conditions:
1. ProseMirror doesn't initialize (missing window objects)
2. No highlights appear when loading suggestions
3. Clicking highlights doesn't work
4. Card "Accept" buttons don't work
5. Console errors during any test

## Debugging

If tests fail, check:

1. **Console errors**: Look for any JavaScript errors
2. **Network tab**: Check if API calls are working
3. **Elements tab**: Verify highlights have correct classes and data attributes
4. **React state**: Use `window.LULU_DEBUG.getSpecificEdits()` to check suggestion state

## Expected Console Output (Success)

```
🧪 Testing ProseMirror Integration
✅ ProseMirror editor initialized in index.js
✅ window.view is available: object
✅ window.managerRef is available: object
✅ window.LULU_DEBUG is available: ['getSpecificEdits', 'getProseMirrorView', 'acceptSuggestion']
✅ Demo suggestions loaded successfully
✅ Found X highlights in DOM
✅ Highlight click worked - suggestion was accepted and removed
✅ SUCCESS! Card acceptance worked - highlight was removed
✅ SUCCESS! Suggestion state updated to 'accepted'
```

## Comparison with Test Page

The main page should now work **exactly** like `/prosemirror-test`:
- Same ProseMirror initialization
- Same suggestion loading via SuggestionManager
- Same highlight clicking behavior
- **NEW**: Card acceptance that triggers the same highlight click behavior 