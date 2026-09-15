'use client';

import React from 'react';

interface AccordItem {
  value: number; // 0 to 100
  accord: {
    name: string;
    color: string | null;
  };
}

interface MainAccordsBarsProps {
  accords: AccordItem[];
  locale?: 'ar' | 'en';
}

export function MainAccordsBars({ accords, locale = 'ar' }: MainAccordsBarsProps) {
  if (!accords || accords.length === 0) {
    return (
      <div className="text-sm text-neutral-400 dark:text-neutral-500 italic text-center py-2">
        {locale === 'ar' ? 'لا توجد نوتات عطرية مسجلة' : 'No accords registered'}
      </div>
    );
  }

  // Sort by percentage descending
  const sortedAccords = [...accords].sort((a, b) => b.value - a.value);

  // Fallback premium colors if color field is null
  const fallbackColors = [
    '#B8860B', // Dark Goldenrod
    '#8B5A2B', // Amber Bronze
    '#556B2F', // Olive Wood
    '#8B0000', // Dark Crimson
    '#CD853F', // Peru Spice
    '#D2B48C', // Leather Tan
  ];

  return (
    <div className="space-y-3 w-full" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {sortedAccords.map((item, idx) => {
        const percentage = Math.min(Math.max(item.value, 0), 100);
        const accordColor = item.accord.color || fallbackColors[idx % fallbackColors.length];
        
        return (
          <div key={idx} className="group flex flex-col space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors duration-200">
                {item.accord.name}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors duration-200">
                {percentage}%
              </span>
            </div>
            
            {/* Bar container */}
            <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-850 rounded-full overflow-hidden shadow-inner relative">
              {/* Animated fill bar with hover brightness micro-interactions */}
              <div
                className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden group-hover:brightness-110"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: accordColor,
                  backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.12) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.12) 75%, transparent 75%, transparent)`,
                  backgroundSize: '1rem 1rem'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default MainAccordsBars;
