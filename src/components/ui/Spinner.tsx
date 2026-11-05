import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', text, className = '' }) => {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-6 ${className}`}>
      <div
        className={`${sizeMap[size]} border-emerald-200 border-t-emerald-600 rounded-full animate-spin`}
      />
      {text && <p className="text-sm font-medium text-stone-600 animate-pulse">{text}</p>}
    </div>
  );
};
