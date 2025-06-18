import { useState, useEffect } from 'react';
import CanvasBox from './CanvasBox';

export default function StoryCanvas({ canvasData, userProfile, onCanvasEdit }) {
  const [completionStats, setCompletionStats] = useState({
    totalSections: 0,
    completedSections: 0,
    percentage: 0
  });

  // Canvas structure with styling
  const canvasStructure = {
    character: {
      title: 'CHARACTER',
      color: 'border-purple-500',
      highlight: 'bg-purple-50',
      sections: {
        protagonist: 'Who is your main character? What drives them?',
        antagonist: 'Who or what opposes your protagonist?',
        supporting: 'What other characters shape the story?'
      }
    },
    plot: {
      title: 'PLOT',
      color: 'border-blue-500',
      highlight: 'bg-blue-50',
      sections: {
        actI: 'How does your story begin? What\'s the setup?',
        actII: 'What conflicts and obstacles arise?',
        actIII: 'How does everything resolve?'
      }
    },
    world: {
      title: 'WORLD',
      color: 'border-green-500',
      highlight: 'bg-green-50',
      sections: {
        setting: 'Where and when does your story take place?',
        history: 'What important events shaped this world?',
        rules: 'What are the rules or limitations of this world?'
      }
    },
    themes: {
      title: 'THEMES',
      color: 'border-yellow-500',
      highlight: 'bg-yellow-50',
      sections: {
        central: 'What is your story really about?',
        symbolism: 'What symbols or metaphors appear?',
        message: 'What do you want readers to understand?'
      }
    },
    voice: {
      title: 'VOICE',
      color: 'border-pink-500',
      highlight: 'bg-pink-50',
      sections: {
        tone: 'What mood or atmosphere do you want?',
        style: 'How formal or casual is your writing?',
        pov: 'Who is telling the story and how?'
      }
    }
  };

  // Calculate overall completion
  useEffect(() => {
    let total = 0;
    let completed = 0;

    Object.keys(canvasStructure).forEach(category => {
      const sections = canvasStructure[category].sections;
      total += Object.keys(sections).length;
      
      Object.keys(sections).forEach(section => {
        if (canvasData[category]?.[section]?.trim()) {
          completed++;
        }
      });
    });

    setCompletionStats({
      totalSections: total,
      completedSections: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  }, [canvasData]);

  // Determine layout mode based on user preferences
  const layoutMode = userProfile?.writerType === 'explorer' ? 'organic' : 'structured';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white rounded-t-lg shadow-sm border-b px-6 py-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Your Story Canvas</h2>
            <p className="text-sm text-gray-600 mt-1">
              {layoutMode === 'organic' 
                ? 'Let your story unfold naturally - click any section to add ideas'
                : 'Build your story systematically - fill each section methodically'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Progress Indicator */}
            <div className="flex items-center space-x-2">
              <div className="relative w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${completionStats.percentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {completionStats.percentage}%
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {completionStats.completedSections}/{completionStats.totalSections} sections
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Grid */}
      <div className="flex-1 bg-white rounded-b-lg shadow-lg p-6" style={{ height: 'calc(100% - 100px)' }}>
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Top Row */}
          <div className="h-full">
            <CanvasBox 
              title={canvasStructure.character.title}
              data={canvasData.character}
              structure={canvasStructure.character}
              layoutStyle={layoutMode}
              onEdit={onCanvasEdit}
              category="character"
            />
          </div>
          <div className="h-full">
            <CanvasBox 
              title={canvasStructure.plot.title}
              data={canvasData.plot}
              structure={canvasStructure.plot}
              layoutStyle={layoutMode}
              onEdit={onCanvasEdit}
              category="plot"
            />
          </div>

          {/* Middle Row */}
          <div className="h-full">
            <CanvasBox 
              title={canvasStructure.world.title}
              data={canvasData.world}
              structure={canvasStructure.world}
              layoutStyle={layoutMode}
              onEdit={onCanvasEdit}
              category="world"
            />
          </div>
          <div className="h-full">
            <CanvasBox 
              title={canvasStructure.themes.title}
              data={canvasData.themes}
              structure={canvasStructure.themes}
              layoutStyle={layoutMode}
              onEdit={onCanvasEdit}
              category="themes"
            />
          </div>

          {/* Bottom Row - Voice spans full width */}
          <div className="col-span-2 h-full">
            <CanvasBox 
              title={canvasStructure.voice.title}
              data={canvasData.voice}
              structure={canvasStructure.voice}
              layoutStyle={layoutMode}
              onEdit={onCanvasEdit}
              category="voice"
            />
          </div>
        </div>
      </div>

      {/* Completion Celebration */}
      {completionStats.percentage === 100 && (
        <div className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-4 text-center">
          <h3 className="text-lg font-bold mb-1">🎉 Congratulations! Your story canvas is complete!</h3>
          <p className="text-sm opacity-90">You've built a solid foundation. Ready to export your story plan?</p>
        </div>
      )}
    </div>
  );
}