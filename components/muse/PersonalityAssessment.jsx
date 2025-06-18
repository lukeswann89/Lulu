import { useState } from 'react';

const BIG_FIVE_QUESTIONS = [
  {
    key: 'openness',
    question: 'How much do you enjoy exploring new ideas and experiences?',
    low: 'I prefer familiar approaches',
    high: 'I love trying new creative methods'
  },
  {
    key: 'conscientiousness',
    question: 'How organized and systematic are you in your approach?',
    low: 'I go with the flow',
    high: 'I plan everything in detail'
  },
  {
    key: 'extraversion',
    question: 'How energized are you by social interaction and external stimulation?',
    low: 'I prefer quiet reflection',
    high: 'I thrive on interaction and energy'
  },
  {
    key: 'agreeableness',
    question: 'How important is harmony and cooperation to you?',
    low: 'I value directness over diplomacy',
    high: 'I prioritize collaboration and understanding'
  },
  {
    key: 'neuroticism',
    question: 'How often do you experience stress or worry about your writing?',
    low: 'I stay calm under pressure',
    high: 'I often feel anxious about my work'
  }
];

const CHARACTER_STRENGTHS = [
  'Creativity', 'Curiosity', 'Judgment', 'Love of Learning', 'Perspective',
  'Bravery', 'Perseverance', 'Honesty', 'Zest', 'Love', 'Kindness',
  'Social Intelligence', 'Teamwork', 'Fairness', 'Leadership', 'Forgiveness',
  'Humility', 'Prudence', 'Self-Regulation', 'Appreciation of Beauty',
  'Gratitude', 'Hope', 'Humor', 'Spirituality'
];

export default function PersonalityAssessment({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0); // 0=name, 1=big5, 2=strengths, 3=writer type, 4=process, 5=story drive
  const [assessmentData, setAssessmentData] = useState({
    name: '',
    bigFive: {
      openness: 5,
      conscientiousness: 5,
      extraversion: 5,
      agreeableness: 5,
      neuroticism: 5
    },
    strengths: [],
    writerType: '',
    processStyle: '',
    storyDrive: ''
  });

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (assessmentData.name.trim()) {
      setCurrentStep(1);
    }
  };

  const handleBigFiveChange = (key, value) => {
    setAssessmentData(prev => ({
      ...prev,
      bigFive: {
        ...prev.bigFive,
        [key]: value
      }
    }));
  };

  const handleStrengthToggle = (strength) => {
    setAssessmentData(prev => {
      const currentStrengths = prev.strengths;
      const isSelected = currentStrengths.includes(strength);
      
      let newStrengths;
      if (isSelected) {
        newStrengths = currentStrengths.filter(s => s !== strength);
      } else if (currentStrengths.length < 5) {
        newStrengths = [...currentStrengths, strength];
      } else {
        return prev; // Don't allow more than 5
      }
      
      return {
        ...prev,
        strengths: newStrengths
      };
    });
  };

  const handleComplete = () => {
    // Generate personality insights
    const insights = generateInsights(assessmentData);
    onComplete({ ...assessmentData, insights });
  };

  const generateInsights = (data) => {
    const { bigFive, writerType, processStyle, storyDrive } = data;
    
    return {
      primaryMode: bigFive.openness > 7 ? 'explorer' : bigFive.conscientiousness > 7 ? 'architect' : 'balanced',
      conversationStyle: bigFive.extraversion > 6 ? 'energetic' : 'reflective',
      structurePreference: bigFive.conscientiousness > 6 ? 'detailed' : 'flexible',
      creativityStyle: bigFive.openness > 6 ? 'experimental' : 'grounded'
    };
  };

  // Step 0: Name Input
  if (currentStep === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Lulu Muse</h2>
            <p className="text-lg text-gray-600">
              I'm your AI writing muse, here to help you discover and develop your story ideas. 
              Let's start by getting to know your unique creative style.
            </p>
          </div>
          
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
                              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                What's your first name?
              </label>
              <input
                type="text"
                id="name"
                value={assessmentData.name}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your first name"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Let's Begin
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 1: Big Five Questions
  if (currentStep === 1) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Creative Personality Profile</h2>
            <p className="text-gray-600">
              These questions help me understand your creative preferences so I can adapt my personality to work best with yours.
            </p>
          </div>

          <div className="space-y-8">
            {BIG_FIVE_QUESTIONS.map((q) => (
              <div key={q.key} className="bg-gray-50 p-6 rounded-lg">
                <label className="block text-lg font-medium text-gray-900 mb-4">
                  {q.question}
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500 w-32 text-right">{q.low}</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={assessmentData.bigFive[q.key]}
                    onChange={(e) => handleBigFiveChange(q.key, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-gray-500 w-32">{q.high}</span>
                  <span className="text-lg font-bold text-purple-600 w-8 text-center">
                    {assessmentData.bigFive[q.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(0)}
              className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Character Strengths
  if (currentStep === 2) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Creative Strengths</h2>
            <p className="text-gray-600 mb-4">
              Select 3-5 strengths that best describe you as a creative person.
            </p>
            <p className="text-sm text-purple-600">
              Selected: {assessmentData.strengths.length}/5
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {CHARACTER_STRENGTHS.map((strength) => {
              const isSelected = assessmentData.strengths.includes(strength);
              const canSelect = assessmentData.strengths.length < 5 || isSelected;
              
              return (
                <button
                  key={strength}
                  onClick={() => handleStrengthToggle(strength)}
                  disabled={!canSelect}
                  className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    isSelected
                      ? 'bg-purple-100 border-purple-500 text-purple-700'
                      : canSelect
                      ? 'bg-white border-gray-300 text-gray-700 hover:border-purple-300'
                      : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {strength}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(1)}
              className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={assessmentData.strengths.length < 3}
              className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Writer Type
  if (currentStep === 3) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Writing Style</h2>
            <p className="text-gray-600">How do you prefer to approach story development?</p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start space-x-4 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="writerType"
                value="explorer"
                checked={assessmentData.writerType === 'explorer'}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, writerType: e.target.value }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Explorer/Pantser</div>
                <div className="text-sm text-gray-600">
                  I like to discover my story as I write it. I prefer organic development and creative surprises.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-4 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="writerType"
                value="architect"
                checked={assessmentData.writerType === 'architect'}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, writerType: e.target.value }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Architect/Planner</div>
                <div className="text-sm text-gray-600">
                  I prefer to plan out my story structure in detail before writing. I like clear roadmaps and organization.
                </div>
              </div>
            </label>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              disabled={!assessmentData.writerType}
              className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Process Style
  if (currentStep === 4) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Learning Style</h2>
            <p className="text-gray-600">How do you prefer to process and develop ideas?</p>
          </div>

          <div className="space-y-4">
            {[
              { value: 'visual', label: 'Visual', desc: 'I think in images, diagrams, and spatial relationships' },
              { value: 'auditory', label: 'Auditory', desc: 'I process ideas through conversation and verbal exploration' },
              { value: 'kinesthetic', label: 'Kinesthetic', desc: 'I learn by doing, moving, and hands-on exploration' }
            ].map((style) => (
              <label key={style.value} className="flex items-start space-x-4 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="processStyle"
                  value={style.value}
                  checked={assessmentData.processStyle === style.value}
                  onChange={(e) => setAssessmentData(prev => ({ ...prev, processStyle: e.target.value }))}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">{style.label}</div>
                  <div className="text-sm text-gray-600">{style.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(3)}
              className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              disabled={!assessmentData.processStyle}
              className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Story Drive
  if (currentStep === 5) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Story Focus</h2>
            <p className="text-gray-600">What usually drives your story ideas?</p>
          </div>

          <div className="space-y-4">
            {[
              { value: 'character', label: 'Character-Driven', desc: 'Stories emerge from interesting people and their relationships' },
              { value: 'plot', label: 'Plot-Driven', desc: 'Stories are built around exciting events and compelling situations' },
              { value: 'theme', label: 'Theme-Driven', desc: 'Stories explore big ideas, messages, and deeper meanings' },
              { value: 'world', label: 'World-Driven', desc: 'Stories are sparked by fascinating settings and environments' }
            ].map((drive) => (
              <label key={drive.value} className="flex items-start space-x-4 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="storyDrive"
                  value={drive.value}
                  checked={assessmentData.storyDrive === drive.value}
                  onChange={(e) => setAssessmentData(prev => ({ ...prev, storyDrive: e.target.value }))}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">{drive.label}</div>
                  <div className="text-sm text-gray-600">{drive.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(4)}
              className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={handleComplete}
              disabled={!assessmentData.storyDrive}
              className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Complete Assessment →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Custom CSS for the range slider
const styles = `
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #7c3aed;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #7c3aed;
  cursor: pointer;
  border: none;
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}