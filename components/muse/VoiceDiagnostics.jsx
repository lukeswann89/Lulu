import { useState, useEffect } from 'react';
import { 
  generateDiagnosticReport, 
  getVoiceRecognitionLogs, 
  clearVoiceRecognitionLogs,
  formatErrorMessage,
  getVoiceCommandsHelp
} from '../../utils/voiceRecognitionUtils';

export default function VoiceDiagnostics({ isOpen, onClose }) {
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      loadDiagnostics();
    }
  }, [isOpen]);

  const loadDiagnostics = async () => {
    setIsLoading(true);
    try {
      const report = await generateDiagnosticReport();
      setDiagnosticReport(report);
      
      const voiceLogs = getVoiceRecognitionLogs();
      setLogs(voiceLogs);
    } catch (error) {
      console.error('Failed to load diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = () => {
    clearVoiceRecognitionLogs();
    setLogs([]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'supported':
      case 'granted':
      case true:
        return '✅';
      case 'not supported':
      case 'denied':
      case false:
        return '❌';
      default:
        return '⚠️';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'supported':
      case 'granted':
      case true:
        return 'text-green-600';
      case 'not supported':
      case 'denied':
      case false:
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Voice Recognition Diagnostics</h2>
              <p className="text-sm text-gray-600">Troubleshoot voice recognition issues</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'browser', label: 'Browser Info' },
              { id: 'network', label: 'Network' },
              { id: 'microphone', label: 'Microphone' },
              { id: 'logs', label: 'Event Logs' },
              { id: 'commands', label: 'Voice Commands' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading diagnostics...</span>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && diagnosticReport && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Browser Support</h3>
                      <div className="flex items-center space-x-2">
                        <span className={getStatusColor(diagnosticReport.browser.supported)}>
                          {getStatusIcon(diagnosticReport.browser.supported)}
                        </span>
                        <span className="text-sm">
                          {diagnosticReport.browser.browser} {diagnosticReport.browser.version}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Microphone Access</h3>
                      <div className="flex items-center space-x-2">
                        <span className={getStatusColor(diagnosticReport.microphone.granted)}>
                          {getStatusIcon(diagnosticReport.microphone.granted)}
                        </span>
                        <span className="text-sm">
                          {diagnosticReport.microphone.granted ? 'Granted' : 'Not granted'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Network Status</h3>
                      <div className="flex items-center space-x-2">
                        <span className={getStatusColor(diagnosticReport.network.online)}>
                          {getStatusIcon(diagnosticReport.network.online)}
                        </span>
                        <span className="text-sm">
                          {diagnosticReport.network.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Speech Recognition</h3>
                      <div className="flex items-center space-x-2">
                        <span className={getStatusColor(diagnosticReport.speechRecognition.supported)}>
                          {getStatusIcon(diagnosticReport.speechRecognition.supported)}
                        </span>
                        <span className="text-sm">
                          {diagnosticReport.speechRecognition.supported ? 'Supported' : 'Not supported'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {diagnosticReport.recommendations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900 mb-2">Recommendations</h3>
                      <ul className="space-y-1">
                        {diagnosticReport.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-blue-800 flex items-start">
                            <span className="mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Browser Info Tab */}
              {activeTab === 'browser' && diagnosticReport && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Browser Details</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Browser:</strong> {diagnosticReport.browser.browser}</div>
                      <div><strong>Version:</strong> {diagnosticReport.browser.version}</div>
                      <div><strong>Speech Recognition:</strong> {diagnosticReport.browser.supported ? 'Supported' : 'Not supported'}</div>
                      <div><strong>User Agent:</strong> {diagnosticReport.browser.userAgent}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Network Tab */}
              {activeTab === 'network' && diagnosticReport && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Network Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Online:</strong> {diagnosticReport.network.online ? 'Yes' : 'No'}</div>
                      <div><strong>Connection Type:</strong> {diagnosticReport.network.effectiveType}</div>
                      <div><strong>Download Speed:</strong> {diagnosticReport.network.downlink} Mbps</div>
                      <div><strong>Round Trip Time:</strong> {diagnosticReport.network.rtt} ms</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Microphone Tab */}
              {activeTab === 'microphone' && diagnosticReport && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Microphone Status</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Permission:</strong> {diagnosticReport.microphone.granted ? 'Granted' : 'Not granted'}</div>
                      {diagnosticReport.microphone.error && (
                        <div><strong>Error:</strong> {diagnosticReport.microphone.error}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-900 mb-2">Troubleshooting Tips</h3>
                    <ul className="space-y-1 text-sm text-yellow-800">
                      <li>• Check that your microphone is properly connected</li>
                      <li>• Ensure microphone permissions are granted in your browser</li>
                      <li>• Try refreshing the page and granting permissions again</li>
                      <li>• Check if other applications can access your microphone</li>
                      <li>• Try using a different browser (Chrome or Edge recommended)</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Recent Voice Recognition Events</h3>
                    <button
                      onClick={handleClearLogs}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Clear Logs
                    </button>
                  </div>
                  
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No voice recognition events logged yet.
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        {logs.slice(-20).reverse().map((log, index) => (
                          <div key={index} className="text-xs bg-white p-2 rounded border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-700">{log.event}</span>
                              <span className="text-gray-500">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {log.data && Object.keys(log.data).length > 0 && (
                              <pre className="text-gray-600 text-xs overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Voice Commands Tab */}
              {activeTab === 'commands' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Punctuation</h3>
                      <div className="space-y-1 text-sm">
                        {getVoiceCommandsHelp().punctuation.map(cmd => (
                          <div key={cmd} className="flex items-center space-x-2">
                            <span className="text-purple-600">"</span>
                            <span className="font-mono bg-white px-2 py-1 rounded text-xs">{cmd}</span>
                            <span className="text-purple-600">"</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Formatting</h3>
                      <div className="space-y-1 text-sm">
                        {getVoiceCommandsHelp().formatting.map(cmd => (
                          <div key={cmd} className="flex items-center space-x-2">
                            <span className="text-purple-600">"</span>
                            <span className="font-mono bg-white px-2 py-1 rounded text-xs">{cmd}</span>
                            <span className="text-purple-600">"</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Story Structure</h3>
                      <div className="space-y-1 text-sm">
                        {getVoiceCommandsHelp().story.map(cmd => (
                          <div key={cmd} className="flex items-center space-x-2">
                            <span className="text-purple-600">"</span>
                            <span className="font-mono bg-white px-2 py-1 rounded text-xs">{cmd}</span>
                            <span className="text-purple-600">"</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Symbols</h3>
                      <div className="space-y-1 text-sm">
                        {getVoiceCommandsHelp().symbols.slice(0, 6).map(cmd => (
                          <div key={cmd} className="flex items-center space-x-2">
                            <span className="text-purple-600">"</span>
                            <span className="font-mono bg-white px-2 py-1 rounded text-xs">{cmd}</span>
                            <span className="text-purple-600">"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Usage Tips</h3>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• Speak clearly and at a consistent volume</li>
                      <li>• Pause briefly before and after voice commands</li>
                      <li>• Use commands naturally in your speech flow</li>
                      <li>• Try different phrasings if a command isn't recognised</li>
                      <li>• Check the voice quality indicator for feedback</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last updated: {diagnosticReport?.timestamp ? new Date(diagnosticReport.timestamp).toLocaleString() : 'Never'}
            </div>
            <button
              onClick={onClose}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 