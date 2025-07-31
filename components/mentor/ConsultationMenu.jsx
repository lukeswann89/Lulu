/**
 * ConsultationMenu.jsx - Mentor Consultation Menu Component
 * 
 * CHANGES MADE:
 * - Created new consultation menu with four edit options
 * - Implemented clean, professional card-based design
 * - Added icons and descriptions for each consultation type
 * - Custom Edit option is visually disabled as requested
 * - Follows "Illuminate, Don't Dictate" principle with clear choices
 */

import React from 'react';

const ConsultationMenu = ({ onSelect }) => {
    const consultationOptions = [
        {
            key: 'focusEdit',
            title: 'Focus Edit',
            description: 'Quick polish for line-level and copy improvements.',
            icon: '🎯',
            color: 'blue',
            available: true
        },
        {
            key: 'editorialReport',
            title: 'Editorial Report',
            description: 'Comprehensive analysis with structured feedback.',
            icon: '📋',
            color: 'green',
            available: true
        },
        {
            key: 'deepDive',
            title: 'Deep Dive',
            description: 'Full editorial assessment with strategic planning.',
            icon: '🔍',
            color: 'purple',
            available: true
        },
        {
            key: 'customEdit',
            title: 'Custom Edit',
            description: 'Tailored editing approach for specific needs.',
            icon: '⚙️',
            color: 'gray',
            available: false
        }
    ];

    const getCardStyles = (option) => {
        if (!option.available) {
            return 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60';
        }
        
        const colorMap = {
            blue: 'bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer',
            green: 'bg-white border-green-200 hover:border-green-400 hover:bg-green-50 cursor-pointer',
            purple: 'bg-white border-purple-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer',
        };
        
        return colorMap[option.color] || 'bg-white border-gray-200 hover:border-gray-400 hover:bg-gray-50 cursor-pointer';
    };

    const getIconStyles = (option) => {
        if (!option.available) {
            return 'text-gray-400';
        }
        
        const colorMap = {
            blue: 'text-blue-600',
            green: 'text-green-600', 
            purple: 'text-purple-600',
        };
        
        return colorMap[option.color] || 'text-gray-600';
    };

    const getTitleStyles = (option) => {
        if (!option.available) {
            return 'text-gray-500';
        }
        
        const colorMap = {
            blue: 'text-blue-800',
            green: 'text-green-800',
            purple: 'text-purple-800',
        };
        
        return colorMap[option.color] || 'text-gray-800';
    };

    const handleOptionClick = (option) => {
        if (option.available && onSelect) {
            onSelect(option.key);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-green-800 mb-2">🎓 Consultation Menu</h3>
                <p className="text-sm text-green-600">
                    Choose how you'd like to receive editorial guidance for your manuscript.
                </p>
            </div>

            <div className="space-y-4">
                {consultationOptions.map((option) => (
                    <div
                        key={option.key}
                        className={`border-2 rounded-lg p-4 transition-all duration-200 ${getCardStyles(option)}`}
                        onClick={() => handleOptionClick(option)}
                    >
                        <div className="flex items-start space-x-4">
                            <div className={`text-2xl ${getIconStyles(option)}`}>
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-semibold mb-1 ${getTitleStyles(option)}`}>
                                    {option.title}
                                    {!option.available && (
                                        <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                            Coming Soon
                                        </span>
                                    )}
                                </h4>
                                <p className={`text-sm ${option.available ? 'text-gray-600' : 'text-gray-500'}`}>
                                    {option.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700">
                    💡 <strong>Clarity is the Highest Form of Kindness:</strong> Each option is designed to provide focused, actionable feedback tailored to your current needs.
                </p>
            </div>
        </div>
    );
};

export default ConsultationMenu;