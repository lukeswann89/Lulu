import { useState, useEffect } from 'react';
import ChatInterface from './ChatInterface';
import CreativeInsightsPanel from './CreativeInsightsPanel';

const TabButton = ({ label, icon, isActive, onClick, hasNotification }) => (
    <button
        onClick={onClick}
        className={`flex-1 pb-2 text-sm font-semibold border-b-2 flex items-center justify-center transition-colors duration-200 ${
            isActive
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
    >
        <span className="mr-2">{icon}</span>
        {label}
        {hasNotification && <span className="ml-2 w-2 h-2 bg-purple-500 rounded-full"></span>}
    </button>
);

export default function TabbedInterface({
    activeTab,
    setActiveTab,
    chatHistory,
    onNewMessage,
    onPinToCanvas,
    isLoading,
    userProfile,
    selectedMessage,
    onSelectMessage,
    hasNewInsight,
    setHasNewInsight,
    replyingTo,
    onSetReplyingTo,
    onCancelReply,
    isAdaptiveMode,
    onToggleAdaptiveMode,
    onApplyInsights,
    creativeSignature
}) {
    useEffect(() => {
        const savedTab = localStorage.getItem('museActiveTab');
        if (savedTab) {
            setActiveTab(savedTab);
        }
    }, [setActiveTab]);

    useEffect(() => {
        localStorage.setItem('museActiveTab', activeTab);
    }, [activeTab]);

    const handleTabClick = (tab) => {
        if (tab === 'insights') {
            setHasNewInsight(false);
            if (!selectedMessage && chatHistory.length > 0) {
                // If opening insights with no message selected, select the last AI message with insights
                const lastAiMessageWithInsights = [...chatHistory].reverse().find(m => m.sender === 'ai' && m.insights);
                if (lastAiMessageWithInsights) {
                    onSelectMessage(lastAiMessageWithInsights);
                }
            }
        }
        setActiveTab(tab);
    };

    return (
        <div className="h-full flex flex-col bg-white border-l border-gray-200">
            <div className="flex border-b border-gray-200">
                <TabButton
                    label="Chat"
                    icon="💬"
                    isActive={activeTab === 'chat'}
                    onClick={() => handleTabClick('chat')}
                />
                <TabButton
                    label="Insights"
                    icon="🧠"
                    isActive={activeTab === 'insights'}
                    onClick={() => handleTabClick('insights')}
                    hasNotification={hasNewInsight}
                />
            </div>
            <div className="flex-grow overflow-hidden">
                {activeTab === 'chat' ? (
                    <ChatInterface
                        chatHistory={chatHistory}
                        onNewMessage={onNewMessage}
                        onPinToCanvas={onPinToCanvas}
                        isLoading={isLoading}
                        userProfile={userProfile}
                        onSelectMessageForAnalysis={onSelectMessage}
                        replyingTo={replyingTo}
                        onSetReplyingTo={onSetReplyingTo}
                        onCancelReply={onCancelReply}
                        isAdaptiveMode={isAdaptiveMode}
                        onToggleAdaptiveMode={onToggleAdaptiveMode}
                    />
                ) : (
                    <CreativeInsightsPanel
                        selectedMessage={selectedMessage}
                        onBackToChat={() => setActiveTab('chat')}
                        isLoading={isLoading}
                        onApplyInsights={onApplyInsights}
                        creativeSignature={creativeSignature}
                    />
                )}
            </div>
        </div>
    );
} 