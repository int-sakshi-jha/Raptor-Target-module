import React from 'react';

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  selected: string;
  onChange: (key: string) => void;
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const tabSizeStyles = {
  sm: 'min-h-8 min-w-8 px-3 py-1.5 text-xs',
  md: 'min-h-9 min-w-9 px-4 py-2 text-sm',
  lg: 'min-h-10 min-w-10 px-5 py-2.5 text-base',
};

const iconOnlySizeStyles = {
  sm: 'h-8 w-8 p-0',
  md: 'h-9 w-9 p-0',
  lg: 'h-10 w-10 p-0',
};

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(({
  tabs,
  selected,
  onChange,
  className = '',
  iconOnly = false,
  size = 'sm',
}, ref) => {
  return (
    <div ref={ref} className={`flex flex-nowrap rounded-xs items-center border border-neutral-200 dark:border-neutral-dark-300 bg-white dark:bg-transparent ${className}`}>
      {tabs.map(tab => (
        <button
          type="button"
          key={tab.key}
          onClick={() => onChange(tab.key)}
          aria-selected={selected === tab.key}
          className={`flex items-center justify-center gap-2 rounded-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-dark-100
            ${iconOnly ? iconOnlySizeStyles[size] : tabSizeStyles[size]}
            ${selected === tab.key
              ? 'bg-brand-600 text-white shadow-card-md'
              : 'text-neutral-700 dark:text-neutral-dark-900 hover:bg-brand-50 dark:hover:bg-neutral-dark-200'}
          `}
        >
          {tab.icon && <span className="w-5 h-5 flex items-center justify-center">{tab.icon}</span>}
          {!iconOnly && tab.label}
        </button>
      ))}
    </div>
  );
});

Tabs.displayName = 'Tabs';

export default Tabs; 
