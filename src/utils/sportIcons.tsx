import React from 'react';
import { SportId } from '../types/sports';

export const getSportIcon = (id: SportId, className: string = "w-6 h-6") => {
  switch (id) {
    case 'football':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="12 8 15 10 14 13 10 13 9 10 12 8" fill="currentColor" opacity="0.2" />
          <path d="m12 2v6" />
          <path d="m19.07 4.93-4.24 4.24" />
          <path d="m22 12h-6" />
          <path d="m19.07 19.07-4.24-4.24" />
          <path d="m12 22v-6" />
          <path d="m4.93 19.07 4.24-4.24" />
          <path d="m2 12h6" />
          <path d="m4.93 4.93 4.24 4.24" />
        </svg>
      );
    case 'volleyball':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a15.3 15.3 0 0 1 0 20" />
          <path d="M2 12h20" />
          <path d="M4.93 4.93c3.5 3.5 3.5 10.64 0 14.14" />
          <path d="M19.07 4.93c-3.5 3.5-3.5 10.64 0 14.14" />
        </svg>
      );
    case 'basketball':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          <path d="M2 12h20" />
          <path d="M5 5c3.5 3.5 10.5 3.5 14 0" />
          <path d="M5 19c3.5-3.5 10.5-3.5 14 0" />
        </svg>
      );
    case 'pickleball':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H9.5a3.5 3.5 0 0 0-3.5 3.5v9a3.5 3.5 0 0 0 3.5 3.5h5a3.5 3.5 0 0 0 3.5-3.5v-9a3.5 3.5 0 0 0-3.5-3.5z" />
          <path d="M12 18v4" />
          <circle cx="12" cy="9" r="2.5" fill="currentColor" opacity="0.3" />
          <circle cx="12" cy="9" r="1" fill="currentColor" />
        </svg>
      );
    case 'badminton':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c-3 4-5 8-5 12a5 5 0 0 0 10 0c0-4-2-8-5-12z" />
          <path d="M12 14v8" />
          <path d="M7 14h10" />
          <path d="M8.5 17h7" />
        </svg>
      );
    case 'tugofwar':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12h20" strokeWidth="3" />
          <circle cx="7" cy="12" r="3" fill="currentColor" opacity="0.3" />
          <circle cx="17" cy="12" r="3" fill="currentColor" opacity="0.3" />
          <path d="M5 9l-3 3 3 3" />
          <path d="M19 9l3 3-3 3" />
        </svg>
      );
    case 'chess':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4" />
          <path d="M10 4h4" />
          <path d="M6 18h12l-1-9h-10l-1 9z" />
          <path d="M4 22h16" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
        </svg>
      );
    case 'xiangqi':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="7" strokeDasharray="2 2" />
          <path d="M12 7v10" />
          <path d="M7 12h10" />
        </svg>
      );
    case 'caro':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M5 5l4 4" strokeWidth="2.5" className="text-pink-500" />
          <path d="M9 5l-4 4" strokeWidth="2.5" className="text-pink-500" />
          <circle cx="18" cy="18" r="2" strokeWidth="2.5" className="text-indigo-500" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );
  }
};
