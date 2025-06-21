import { Switch } from '@headlessui/react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function ChatHeader({ title, isAdaptiveMode, onToggleAdaptiveMode }) {
    return (
        <div className="p-4 border-b bg-gray-50 rounded-t-lg flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            
            {typeof isAdaptiveMode !== 'undefined' && (
                <div className="flex items-center">
                    <span className={`mr-2 text-sm font-medium ${isAdaptiveMode ? 'text-purple-700' : 'text-gray-500'}`}>
                        Adaptive
                    </span>
                    <Switch
                        checked={isAdaptiveMode}
                        onChange={onToggleAdaptiveMode}
                        className={classNames(
                            isAdaptiveMode ? 'bg-purple-600' : 'bg-gray-200',
                            'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={classNames(
                                isAdaptiveMode ? 'translate-x-5' : 'translate-x-0',
                                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
                            )}
                        />
                    </Switch>
                </div>
            )}
        </div>
    );
}