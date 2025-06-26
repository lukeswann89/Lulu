const fetch = require('node-fetch');

async function testMuseAI() {
  try {
    console.log('Testing muse-ai API...');
    
    const response = await fetch('http://localhost:3001/api/muse-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userProfile: { name: 'Test User' },
        currentCanvas: {
          character: { protagonist: '', antagonist: '', supporting: '' },
          plot: { actI: '', actII: '', actIII: '' },
          world: { setting: '', history: '', rules: '' },
          themes: { central: '', symbolism: '', message: '' },
          voice: { tone: '', style: '', pov: '' }
        },
        chatHistory: [],
        newMessage: 'I want to write a story about a detective who discovers magic is real',
        isPinRequest: false
      })
    });

    console.log('Response status:', response.status);
    
    const text = await response.text();
    console.log('Response body:', text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log('Parsed response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMuseAI(); 