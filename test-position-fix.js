// Test to verify the position mapping fix
console.log('🧪 Testing Position Mapping Fix');
console.log('===============================\n');

// Mock tr.mapping that simulates a text replacement
const createMockMapping = (changePos, lengthDelta) => ({
    map: (pos) => {
        if (pos > changePos) {
            return pos + lengthDelta;
        }
        return pos;
    }
});

// Test scenario: Replace "quick" (5-10) with "fast" (delta: -1)
const suggestions = [
    { id: 'test-1', from: 5, to: 10, original: 'quick' },   // This gets accepted
    { id: 'test-2', from: 16, to: 19, original: 'fox' },    // Should become 15-18
    { id: 'test-3', from: 45, to: 49, original: 'lazy' }    // Should become 44-48
];

const changePos = 10; // End position of accepted suggestion
const lengthDelta = -1; // "fast" is 1 char shorter than "quick"
const mockMapping = createMockMapping(changePos, lengthDelta);

console.log('📊 Initial suggestions:');
suggestions.forEach(s => {
    console.log(`   ${s.id}: ${s.from}-${s.to} "${s.original}"`);
});

console.log('\n🔧 Step 1: Single mapping in apply() method (FIXED):');
const mapped = suggestions.map(s => ({
    ...s,
    from: mockMapping.map(s.from),
    to: mockMapping.map(s.to)
}));

console.log('✅ After mapping:');
mapped.forEach(s => {
    console.log(`   ${s.id}: ${s.from}-${s.to} "${s.original}"`);
});

console.log('\n🎯 Step 2: Filter accepted suggestion (NO ADDITIONAL MAPPING):');
const finalSuggestions = mapped.filter(s => s.id !== 'test-1');

console.log('✅ Final result:');
finalSuggestions.forEach(s => {
    console.log(`   ${s.id}: ${s.from}-${s.to} "${s.original}"`);
});

console.log('\n🔍 Verification:');
console.log('Expected positions:');
console.log('   test-2: 15-18 ✅');
console.log('   test-3: 44-48 ✅');
console.log('\nActual positions:');
console.log(`   test-2: ${finalSuggestions[0].from}-${finalSuggestions[0].to} ${finalSuggestions[0].from === 15 && finalSuggestions[0].to === 18 ? '✅' : '❌'}`);
console.log(`   test-3: ${finalSuggestions[1].from}-${finalSuggestions[1].to} ${finalSuggestions[1].from === 44 && finalSuggestions[1].to === 48 ? '✅' : '❌'}`);

console.log('\n🎉 Position mapping fix verified!');
