// Test script to verify Red Line Grammar mute behavior
// This script simulates different phases and focus states to test the mute logic

console.log("🧪 [TEST] Starting Red Line Grammar Mute Behavior Test\n");

// Simulate environment variables
const testCases = [
    {
        name: "Assessment phase, Focus Edit off, Hotfix off",
        env: { NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT: "0" },
        state: { currentPhase: "assessment", isFocusEditActive: false },
        expected: "Grammar should run"
    },
    {
        name: "Substantive phase, Focus Edit off, Hotfix off", 
        env: { NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT: "0" },
        state: { currentPhase: "substantive", isFocusEditActive: false },
        expected: "Grammar should be muted (deep dive)"
    },
    {
        name: "Developmental phase, Focus Edit off, Hotfix off",
        env: { NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT: "0" },
        state: { currentPhase: "developmental", isFocusEditActive: false },
        expected: "Grammar should be muted (deep dive)"
    },
    {
        name: "Structural phase, Focus Edit off, Hotfix off",
        env: { NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT: "0" },
        state: { currentPhase: "structural", isFocusEditActive: false },
        expected: "Grammar should be muted (deep dive)"
    },
    {
        name: "Assessment phase, Focus Edit on, Hotfix off",
        env: { NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT: "0" },
        state: { currentPhase: "assessment", isFocusEditActive: true },
        expected: "Grammar should be muted (focus edit)"
    },
    {
        name: "Assessment phase, Focus Edit off, Hotfix on",
        env: { NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT: "1" },
        state: { currentPhase: "assessment", isFocusEditActive: false },
        expected: "Grammar should run (hotfix allows assessment)"
    },
    {
        name: "Line phase, Focus Edit off, Hotfix on",
        env: { NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT: "1" },
        state: { currentPhase: "line", isFocusEditActive: false },
        expected: "Grammar should be muted (hotfix strict)"
    }
];

// Simulate the mute logic from the implementation
function testMuteLogic(env, state) {
    const SUBSTANTIVE_PHASES = ["substantive", "developmental", "structural"];
    const GRAMMAR_HOTFIX_STRICT = env.NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT === "1";
    const { currentPhase, isFocusEditActive } = state;

    console.log(`🔴 [RED LINE CHECK] Phase: ${currentPhase}, Focus Edit: ${isFocusEditActive}, HotfixStrict: ${GRAMMAR_HOTFIX_STRICT}`);

    // Hotfix strict: only allow grammar in assessment
    if (GRAMMAR_HOTFIX_STRICT && currentPhase !== "assessment") {
        console.log("🔴 [RED LINE] Muted (hotfix strict). No fetch; clearing handled by watcher.");
        return "MUTED_HOTFIX";
    }

    // Clean mute: Deep Dive or Focus Edit
    if (SUBSTANTIVE_PHASES.includes(currentPhase) || isFocusEditActive) {
        console.log("🔴 [RED LINE] Muted (deep dive / focus). No fetch; clearing handled by watcher.");
        return "MUTED_CLEAN";
    }

    console.log("🔴 [RED LINE] Running grammar check…");
    return "RUNNING";
}

// Run tests
testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
    console.log(`Expected: ${testCase.expected}`);
    
    const result = testMuteLogic(testCase.env, testCase.state);
    
    let pass = false;
    if (testCase.expected.includes("should run") && result === "RUNNING") pass = true;
    if (testCase.expected.includes("muted") && (result === "MUTED_HOTFIX" || result === "MUTED_CLEAN")) pass = true;
    
    console.log(`Result: ${result} - ${pass ? "✅ PASS" : "❌ FAIL"}`);
});

console.log("\n🧪 [TEST] Red Line Grammar Mute Behavior Test Complete");
