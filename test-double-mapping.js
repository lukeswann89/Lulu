// Test to verify double position mapping issue
console.log('🧪 Testing Double Position Mapping Issue');
console.log('==========================================\n');

// Mock tr.mapping that simulates a text replacement
const createMockMapping = (changePos, lengthDelta) => ({
    map: (pos) => {
        console.log(`  Mapping position ${pos}:`);
        if (pos > changePos) {
            const newPos = pos + lengthDelta;
            console.log(`    Position ${pos} → ${newPos} (after change at ${changePos}, delta: ${lengthDelta})`);
            return newPos;
        } else {
            console.log(`    Position ${pos} → ${pos} (before change)`);
            return pos;
        }
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

console.log('\n🔧 Step 1: First mapping in apply() method (CORRECT):');
const firstMapped = suggestions.map(s => ({
    ...s,
    from: mockMapping.map(s.from),
    to: mockMapping.map(s.to)
}));

console.log('\n✅ After first mapping:');
firstMapped.forEach(s => {
    console.log(`   ${s.id}: ${s.from}-${s.to} "${s.original}"`);
});

console.log('\n🚨 Step 2: Second mapping in handleAcceptSuggestion (DOUBLE MAPPING ERROR):');
const filteredAfterAccept = firstMapped.filter(s => s.id !== 'test-1');
const secondMapped = filteredAfterAccept.map(s => ({
    ...s,
    from: mockMapping.map(s.from), // This is mapping already-mapped positions!
    to: mockMapping.map(s.to)
}));

console.log('\n❌ After second mapping (INCORRECT):');
secondMapped.forEach(s => {
    console.log(`   ${s.id}: ${s.from}-${s.to} "${s.original}"`);
});

console.log('\n🔍 Analysis:');
console.log('Expected after accepting test-1:');
console.log('   test-2: 15-18 (correct)');
console.log('   test-3: 44-48 (correct)');
console.log('\nActual with double mapping:');
console.log(`   test-2: ${secondMapped[0].from}-${secondMapped[0].to} (WRONG!)`);
console.log(`   test-3: ${secondMapped[1].from}-${secondMapped[1].to} (WRONG!)`);

console.log('\n🎯 Root Cause: Positions mapped twice in plugin apply method');
console.log('💡 Solution: Remove position mapping from handleAcceptSuggestion');
