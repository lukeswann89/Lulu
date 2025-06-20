import { useState } from 'react';
import Head from 'next/head';
import { testCreativeAnalysis, testSingleMessage } from '../utils/testCreativeAnalysis';

export default function TestCreativeAnalysis() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customResult, setCustomResult] = useState(null);

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
    const result = await testSingleMessage(
      customMessage, 
      [], 
      { name: 'Test User', writerType: 'explorer' }
    );
    setCustomResult(result);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>Test Creative Analysis API</title>
      </Head>

      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧠 Creative Analysis API Test
        </h1>

        {/* Full Test Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Full Test Suite</h2>
          <button
            onClick={runFullTest}
            disabled={isRunning}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
          </button>
          
          {testResults.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Test Results:</h3>
              <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">{testResults.join('\n')}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Custom Test Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Message Test</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter a message to analyze:
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter a creative message to test the analysis..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={testCustomMessage}
              disabled={!customMessage.trim()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Analyze Message
            </button>

            {customResult && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Analysis Result:</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <AnalysisResultDisplay result={customResult} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Click "Run Full Test Suite" to test with predefined scenarios</li>
            <li>• Use "Custom Message Test" to analyze your own creative messages</li>
            <li>• Check the browser console for detailed logs</li>
            <li>• Verify that the API returns structured insights</li>
            <li>• Ensure error handling works gracefully</li>
          </ul>
        </div>

        {/* Back to Muse */}
        <div className="mt-8 text-center">
          <a
            href="/muse"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Lulu Muse
          </a>
        </div>
      </div>
    </div>
  );
} 