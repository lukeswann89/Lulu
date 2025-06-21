import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ActionMenu = ({ message, onReply, onPin, onAnalyze, onClose }) => {
    const isUser = message.sender === 'user';
    
    const menuVariants = {
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1 },
    };

    return (
        <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute z-10 bottom-full mb-2 -right-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
            <ul className="text-sm text-gray-700">
                <li><button onClick={onReply} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center">💬<span className="ml-2">Reply</span></button></li>
                <li><button onClick={onPin} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center">📌<span className="ml-2">Pin to Canvas</span></button></li>
                {isUser && <li><button onClick={onAnalyze} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center">🧠<span className="ml-2">View Insights</span></button></li>}
            </ul>
        </motion.div>
    );
};

export default function MessageBubble({ message, onSetReplyingTo, onPinToCanvas, onSelectMessageForAnalysis }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isUser = message.sender === 'user';
    const hasInsights = message.sender === 'ai' && message.insights;

    const handleMenuToggle = (e) => {
        e.stopPropagation();
        setMenuOpen(prev => !prev);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const closeMenu = () => setMenuOpen(false);
        if (menuOpen) {
            window.addEventListener('click', closeMenu);
        }
        return () => window.removeEventListener('click', closeMenu);
    }, [menuOpen]);

    const handlePinClick = () => {
      onPinToCanvas(message.message);
    };

    const handleInsightsClick = () => {
        onSelectMessageForAnalysis(message);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`flex group items-start ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <div className="w-8 h-8 rounded-full bg-purple-200 flex-shrink-0 flex items-center justify-center text-purple-600 font-bold text-sm">AI</div>}
            
            <div className={`relative mx-2 max-w-[85%] ${
                isUser ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'
            } rounded-lg p-3 shadow-sm`}>
                {message.replyTo && (
                     <div className="text-xs border-l-2 border-purple-300 pl-2 mb-2 opacity-80">
                         <p className="font-semibold">{message.replyTo.sender === 'user' ? "You" : "Lulu AI"}</p>
                         <p className="truncate">{message.replyTo.message}</p>
                     </div>
                 )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</div>
            </div>

            <div className="relative">
                 <button onClick={handleMenuToggle} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                 </button>
                 <AnimatePresence>
                    {menuOpen && (
                        <ActionMenu 
                            message={message}
                            onReply={() => { onSetReplyingTo(message); setMenuOpen(false); }}
                            onPin={() => { onPinToCanvas(message.message); setMenuOpen(false); }}
                            onAnalyze={() => { onSelectMessageForAnalysis(message); setMenuOpen(false); }}
                            onClose={() => setMenuOpen(false)}
                        />
                    )}
                 </AnimatePresence>
            </div>
            
            {isUser && <div className="w-8 h-8 rounded-full bg-blue-200 flex-shrink-0"></div>}
        </div>
    );
}