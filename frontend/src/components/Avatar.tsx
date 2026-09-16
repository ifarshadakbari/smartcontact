import React, { useState } from 'react';
import { PrefixTitle } from '../types';

interface AvatarProps {
  src?: string;
  prefix: PrefixTitle;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  prefix,
  name,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-lg',
  };

  const iconSizes = {
    sm: 18,
    md: 26,
    lg: 34,
    xl: 48,
  };

  const currentIconSize = iconSizes[size];

  if (src && !imgError) {
    return (
      <div
        className={`relative shrink-0 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 ${sizeClasses[size]} ${className}`}
      >
        <img
          src={src}
          alt={name || 'تصویر پرسنل'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback vector avatars based on prefix_title (خانم / آقای / بدون عنوان (مکانی))
  const isFemale = prefix === 'ms';
  const isLocation = prefix === 'location';

  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center border transition-colors bg-neutral-900 border-neutral-800 text-white ${sizeClasses[size]} ${className}`}
      title={isFemale ? 'خانم' : isLocation ? 'بدون عنوان (مکانی)' : 'آقای'}
    >
      {isFemale ? (
        // Minimalist female avatar SVG silhouette - matching male avatar style & linework
        <svg
          width={currentIconSize}
          height={currentIconSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          {/* Hair silhouette - flowing shoulder-length hair framing the face */}
          <path
            d="M14 26C13.5 16 17.5 8.5 24 8.5C30.5 8.5 34.5 16 34 26"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Head & Face */}
          <circle cx="24" cy="17" r="6.5" fill="currentColor" />
          {/* Hair parting accent */}
          <path
            d="M18.5 13.5C20.5 11.5 23.5 11.5 26.5 13"
            stroke="#94A3B8"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Delicate earring accents */}
          <circle cx="16" cy="19.5" r="1.1" fill="#94A3B8" />
          <circle cx="32" cy="19.5" r="1.1" fill="#94A3B8" />
          {/* Refined feminine shoulders */}
          <path
            d="M11 40C11 33.5 16.5 30.5 24 30.5C31.5 30.5 37 33.5 37 40"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Feminine necklace with subtle pendant accent */}
          <path
            d="M20.5 30.5C21.5 34.5 26.5 34.5 27.5 30.5"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="24" cy="34.5" r="1.2" fill="#94A3B8" />
        </svg>
      ) : isLocation ? (
        // Minimalist Location avatar SVG silhouette - matching male and female avatar style & linework
        <svg
          width={currentIconSize}
          height={currentIconSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          {/* Map pin marker contour */}
          <path
            d="M24 7C17.3726 7 12 12.3726 12 19C12 28.5 24 41 24 41C24 41 36 28.5 36 19C36 12.3726 30.6274 7 24 7Z"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Inner dot accent with identical #94A3B8 color */}
          <circle cx="24" cy="19" r="4.5" fill="#94A3B8" />
          {/* Subtle ground shadow indicator */}
          <path
            d="M17 41H31"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Minimalist male avatar SVG silhouette
        <svg
          width={currentIconSize}
          height={currentIconSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          {/* Hair & Head contour */}
          <circle cx="24" cy="16" r="8" fill="currentColor" />
          {/* Shoulders & Suit collar contour */}
          <path
            d="M10 40C10 33 16 30 24 30C32 30 38 33 38 40"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Tie or Collar accent */}
          <path
            d="M22 30L24 36L26 30"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
};
