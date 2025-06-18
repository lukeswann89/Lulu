import { useState, useEffect } from 'react';
import Head from 'next/head';
import PersonalityAssessment from '../components/muse/PersonalityAssessment';
import StoryCanvas from '../components/muse/StoryCanvas';
import ChatInterface from '../components/muse/ChatInterface';
import { exportStoryPlan } from '../utils/export';

export default function Muse() {
  // App state management
  const [currentStep, setCurrentStep] = useState('assessment'); // assessment, planning, complete
  const [userProfile, setUserProfile] = useState(null);
  const [canvasData, setCanvasData] = useState({
    character: {
      protagonist: '',
      antagonist: '',
      supporting: ''
    },
    plot: {
      actI: '',
      actII: '',
      actIII: ''
    },
    world: {
      setting: '',
      history: '',
      rules: ''
    },
    themes: {
      central: '',
      symbolism: '',
      message: ''
    },
    voice: {
      tone: '',
      style: '',
      pov: ''
    }
  });
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pinNotification, setPinNotification] = useState(null);

  // Load saved data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('lulu_muse_project');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.userProfile) setUserProfile(parsed.userProfile);
        if (parsed.canvasData) setCanvasData(parsed.canvasData);
        if (parsed.chatHistory) setChatHistory(parsed.chatHistory);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      } catch (error) {
        console.warn('Failed to load saved Muse data:', error);
      }
    }
  }, []);

  // Save data whenever state changes
  useEffect(() => {
    if (userProfile || chatHistory.length > 0) {
      const dataToSave = {
        userProfile,
        canvasData,
        chatHistory,
        currentStep,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('lulu_muse_project', JSON.stringify(dataToSave));
    }
  }, [userProfile, canvasData, chatHistory, currentStep]);

  // Handle assessment completion
  const handleAssessmentComplete = (profile) => {
    setUserProfile(profile);
    setCurrentStep('planning');
    
    // Add initial AI greeting based on personality
    const greeting = generatePersonalizedGreeting(profile);
    setChatHistory([{
      sender: 'ai',
      message: greeting,
      timestamp: new Date().toISOString()
    }]);
  };

  // Generate personalized AI greeting based on assessment
  const generatePersonalizedGreeting = (profile) => {
    const { name, writerType, processStyle, bigFive } = profile;
    let greeting = `Hi ${name}! I'm Lulu, your creative writing muse. `;

    if (writerType === 'explorer') {
      greeting += "I can sense you love to discover your story as you go - that's wonderful! ";
    } else {
      greeting += "I can tell you like to plan things out systematically - perfect! ";
    }

    if (bigFive.openness > 7) {
      greeting += "I'm excited to explore some wild and creative story ideas with you. ";
    }

    greeting += "What kind of story is calling to you today? Tell me anything that comes to mind - a character, a setting, a situation, or just a feeling you want to capture.";

    return greeting;
  };

  // Handle new chat messages and canvas updates
  const handleNewMessage = async (message) => {
    // Add user message to chat
    const userMessage = {
      sender: 'user',
      message: message,
      timestamp: new Date().toISOString()
    };
    
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setIsLoading(true);

    try {
      // Call AI API with context
      const response = await fetch('/api/muse-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          currentCanvas: canvasData,
          chatHistory: updatedHistory,
          newMessage: message
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Add AI response to chat
        const aiMessage = {
          sender: 'ai',
          message: result.aiResponse,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, aiMessage]);

        // Update canvas with parsed content
        if (result.canvasUpdates) {
          setCanvasData(prev => ({
            ...prev,
            ...result.canvasUpdates
          }));
        }

        // Show targeted section notification if applicable
        if (result.targetSection) {
          showPinNotification(`Added to ${result.targetSection}`);
        }
      } else {
        console.error('AI response error:', result.error);
        // Add error message
        setChatHistory(prev => [...prev, {
          sender: 'ai',
          message: "I'm sorry, I had trouble processing that. Could you try rephrasing?",
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        message: "Something went wrong. Let's keep going - what else would you like to explore about your story?",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pinning AI message to canvas
  const handlePinToCanvas = async (message) => {
    setIsLoading(true);
    
    try {
      // Call AI to determine best placement
      const response = await fetch('/api/muse-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          currentCanvas: canvasData,
          chatHistory,
          newMessage: `Pin this to canvas: "${message}"`,
          isPinRequest: true
        })
      });

      const result = await response.json();
      
      if (result.success && result.canvasUpdates) {
        // Update canvas with pinned content
        setCanvasData(prev => {
          const updated = { ...prev };
          
          Object.keys(result.canvasUpdates).forEach(category => {
            Object.keys(result.canvasUpdates[category]).forEach(section => {
              const newContent = result.canvasUpdates[category][section];
              const existingContent = updated[category][section];
              
              // Append pinned content if there's existing content
              if (existingContent && existingContent.trim()) {
                updated[category][section] = `${existingContent}\n\n${newContent}`;
              } else {
                updated[category][section] = newContent;
              }
            });
          });
          
          return updated;
        });

        // Show success notification
        const section = result.targetSection || 'canvas';
        showPinNotification(`Pinned to ${section}`);
      }
    } catch (error) {
      console.error('Pin error:', error);
      showPinNotification('Failed to pin message', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Show pin notification
  const showPinNotification = (message, type = 'success') => {
    setPinNotification({ message, type });
    setTimeout(() => setPinNotification(null), 3000);
  };

  // Handle direct canvas edits
  const handleCanvasEdit = (category, section, newValue) => {
    setCanvasData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [section]: newValue
      }
    }));
  };

  // Handle export
  const handleExport = () => {
    try {
      exportStoryPlan({
        userProfile,
        canvasData,
        chatHistory
      });
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Reset to start over
  const handleReset = () => {
    if (confirm('Are you sure you want to start over? This will clear all your progress.')) {
      setCurrentStep('assessment');
      setUserProfile(null);
      setCanvasData({
        character: { protagonist: '', antagonist: '', supporting: '' },
        plot: { actI: '', actII: '', actIII: '' },
        world: { setting: '', history: '', rules: '' },
        themes: { central: '', symbolism: '', message: '' },
        voice: { tone: '', style: '', pov: '' }
      });
      setChatHistory([]);
      localStorage.removeItem('lulu_muse_project');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <Head>
        <title>Lulu Muse - Story Planning</title>
        <meta name="description" content="AI-powered story planning tool that adapts to your creative style" />
      </Head>

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-purple-600">Lulu Muse</h1>
              {userProfile && (
                <span className="text-sm text-gray-600">
                  Welcome back, {userProfile.name}!
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {currentStep === 'planning' && (
                <>
                  <button
                    onClick={handleExport}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Export Story Plan
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Start Over
                  </button>
                </>
              )}
              <a
                href="/"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                ← Back to Lulu Editor
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Pin Notification */}
      {pinNotification && (
        <div className={`fixed top-20 right-4 px-4 py-2 rounded-lg shadow-lg transition-all transform ${
          pinNotification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        } animate-slide-in`}>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              {pinNotification.type === 'success' ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            <span className="text-sm font-medium">{pinNotification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'assessment' && (
          <PersonalityAssessment onComplete={handleAssessmentComplete} />
        )}

        {currentStep === 'planning' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ height: 'calc(100vh-200px)' }}>
            {/* Story Canvas - 2/3 width */}
            <div className="lg:col-span-2" style={{ height: '100%' }}>
              <StoryCanvas 
                canvasData={canvasData}
                userProfile={userProfile}
                onCanvasEdit={handleCanvasEdit}
              />
            </div>
            
            {/* Chat Interface - 1/3 width */}
            <div className="lg:col-span-1" style={{ height: '100%' }}>
              <ChatInterface
                chatHistory={chatHistory}
                onNewMessage={handleNewMessage}
                onPinToCanvas={handlePinToCanvas}
                isLoading={isLoading}
                userProfile={userProfile}
              />
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}