'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

export default function Logo({ className = '', size = 'md', variant = 'full' }: LogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizes = {
    sm: { height: 24, width: 120 },
    md: { height: 36, width: 180 },
    lg: { height: 50, width: 250 }
  };

  const currentSize = sizes[size];

  if (variant === 'icon') {
    return (
      <div 
        className={`relative ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`transition-all duration-500 ${isHovered ? 'scale-110 rotate-6' : ''}`}>
          <Image
            src="/ingredigo-logo.png"
            alt="IngrediGo"
            width={currentSize.height}
            height={currentSize.height}
            className="object-contain"
            priority
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center group cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Smile Emoji with orange-red glow */}
      <div className="text-3xl mr-2 transition-all duration-300 group-hover:scale-110 relative">
        <span className="drop-shadow-[0_0_8px_rgba(251,146,60,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">
          😊
        </span>
      </div>
      
      {/* Divider */}
      <div className="h-8 w-0.5 bg-gradient-to-b from-orange-400 via-orange-500 to-red-500 mr-3"></div>
      
      {/* IngrediGo Text */}
      <div className="font-bold text-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent transition-all duration-300 group-hover:from-orange-300 group-hover:via-orange-400 group-hover:to-red-400">
        IngrediGo
      </div>
    </div>
  );
}
