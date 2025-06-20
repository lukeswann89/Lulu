// Test utility for Creative Analysis API
// Run this to test the API before integration

export async function testCreativeAnalysis() {
  const testCases = [
    {
      name: "Character-Driven Response",
      message: "I keep thinking about this character - she's a former astronaut who's lost her sense of wonder. She's been back on Earth for three years and everything feels flat. I think her journey is about rediscovering what makes life magical, maybe through helping someone else find their own wonder.",
      chatHistory: [
        { sender: 'user', message: 'I want to write about someone who feels disconnected from life' },
        { sender: 'ai', message: 'That sounds like a powerful emotional starting point. What kind of person might feel this way?' }
      ],
      userProfile: { name: 'Alex', writerType: 'explorer' }
    },
    {
      name: "Plot-Driven Response", 
      message: "The story starts with a mysterious package arriving at the protagonist's door. Inside is a map to a hidden location, but the map is incomplete. The protagonist must solve a series of puzzles to find the missing pieces, each puzzle revealing more about their own past they didn't know existed.",
      chatHistory: [
        { sender: 'user', message: 'I want to write a mystery thriller' },
        { sender: 'ai', message: 'Great! What kind of mystery are you thinking about?' }
      ],
      userProfile: { name: 'Sam', writerType: 'planner' }
    },
    {
      name: "Theme-Driven Response",
      message: "I'm exploring the idea of how technology is changing what it means to be human. The story revolves around a world where people can upload their consciousness, but the protagonist discovers that something essential is lost in the process. It's really about the soul and whether it can exist in digital form.",
      chatHistory: [
        { sender: 'user', message: 'I want to write about technology and humanity' },
        { sender: 'ai', message: 'That\'s a fascinating theme. What aspect interests you most?' }
      ],
      userProfile: { name: 'Jordan', writerType: 'explorer' }
    },
    {
      name: "World-Building Response",
      message: "The world is a floating archipelago of islands connected by bridges made of light. Each island represents a different emotion or memory, and the bridges are formed by the connections between people. The protagonist can see these connections and must navigate the emotional landscape to find someone who's lost in their own memories.",
      chatHistory: [
        { sender: 'user', message: 'I want to create a unique fantasy world' },
        { sender: 'ai', message: 'What kind of world are you imagining?' }
      ],
      userProfile: { name: 'Casey', writerType: 'planner' }
    }
  ];

  console.log('🧠 Testing Creative Analysis API...\n');

  // Helper function to add a delay
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`Message: "${testCase.message.substring(0, 100)}..."`);
    
    try {
      const response = await fetch('/api/creative-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCase.message,
          chatHistory: testCase.chatHistory,
          userProfile: testCase.userProfile
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Analysis successful!');
        console.log(`   Creative Style: ${result.insights.creativeStyle}`);
        console.log(`   Cognitive State: ${result.insights.cognitiveState}`);
        console.log(`   Dominant Patterns: ${result.insights.dominantPatterns.join(', ')}`);
        console.log(`   Story Elements:`, result.insights.storyElements);
        
        if (result.insights.canvasUpdates.character) {
          console.log(`   Canvas Suggestion (Character): ${result.insights.canvasUpdates.character.substring(0, 80)}...`);
        }
        
        console.log(`   Signature Insights:`, result.insights.signatureInsights);
      } else {
        console.log('❌ Analysis failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
    
    console.log('\n' + '─'.repeat(80) + '\n');
    await delay(1000); // Add a 1-second delay to prevent dev server issues
  }
}

// Function to test with a single message
export async function testSingleMessage(message, chatHistory = [], userProfile = {}) {
  try {
    const response = await fetch('/api/creative-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, chatHistory, userProfile })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Quick test function for browser console
export function quickTest() {
  const testMessage = "I'm thinking about a character who discovers they can see people's memories as colors floating around them. This ability makes them both powerful and isolated, because they can't help but see the pain and joy in everyone around them.";
  
  testSingleMessage(testMessage, [], { name: 'Test User', writerType: 'explorer' })
    .then(result => {
      console.log('Quick Test Result:', result);
    });
} 