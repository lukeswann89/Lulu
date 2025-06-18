export default function ChatHeader({ userProfile, voiceEnabled, isSpeaking, onVoiceToggle }) {
  const getAIPersonality = () => {
    if (!userProfile?.insights) return 'balanced';
    
    const { conversationStyle, primaryMode } = userProfile.insights;
    
    if (conversationStyle === 'energetic' && primaryMode === 'explorer') {
      return 'energetic-explorer';
    } else if (conversationStyle === 'reflective' && primaryMode === 'architect') {
      return 'thoughtful-architect';
    } else if (conversationStyle === 'energetic' && primaryMode === 'architect') {
      return 'focused-planner';
    } else if (conversationStyle === 'reflective' && primaryMode === 'explorer') {
      return 'contemplative-creative';
    }
    
    return 'balanced';
  };

  const aiPersonality = getAIPersonality();

  const getPersonalityMessage = () => {
    switch (aiPersonality) {
      case 'energetic-explorer':
        return 'Ready to explore wild ideas! 🚀';
      case 'thoughtful-architect':
        return 'Let\'s build this systematically 📋';
      case 'focused-planner':
        return 'Excited to organise your vision! ⭐';
      case 'contemplative-creative':
        return 'Reflecting deeply on your story 🌙';
      default:
        return 'Adapting to your creative style ✨';
    }
  };

  return (
    <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Lulu, Your Muse</h3>
            <p className="text-xs text-gray-600">
              {getPersonalityMessage()}
            </p>
          </div>
        </div>
        
        {/* Voice Response Toggle */}
        <button
          onClick={onVoiceToggle}
          className={`p-2 rounded-lg transition-all ${
            isSpeaking 
              ? 'bg-red-100 text-red-600 border-2 border-red-300 animate-pulse' 
              : voiceEnabled 
              ? 'bg-purple-100 text-purple-600 border-2 border-purple-300' 
              : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
          }`}
          title={isSpeaking ? 'Click to stop speaking' : voiceEnabled ? 'Voice responses on - Lulu will speak' : 'Voice responses off'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            {isSpeaking ? (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 9a1 1 0 10-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
            ) : voiceEnabled ? (
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.846 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.846l3.537-2.816a1 1 0 011.617.816zM16 10a1 1 0 01-.293.707A1 1 0 0114 10V8a1 1 0 112 0v2zm2-2a1 1 0 00-2 0v4a1 1 0 102 0V8z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.846 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.846l3.537-2.816a1 1 0 011.617.816zM15.707 6.293a1 1 0 010 1.414L13.414 10l2.293 2.293a1 1 0 01-1.414 1.414L12 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L10.586 10 8.293 7.707a1 1 0 011.414-1.414L12 8.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}