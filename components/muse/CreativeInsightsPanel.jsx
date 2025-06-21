import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

const AnalysisSummary = ({ insights, onPatternClick, onShowFullAnalysis, onApplyToCanvas }) => {
    const keyInsight = `Your ${insights.creativeStyle.replace('-', ' ')} approach, when combined with an '${insights.cognitiveState}' state and a strong sense of '${insights.dominantPatterns[0]}', creates a natural path toward compelling storytelling.`;
    const nextSteps = Object.entries(insights.canvasUpdates)
        .filter(([, value]) => value && value.trim() !== '')
        .map(([key, value]) => ({ area: key.charAt(0).toUpperCase() + key.slice(1), suggestion: value }));

    return (
        <div className="space-y-6">
            <div className="p-3 bg-purple-100/50 rounded-lg border border-purple-200 text-center">
                <p className="font-semibold text-purple-800 text-sm">
                    <span className="capitalize">🎭 {insights.creativeStyle.replace('-', ' ')}</span> • <span className="capitalize">{insights.cognitiveState}</span>
                </p>
            </div>
            <div>
                <h3 className="font-semibold text-gray-800 mb-2">🧠 Creative Signature</h3>
                <div className="space-y-1">
                    {insights.dominantPatterns.map((pattern) => (
                         <button key={pattern} onClick={() => onPatternClick(pattern)} className="w-full text-left p-2 rounded-md hover:bg-gray-200 transition-colors group flex justify-between items-center">
                            <span className="font-medium text-gray-700">{pattern}</span>
                            <span className="text-xs text-purple-600 group-hover:underline opacity-75 group-hover:opacity-100">Explore →</span>
                        </button>
                    ))}
                </div>
            </div>
            {nextSteps.length > 0 && (
                 <div>
                    <h3 className="font-semibold text-gray-800 mb-2">💡 Next Steps <span className="text-gray-500 font-normal capitalize">({insights.creativeStyle.replace('-', ' ')}-focused)</span></h3>
                    <ul className="list-none space-y-2 text-sm text-gray-700">
                        {nextSteps.slice(0, 3).map(step => <li key={step.area}>• {step.suggestion}</li>)}
                    </ul>
                </div>
            )}
             <div>
                <h3 className="font-semibold text-gray-800 mb-2">🎯 Key Insight</h3>
                <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded-md border border-gray-200">"{keyInsight}"</p>
            </div>
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button onClick={onShowFullAnalysis} className="flex-1 text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Full Analysis
                </button>
                <button onClick={onApplyToCanvas} className="flex-1 text-sm bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
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

export default function CreativeInsightsPanel({ selectedMessage, onBackToChat, isLoading, onApplyInsights, creativeSignature }) {
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [fullAnalysis, setFullAnalysis] = useState(null);
    const [isFullAnalysisLoading, setIsFullAnalysisLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const insights = selectedMessage?.insights;

    console.log('CreativeInsightsPanel - selectedMessage:', selectedMessage);
    console.log('CreativeInsightsPanel - insights:', insights);

    useEffect(() => {
        // When the selected message changes, reset the detailed pattern view
        setSelectedPattern(null);
    }, [selectedMessage]);

    if (!selectedMessage) {
        return (
            <div className="p-6 text-center text-gray-500 h-full flex flex-col justify-center">
                <p className="mb-4">Select a message in the chat to see its creative analysis, or switch back to the chat.</p>
                 <button onClick={onBackToChat} className="text-purple-600 hover:underline">← Back to Chat</button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6 text-center text-gray-500 h-full flex flex-col justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="mb-4">Generating creative insights for your message...</p>
                <p className="text-sm text-gray-400">"{selectedMessage.message}"</p>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="p-6 text-center text-gray-500 h-full flex flex-col justify-center">
                <p className="mb-4">This message doesn't have insights yet. Insights are generated when you send messages.</p>
                <p className="mb-4 text-sm">Message: "{selectedMessage.message}"</p>
                <button onClick={onBackToChat} className="text-purple-600 hover:underline">← Back to Chat</button>
            </div>
        );
    }
    
    const handleShowFullAnalysis = async () => {
        setIsModalOpen(true);
        setIsFullAnalysisLoading(true);
        setFullAnalysis(null);
        try {
            const response = await fetch('/api/full-creative-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: selectedMessage.message,
                    analysisHistory: [insights],
                    creativeSignature: insights.signatureInsights,
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
        onApplyInsights(insights);
    };

    return (
        <div className="h-full overflow-y-auto">
             <div className="p-4 md:p-6 space-y-6">
                <div className="p-3 bg-gray-100 rounded-lg text-sm">
                    <p className="font-semibold text-gray-700">Analyzing Message:</p>
                    <p className="text-gray-600 italic truncate">"{selectedMessage.message}"</p>
                </div>

                {selectedPattern ? (
                    <PatternDetailView pattern={selectedPattern} onBack={() => setSelectedPattern(null)} />
                ) : (
                    <AnalysisSummary 
                        insights={insights} 
                        onPatternClick={setSelectedPattern}
                        onShowFullAnalysis={handleShowFullAnalysis}
                        onApplyToCanvas={handleApplyToCanvas}
                    />
                )}
            </div>
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
    );
} 