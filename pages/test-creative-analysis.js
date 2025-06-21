import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { testCreativeAnalysis, testSingleMessage } from '../utils/testCreativeAnalysis';

const patternDescriptions = {
  'Predictive Processing': {
    title: "🧠 Predictive Processing in Your Story",
    description: "Your mind naturally violated expectations by revealing the father's double life. This shows strong predictive processing - you instinctively ask 'what if the expected isn't true?'",
    suggestions: [
      "What other family assumptions could be false?",
      "How might the manufactured crises subvert normal patterns?",
      "What if the factory/mansion isn't what it appears?"
    ],
    tryThis: "Take one 'normal' assumption in your story and flip it completely."
  },
  'Active Imagination': {
    title: "🎨 Active Imagination in Your Story",
    description: "You're allowing your subconscious to project rich, interconnected ideas. The flow from a TV show to a complex family drama is a clear sign of active imagination at work.",
    suggestions: [
        "What emotions does the 'therapy room' setting evoke? Lean into that feeling.",
        "Imagine a conversation with the girl. What would she say about her life?",
        "Close your eyes and walk through the mansion. What details emerge?"
    ],
    tryThis: "Write a short scene from the father's perspective, exploring his internal conflict."
  },
  'Complex Theory': {
    title: "🕸️ Complex Theory in Your Story",
    description: "Your story is an emergent system where small elements (like a room's color) create unpredictable, complex outcomes (a vast conspiracy). This is the essence of complexity in narrative.",
    suggestions: [
        "How does one 'manufactured crisis' connect to another, creating a ripple effect?",
        "What is the relationship between the 'poor house' system and the 'mansion' system?",
        "Introduce a small, random event and see how it changes the story's trajectory."
    ],
    tryThis: "Map out the different systems at play (family, deception, observation) and their connection points."
  },
  'Default': {
    title: "🧠 Creative Pattern Analysis",
    description: "Click on a specific pattern to get a more detailed analysis and practical next steps based on that pattern.",
    suggestions: [],
    tryThis: ""
  }
};

const FullAnalysisModal = ({ report, onClose, isLoading }) => {
    const renderSection = (title, content) => (
        <div className="py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-purple-700 mb-3">{title}</h3>
            {content}
        </div>
    );
    
    const renderList = (items) => (
        <ul className="space-y-2 list-disc list-inside text-gray-700">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    );

    return (
        <motion.div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
            >
                <header className="p-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-800">🔍 Comprehensive Creative Analysis</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                
                <div className="p-6 overflow-y-auto text-sm">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                             <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
                        </div>
                    ) : !report || report.error ? (
                        <div className="text-red-500">Failed to load analysis. Please try again.</div>
                    ) : (
                        <div className="space-y-4">
                            {renderSection("1. Context & Source", 
                                <div className="space-y-2">
                                    <p><strong>Date:</strong> {report.contextAndSource.analysisDate}</p>
                                    <p><strong>Source:</strong> {report.contextAndSource.sourceMessage}</p>
                                    <div><strong>Related Context:</strong>{renderList(report.contextAndSource.relatedContext)}</div>
                                </div>
                            )}

                            {renderSection("2. Expanded Creative Analysis", 
                                <div className="space-y-3">
                                    {report.expandedCreativeAnalysis.primaryPatterns.map(p => <p key={p.pattern}><strong>{p.pattern} ({p.strength}):</strong> {p.comment}</p>)}
                                    <p><strong>Development Arc:</strong> {report.expandedCreativeAnalysis.creativeDevelopmentArc}</p>
                                </div>
                            )}

                            {renderSection("3. Story Development Intelligence", 
                                <div className="space-y-2">
                                    <p><strong>Narrative Progression:</strong> {report.storyDevelopmentIntelligence.narrativeProgression}</p>
                                    <p><strong>Archetypal Journey:</strong> {report.storyDevelopmentIntelligence.archetypalJourney}</p>
                                    <p><strong>Thematic Deepening:</strong> {report.storyDevelopmentIntelligence.thematicDeepening}</p>
                                </div>
                            )}

                             {renderSection("4. Personalized Creative Guidance", 
                                <div className="space-y-2">
                                    <p><strong>For Your Signature:</strong> {report.personalizedCreativeGuidance.basedOnSignature}</p>
                                    <div><strong>Next Creative Leap:</strong>{renderList(report.personalizedCreativeGuidance.nextCreativeLeap)}</div>
                                    <div><strong>Techniques for Your Style:</strong>{renderList(report.personalizedCreativeGuidance.techniquesForStyle)}</div>
                                </div>
                            )}

                            {renderSection("5. Creative Signature Evolution", 
                                <div className="space-y-2">
                                     <div><strong>Session Comparison:</strong>{renderList(report.creativeSignatureEvolution.sessionComparison)}</div>
                                     <div><strong>Signature Update:</strong>{renderList(report.creativeSignatureEvolution.creativeSignatureUpdate)}</div>
                                </div>
                            )}

                            {renderSection("6. Integration & Next Steps", 
                                <div className="space-y-2">
                                    <div><strong>Immediate Story Development:</strong>{renderList(report.integrationAndNextSteps.immediateStoryDevelopment)}</div>
                                    <div><strong>Creative Technique Practice:</strong>{renderList(report.integrationAndNextSteps.creativeTechniquePractice)}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

const CreativeInsightsPanel = ({ insights, onPatternClick, selectedPattern, onClearPattern, onShowFullAnalysis, onApplyToCanvas }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    useEffect(() => {
        const savedState = localStorage.getItem('museInsightsPanelCollapsed');
        // On desktop, default to open unless saved otherwise
        const defaultCollapsed = window.innerWidth < 1024; 
        setIsCollapsed(savedState ? JSON.parse(savedState) : defaultCollapsed);
    }, []);

    useEffect(() => {
        localStorage.setItem('museInsightsPanelCollapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const PanelContent = () => (
        <div className="p-4 md:p-6 space-y-6">
            {selectedPattern ? (
                <PatternDetailView pattern={selectedPattern} onBack={onClearPattern} />
            ) : (
                <AnalysisSummary insights={insights} onPatternClick={onPatternClick} onShowFullAnalysis={onShowFullAnalysis} onApplyToCanvas={onApplyToCanvas} />
            )}
        </div>
    );
    
    return (
        <div className="border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50/50">
             <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full p-4 text-left bg-white shadow-sm flex justify-between items-center"
            >
                <h2 className="text-lg font-bold text-purple-700">🧠 Creative Insights</h2>
                <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }}>
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </motion.div>
            </button>
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                       {insights ? <PanelContent /> : <div className="p-6 text-gray-500">Run an analysis to see your creative insights.</div>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AnalysisSummary = ({ insights, onPatternClick, onShowFullAnalysis, onApplyToCanvas }) => {
    // Generate the contextual "Key Insight"
    const keyInsight = `Your ${insights.creativeStyle.replace('-', ' ')} approach, when combined with an '${insights.cognitiveState}' state and a strong sense of '${insights.dominantPatterns[0]}', creates a natural path toward compelling storytelling.`;
    
    // Filter out empty canvas updates to create "Next Steps"
    const nextSteps = Object.entries(insights.canvasUpdates)
        .filter(([, value]) => value && value.trim() !== '')
        .map(([key, value]) => ({
            area: key.charAt(0).toUpperCase() + key.slice(1),
            suggestion: value
        }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="p-3 bg-purple-100/50 rounded-lg border border-purple-200 text-center">
                <p className="font-semibold text-purple-800 text-sm">
                    <span className="capitalize">🎭 {insights.creativeStyle.replace('-', ' ')}</span> • <span className="capitalize">{insights.cognitiveState}</span>
                </p>
            </div>
            
            {/* Creative Signature Section */}
            <div>
                <h3 className="font-semibold text-gray-800 mb-2">🧠 Creative Signature</h3>
                <div className="space-y-1">
                    {insights.dominantPatterns.map((pattern) => (
                         <button 
                            key={pattern} 
                            onClick={() => onPatternClick(pattern)} 
                            className="w-full text-left p-2 rounded-md hover:bg-gray-200 transition-colors group flex justify-between items-center"
                        >
                            <span className="font-medium text-gray-700">{pattern}</span>
                            <span className="text-xs text-purple-600 group-hover:underline opacity-75 group-hover:opacity-100">Explore →</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Contextual Suggestions Section */}
            {nextSteps.length > 0 && (
                 <div>
                    <h3 className="font-semibold text-gray-800 mb-2">💡 Next Steps <span className="text-gray-500 font-normal capitalize">({insights.creativeStyle.replace('-', ' ')}-focused)</span></h3>
                    <ul className="list-none space-y-2 text-sm text-gray-700">
                        {nextSteps.slice(0, 3).map(step => <li key={step.area}>• {step.suggestion}</li>)}
                    </ul>
                </div>
            )}

             {/* Key Insight Section */}
             <div>
                <h3 className="font-semibold text-gray-800 mb-2">🎯 Key Insight</h3>
                <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded-md border border-gray-200">"{keyInsight}"</p>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button 
                    onClick={onShowFullAnalysis}
                    className="flex-1 text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Full Analysis
                </button>
                <button 
                    onClick={onApplyToCanvas}
                    className="flex-1 text-sm bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    Apply to Canvas
                </button>
            </div>
        </div>
    );
};

const PatternDetailView = ({ pattern, onBack }) => {
    const details = patternDescriptions[pattern] || patternDescriptions['Default'];
    
    return (
        <div className="space-y-4">
            <button onClick={onBack} className="text-sm text-purple-600 hover:underline">← Back to Summary</button>
            <h3 className="text-lg font-bold text-gray-800">{details.title}</h3>
            <p className="text-sm text-gray-600">{details.description}</p>
            
            {details.suggestions.length > 0 && (
                <div>
                    <h4 className="font-semibold text-gray-700">🎯 This pattern suggests exploring:</h4>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-sm text-gray-600">
                        {details.suggestions.map(s => <li key={s}>{s}</li>)}
                    </ul>
                </div>
            )}
            
            {details.tryThis && (
                 <div>
                    <h4 className="font-semibold text-gray-700">💡 Try this:</h4>
                    <p className="text-sm text-gray-600 italic">{details.tryThis}</p>
                </div>
            )}
        </div>
    );
};

export default function TestCreativeAnalysis() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [customMessage, setCustomMessage] = useState("I was watching a show call The Magicians and they mentioned 'a specialist' who was coming so I imagined 'the specialist' and thought of a child seeing multiple specialists who turned out to be the same person. I then thought of deception and the orange and brown room in the show made me think of a therapy room. I then imagined a child who has many crises manufactured around them and then navigating a false system. I then thought of a girl living with her father in a poor house, but one day she discovers a tunnel to the abandoned factory next door. Inside, is a mansion with her father's real family. They watch the father and girl on TV and he returns to his family when the girl is asleep, at school or in a manufactured crisis elsewhere.");
  const [customResult, setCustomResult] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [fullAnalysis, setFullAnalysis] = useState(null);
  const [isFullAnalysisLoading, setIsFullAnalysisLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (customResult) {
      setSelectedPattern(null); // Reset detail view on new analysis
    }
  }, [customResult]);

  const runFullTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Override console.log to capture results
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      await testCreativeAnalysis();
    } catch (error) {
      console.log('Test failed:', error.message);
    }

    console.log = originalLog;
    setTestResults(logs);
    setIsRunning(false);
  };

  const testCustomMessage = async () => {
    if (!customMessage.trim()) return;
    setCustomResult(null);
    const result = await testSingleMessage(customMessage, [], { name: 'Test User', writerType: 'explorer' });
    setCustomResult(result);
  };
  
  const handleShowFullAnalysis = async () => {
    if (!customResult || !customResult.success) return;
    setIsModalOpen(true);
    setIsFullAnalysisLoading(true);
    setFullAnalysis(null);

    try {
        const response = await fetch('/api/full-creative-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: customMessage,
                analysisHistory: [customResult.insights],
                creativeSignature: customResult.insights.signatureInsights,
            })
        });
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        setFullAnalysis(data.report);
    } catch (error) {
        console.error("Failed to fetch full analysis:", error);
        setFullAnalysis({ error: "Failed to load analysis." });
    } finally {
        setIsFullAnalysisLoading(false);
    }
  };

  const handleApplyToCanvas = () => {
    if (!customResult?.insights?.canvasUpdates) return;
    const updates = customResult.insights.canvasUpdates;
    console.log("Applying to Canvas:", updates);
    alert(`Applying the following suggestions to canvas (see console for details):\n\n${Object.entries(updates).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join('\n')}`);
  };

  const AnalysisResultDisplay = ({ result }) => {
    if (!result) return null;

    if (!result.success) {
        return <pre className="text-sm whitespace-pre-wrap text-red-500">{JSON.stringify(result, null, 2)}</pre>;
    }

    const { insights } = result;
    const { storyElements, canvasUpdates, signatureInsights } = insights;

    const renderableCanvasUpdates = Object.entries(canvasUpdates).filter(([, value]) => value);

    return (
        <div className="space-y-4 text-sm">
            <div>
                <strong className="font-semibold text-base block mb-1">✅ Analysis Successful!</strong>
                <p><strong>Creative Style:</strong> {insights.creativeStyle}</p>
                <p><strong>Cognitive State:</strong> {insights.cognitiveState}</p>
                <p><strong>Dominant Patterns:</strong> {insights.dominantPatterns.join(', ')}</p>
            </div>

            <div>
                <strong className="font-semibold">Story Elements (0-100):</strong>
                <div className="pl-4">
                    <p>Character Focus: <span className="font-mono bg-gray-200 px-1 rounded">{storyElements.characterFocus}</span></p>
                    <p>Plot Development: <span className="font-mono bg-gray-200 px-1 rounded">{storyElements.plotDevelopment}</span></p>
                    <p>Theme Exploration: <span className="font-mono bg-gray-200 px-1 rounded">{storyElements.themeExploration}</span></p>
                    <p>World Building: <span className="font-mono bg-gray-200 px-1 rounded">{storyElements.worldBuilding}</span></p>
                </div>
            </div>

            {renderableCanvasUpdates.length > 0 && (
                <div>
                    <strong className="font-semibold">Canvas Suggestions:</strong>
                    <div className="pl-4 space-y-1 mt-1">
                        {renderableCanvasUpdates.map(([key, value]) => (
                             <p key={key}><strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}</p>
                        ))}
                    </div>
                </div>
            )}
            
            <div>
                <strong className="font-semibold">Signature Insights:</strong>
                <div className="pl-4 space-y-1 mt-1">
                    {signatureInsights.detectedPatterns.length > 0 && <p><strong>Detected Patterns:</strong> {signatureInsights.detectedPatterns.join(', ')}</p>}
                    {signatureInsights.suggestedTechniques.length > 0 && <p><strong>Suggested Techniques:</strong> {signatureInsights.suggestedTechniques.join(', ')}</p>}
                    {signatureInsights.creativeTriggers.length > 0 && <p><strong>Creative Triggers:</strong> {signatureInsights.creativeTriggers.join(', ')}</p>}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Test Creative Analysis API</title>
      </Head>
      
      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <main className="w-full lg:w-7/10 min-h-screen">
           <div className="p-4 sm:p-6 md:p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Creative Analysis Engine
                </h1>
                <p className="text-gray-600 mb-8">Test the creative intelligence API by analyzing your story ideas.</p>

                {/* Custom Test Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4">Analyze Your Text</h2>
                  <div className="space-y-4">
                    <div>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Enter a creative message to test the analysis..."
                        className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <button
                      onClick={testCustomMessage}
                      disabled={!customMessage.trim()}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      Analyze Message
                    </button>

                    {customResult && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-2 text-gray-800">Main Analysis:</h3>
                        <div className="bg-gray-100/80 p-4 rounded-lg border">
                           {/* This is the existing formatted display */}
                            {customResult.success ? (
                                <div className="space-y-2 text-gray-700">
                                   <p><strong>Style:</strong> <span className="capitalize">{customResult.insights.creativeStyle}</span></p>
                                   <p><strong>State:</strong> <span className="capitalize">{customResult.insights.cognitiveState}</span></p>
                                   <p><strong>Dominant Patterns:</strong> {customResult.insights.dominantPatterns.join(', ')}</p>
                                </div>
                            ) : (
                                <p className="text-red-500">{customResult.error}</p>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <a href="/muse" className="text-purple-600 hover:text-purple-700 font-medium">
                    ← Back to Lulu Muse
                  </a>
                </div>
            </div>
        </main>
        
        {/* Insights Panel */}
        <aside className="w-full lg:w-3/10 min-h-screen">
             <CreativeInsightsPanel 
                insights={customResult?.insights}
                selectedPattern={selectedPattern}
                onPatternClick={setSelectedPattern}
                onClearPattern={() => setSelectedPattern(null)}
                onShowFullAnalysis={handleShowFullAnalysis}
                onApplyToCanvas={handleApplyToCanvas}
            />
        </aside>

        <AnimatePresence>
            {isModalOpen && (
                <FullAnalysisModal
                    report={fullAnalysis}
                    isLoading={isFullAnalysisLoading}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </AnimatePresence>
      </div>
    </div>
  );
} 