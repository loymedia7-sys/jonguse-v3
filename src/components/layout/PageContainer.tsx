import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  icon,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {icon && (
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bayon tracking-wide text-stone-900">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-stone-600 font-khmer mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Main Page Layout */}
      <div>{children}</div>
    </div>
  );
};
