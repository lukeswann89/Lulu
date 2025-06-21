import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ReplyPreview = ({ message, onCancel }) => (
    <motion.div
        layout
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        className="px-4 pt-3 border-t border-gray-200"
    >
        <div className="bg-gray-100 rounded-lg p-2 flex justify-between items-center text-sm">
            <div className="border-l-2 border-purple-500 pl-2">
                <p className="font-semibold text-gray-700">
                    Replying to {message.sender === 'user' ? 'yourself' : 'Lulu AI'}
                </p>
                <p className="text-gray-600 truncate">{message.message}</p>
            </div>
            <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-200">
                 <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    </motion.div>
);

export default function InputForm({ 
  onSendMessage, 
  isLoading, 
  replyingTo,
  onCancelReply,
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Focus input after loading
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text, replyingTo);
      setText('');
      onCancelReply();
    }
  };

  return (
    <div className="p-4 border-t bg-gray-50 flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex items-start space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask Lulu anything..."
            disabled={isLoading}
            rows={1}
            className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:cursor-not-allowed resize-none transition-colors text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </form>
      <AnimatePresence>
        {replyingTo && <ReplyPreview message={replyingTo} onCancel={onCancelReply} />}
      </AnimatePresence>
    </div>
  );
}