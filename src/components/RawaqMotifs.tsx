import React from 'react';

export const OliveBranchDecoration = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Curved Branch */}
    <path d="M50 450 C 150 400, 300 250, 450 50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    
    {/* Leaves - Left Side */}
    <path d="M150 367 C 120 330, 90 320, 90 320 C 100 350, 130 380, 150 367 Z" fill="currentColor" />
    <path d="M250 283 C 210 240, 170 230, 170 230 C 180 270, 220 310, 250 283 Z" fill="currentColor" />
    <path d="M350 200 C 310 150, 260 140, 260 140 C 270 190, 320 230, 350 200 Z" fill="currentColor" />
    
    {/* Leaves - Right Side */}
    <path d="M200 325 C 250 350, 290 330, 290 330 C 270 300, 230 290, 200 325 Z" fill="currentColor" />
    <path d="M300 242 C 360 270, 400 240, 400 240 C 370 210, 330 200, 300 242 Z" fill="currentColor" />
    <path d="M400 158 C 450 180, 490 150, 490 150 C 460 110, 420 100, 400 158 Z" fill="currentColor" />

    {/* Olives */}
    <circle cx="170" cy="300" r="10" fill="currentColor" />
    <circle cx="270" cy="210" r="12" fill="currentColor" />
    <circle cx="360" cy="130" r="11" fill="currentColor" />
  </svg>
);

export const SevenPointedStar = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polygon points="50,5 60,35 93,27 75,55 98,78 68,82 50,110 32,82 2,78 25,55 7,27 40,35" fill="currentColor" />
  </svg>
);

export const ArchFrame = ({ className, children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative ${className}`}>
    <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full pointer-events-none">
      <path d="M50 500 L50 200 C50 100, 150 20, 200 20 C250 20, 350 100, 350 200 L350 500" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" />
      <path d="M30 500 L30 200 C30 90, 130 0, 200 0 C270 0, 370 90, 370 200 L370 500" stroke="currentColor" strokeWidth="1" />
    </svg>
    <div className="relative z-10 w-full h-full pt-12 pb-8 px-10">
      {children}
    </div>
  </div>
);
