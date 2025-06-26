import { useState, useEffect } from 'react';
import Head from 'next/head';
import PersonalityAssessment from '../components/muse/PersonalityAssessment';
import StoryCanvas from '../components/muse/StoryCanvas';
import TabbedInterface from '../components/muse/TabbedInterface';
import { exportStoryPlan } from '../utils/export';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

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
  
  // New state for tabbed interface and actions
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [hasNewInsight, setHasNewInsight] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(true);
  const [creativeSignature, setCreativeSignature] = useState(null);
  const [mobileView, setMobileView] = useState('chat'); // 'chat' or 'canvas'

  const voiceRecognition = useVoiceRecognition();

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
        if (typeof parsed.isAdaptiveMode === 'boolean') {
          setIsAdaptiveMode(parsed.isAdaptiveMode);
        }
        if (parsed.creativeSignature) {
          setCreativeSignature(parsed.creativeSignature);
        }
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
        isAdaptiveMode,
        creativeSignature,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('lulu_muse_project', JSON.stringify(dataToSave));
    }
  }, [userProfile, canvasData, chatHistory, currentStep, isAdaptiveMode, creativeSignature]);

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
  const handleNewUserMessage = async (message, replyToMessage) => {
    setIsLoading(true);

    const userMessage = {
      sender: 'user',
      message: message,
      timestamp: new Date().toISOString(),
      id: Date.now(),
      replyTo: replyToMessage ? { sender: replyToMessage.sender, message: replyToMessage.message } : null,
      insights: null // Placeholder for insights
    };

    const updatedChatHistory = [...chatHistory, userMessage];
    setChatHistory(updatedChatHistory);

    try {
      // --- NEW INSIGHTS LOGIC ---
      // Analyze the user's message in the background
      const creativeInsights = await analyzeForCreativeIntelligence(userMessage.message, updatedChatHistory);
      
      // Update the message in history with its new insights
      setChatHistory(prev => {
          const newHistory = [...prev];
          const messageIndex = newHistory.findIndex(m => m.id === userMessage.id);
          if (messageIndex !== -1) {
              newHistory[messageIndex].insights = creativeInsights.analysis;
              // Evolve the creative signature
              if (creativeInsights.updatedSignature) {
                setCreativeSignature(creativeInsights.updatedSignature);
              }
          }
          return newHistory;
      });

      // Apply canvas updates from creative analysis if any
      if (creativeInsights.analysis && creativeInsights.analysis.canvasUpdates) {
        // Use the sophisticated canvas update function
        handleApplyInsightsToCanvas(creativeInsights.analysis);
      }

      // Notify user of new insight
      if (activeTab !== 'insights') {
        setHasNewInsight(true);
      }

      console.log('Insights generated for message:', userMessage.id, creativeInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      // Set default insights if analysis fails
      const defaultInsights = getDefaultCreativeInsights();
      setChatHistory(prev => {
          const newHistory = [...prev];
          const messageIndex = newHistory.findIndex(m => m.id === userMessage.id);
          if (messageIndex !== -1) {
              newHistory[messageIndex].insights = defaultInsights.analysis;
          }
          return newHistory;
      });
    }

    // --- AI Response Logic ---
    // This part would now call the AI for a conversational reply
    if (isAdaptiveMode) {
      console.log("ADAPTIVE MODE ON: Generating response with signature:", creativeSignature);
    } else {
      console.log("ADAPTIVE MODE OFF: Generating standard response.");
    }

    try {
      // Call the AI for a conversational response
      const response = await fetch('/api/muse-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          currentCanvas: canvasData,
          chatHistory: updatedChatHistory,
          newMessage: message,
          isPinRequest: false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Create AI message
        const aiMessage = {
          sender: 'ai',
          message: result.aiResponse,
          timestamp: new Date().toISOString(),
          id: Date.now() + 1, // ensure unique id
          insights: null 
        };
        setChatHistory(prev => [...prev, aiMessage]);

        // Apply canvas updates if any
        if (result.canvasUpdates && Object.keys(result.canvasUpdates).length > 0) {
          setCanvasData(prev => {
            const updated = { ...prev };
            
            Object.keys(result.canvasUpdates).forEach(category => {
              Object.keys(result.canvasUpdates[category]).forEach(section => {
                const newContent = result.canvasUpdates[category][section];
                const existingContent = updated[category][section];
                
                // Append new content if there's existing content
                if (existingContent && existingContent.trim()) {
                  updated[category][section] = `${existingContent}\n\n${newContent}`;
                } else {
                  updated[category][section] = newContent;
                }
              });
            });
            
            return updated;
          });
        }
      } else {
        // Fallback if AI call fails
        const aiMessage = {
          sender: 'ai',
          message: "I'm having trouble processing that right now. Could you try rephrasing?",
          timestamp: new Date().toISOString(),
          id: Date.now() + 1,
          insights: null 
        };
        setChatHistory(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('AI response error:', error);
      // Fallback if AI call fails
      const aiMessage = {
        sender: 'ai',
        message: "I'm having trouble processing that right now. Could you try rephrasing?",
        timestamp: new Date().toISOString(),
        id: Date.now() + 1,
        insights: null 
      };
      setChatHistory(prev => [...prev, aiMessage]);
    }
    
    setIsLoading(false);
  };

  // Analyze USER responses for creative intelligence
  const analyzeForCreativeIntelligence = async (message, history) => {
    try {
      const response = await fetch('/api/creative-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          chatHistory: history, 
          userProfile,
          creativeSignature // Pass current signature
        })
      });
      const result = await response.json();
      return result.success ? result.insights : { analysis: getDefaultCreativeInsights().analysis, updatedSignature: creativeSignature };
    } catch (error) {
      console.error('Creative analysis error:', error);
      return { analysis: getDefaultCreativeInsights().analysis, updatedSignature: creativeSignature };
    }
  };

  // Default creative insights for fallback
  const getDefaultCreativeInsights = () => {
    return {
      analysis: {
        dominantPatterns: ['exploratory', 'character-driven'],
        creativeStyle: 'character-driven',
        cognitiveState: 'exploratory',
        storyElements: {
          characterFocus: 50,
          plotDevelopment: 30,
          themeExploration: 40,
          worldBuilding: 20
        },
        canvasUpdates: {
          character: 'A default suggestion for a character.',
          plot: '',
          world: '',
          themes: '',
          voice: ''
        },
        signatureInsights: {
          detectedPatterns: ['character-exploration'],
          suggestedTechniques: ['free-writing', 'character-interview'],
          creativeTriggers: ['emotional-conflict', 'character-voice']
        }
      },
      updatedSignature: creativeSignature // Return the existing signature on fallback
    };
  };

  // Handle selecting a USER message to analyze its insights
  const handleSelectMessage = async (message) => {
      console.log('handleSelectMessage called with:', message);
      if (message.sender === 'user') {
        console.log('Message has insights:', message.insights);
        
        // If the message doesn't have insights, generate them on-demand
        if (!message.insights) {
          console.log('Generating insights for existing message...');
          setIsLoading(true);
          
          try {
            const creativeInsights = await analyzeForCreativeIntelligence(message.message, chatHistory);
            
            // Update the message in history with the new insights
            setChatHistory(prev => {
                const newHistory = [...prev];
                const messageIndex = newHistory.findIndex(m => m.id === message.id);
                if (messageIndex !== -1) {
                    newHistory[messageIndex].insights = creativeInsights.analysis;
                    // Evolve the creative signature
                    if (creativeInsights.updatedSignature) {
                      setCreativeSignature(creativeInsights.updatedSignature);
                    }
                }
                return newHistory;
            });
            
            // Update the selected message with insights
            setSelectedMessage({
                ...message,
                insights: creativeInsights.analysis
            });
            
            console.log('Insights generated for existing message:', creativeInsights);
          } catch (error) {
            console.error('Failed to generate insights for existing message:', error);
            // Set default insights if analysis fails
            const defaultInsights = getDefaultCreativeInsights();
            setSelectedMessage({
                ...message,
                insights: defaultInsights.analysis
            });
            
            // Also update the message in history
            setChatHistory(prev => {
                const newHistory = [...prev];
                const messageIndex = newHistory.findIndex(m => m.id === message.id);
                if (messageIndex !== -1) {
                    newHistory[messageIndex].insights = defaultInsights.analysis;
                }
                return newHistory;
            });
          } finally {
            // No longer setting isLoading here, it's handled in the user message handler
          }
        } else {
          // Message already has insights, just select it
          setSelectedMessage(message);
        }
        
        setActiveTab('insights');
        setHasNewInsight(false);
      }
  };
  
  // Handle setting a message to reply to
  const handleSetReplyingTo = (message) => {
      setReplyingTo(message);
  };
  
  // Handle pinning a message to the canvas
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

  const handleToggleAdaptiveMode = () => {
    setIsAdaptiveMode(prev => !prev);
  };

  const handleApplyInsightsToCanvas = (insights) => {
    if (!insights || !insights.canvasUpdates) {
      showPinNotification('No suggestions to apply.', 'error');
      return;
    }
    
    const updates = insights.canvasUpdates;
    let updatesApplied = 0;

    setCanvasData(prev => {
      const updated = { ...prev };
      
      Object.keys(updates).forEach(category => {
        if (updates[category] && updated[category]) {
          Object.keys(updates[category]).forEach(section => {
            const newContent = updates[category][section];
            if (newContent && typeof updated[category][section] !== 'undefined') {
              const existingContent = updated[category][section];
              updated[category][section] = existingContent 
                ? `${existingContent}\n\n---\nSuggested by Lulu:\n${newContent}`
                : newContent;
              updatesApplied++;
            }
          });
        }
      });
      
      return updated;
    });

    if (updatesApplied > 0) {
      showPinNotification(`${updatesApplied} suggestion(s) applied to canvas!`);
    } else {
      showPinNotification('No new suggestions were found to apply.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <Head>
        <title>Lulu Muse - Story Planning</title>
        <meta name="description" content="AI-powered story planning tool that adapts to your creative style" />
      </Head>

      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-purple-600">Lulu Muse</h1>
              {userProfile && (
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Welcome back, {userProfile.name}!
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {currentStep === 'planning' && (
                <>
                  <button
                    onClick={handleExport}
                    className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Export
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    Reset
                  </button>
                </>
              )}
              <a
                href="/"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                <span className="hidden sm:inline">← Back to Editor</span>
                <span className="sm:hidden">← Back</span>
              </a>
            </div>
          </div>
        </div>
      </div>

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'assessment' && (
          <PersonalityAssessment onComplete={handleAssessmentComplete} />
        )}

        {currentStep === 'planning' && (
          <>
            {/* Desktop Layout: Side-by-side grid */}
            <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ height: 'calc(100vh - 180px)' }}>
              <div className="lg:col-span-2 h-full">
                <StoryCanvas 
                  canvasData={canvasData}
                  userProfile={userProfile}
                  onCanvasEdit={handleCanvasEdit}
                />
              </div>
              <div className="lg:col-span-1 h-full">
                <TabbedInterface
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  chatHistory={chatHistory}
                  onNewMessage={handleNewUserMessage}
                  onPinToCanvas={handlePinToCanvas}
                  isLoading={isLoading}
                  userProfile={userProfile}
                  selectedMessage={selectedMessage}
                  onSelectMessage={handleSelectMessage}
                  hasNewInsight={hasNewInsight}
                  setHasNewInsight={setHasNewInsight}
                  replyingTo={replyingTo}
                  onSetReplyingTo={handleSetReplyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  isAdaptiveMode={isAdaptiveMode}
                  onToggleAdaptiveMode={handleToggleAdaptiveMode}
                  onApplyInsights={handleApplyInsightsToCanvas}
                  creativeSignature={creativeSignature}
                />
              </div>
            </div>

            {/* Mobile Layout: Toggle between views */}
            <div className="lg:hidden">
              <div className="pb-16">
                {mobileView === 'canvas' ? (
                  <StoryCanvas 
                    canvasData={canvasData}
                    userProfile={userProfile}
                    onCanvasEdit={handleCanvasEdit}
                  />
                ) : (
                  <div style={{ height: 'calc(100vh - 180px)' }}>
                    <TabbedInterface
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      chatHistory={chatHistory}
                      onNewMessage={handleNewUserMessage}
                      onPinToCanvas={handlePinToCanvas}
                      isLoading={isLoading}
                      userProfile={userProfile}
                      selectedMessage={selectedMessage}
                      onSelectMessage={handleSelectMessage}
                      hasNewInsight={hasNewInsight}
                      setHasNewInsight={setHasNewInsight}
                      replyingTo={replyingTo}
                      onSetReplyingTo={handleSetReplyingTo}
                      onCancelReply={() => setReplyingTo(null)}
                      isAdaptiveMode={isAdaptiveMode}
                      onToggleAdaptiveMode={handleToggleAdaptiveMode}
                      onApplyInsights={handleApplyInsightsToCanvas}
                      creativeSignature={creativeSignature}
                    />
                  </div>
                )}
              </div>
              
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-t-lg z-20">
                <div className="flex justify-around items-center h-16">
                  <button onClick={() => setMobileView('canvas')} className={`flex flex-col items-center justify-center w-full h-full text-sm font-medium transition-colors ${mobileView === 'canvas' ? 'text-purple-600' : 'text-gray-500 hover:text-purple-500'}`}>
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    <span>Canvas</span>
                  </button>
                  <button onClick={() => setMobileView('chat')} className={`flex flex-col items-center justify-center w-full h-full text-sm font-medium transition-colors ${mobileView === 'chat' ? 'text-purple-600' : 'text-gray-500 hover:text-purple-500'}`}>
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V7a2 2 0 012-2h2m6 0a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2h1v4l4-4h2a2 2 0 002-2V8z" /></svg>
                    <span>Muse</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}