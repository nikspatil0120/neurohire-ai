import React from 'react';

interface PythonLogoProps {
  className?: string;
  size?: number;
}

const PythonLogo: React.FC<PythonLogoProps> = ({ className = "", size = 20 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ minWidth: size, minHeight: size }}
    >
      <defs>
        <linearGradient id="python-gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3776AB"/>
          <stop offset="100%" stopColor="#4B8BBE"/>
        </linearGradient>
        <linearGradient id="python-gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD43B"/>
          <stop offset="100%" stopColor="#FFE873"/>
        </linearGradient>
      </defs>
      <path d="M12 2C8.686 2 6 4.686 6 8v3c0 1.657-1.343 3-3 3v2c1.657 0 3 1.343 3 3v3c0 3.314 2.686 6 6 6h1v-2h-1c-2.206 0-4-1.794-4-4v-3c0-1.86-1.277-3.412-3-3.85V11.85c1.723-.438 3-1.99 3-3.85V8c0-2.206 1.794-4 4-4h1V2h-1z" fill="url(#python-gradient1)"/>
      <path d="M12 22c3.314 0 6-2.686 6-6v-3c0-1.657 1.343-3 3-3v-2c-1.657 0-3-1.343-3-3V8c0-3.314-2.686-6-6-6h-1v2h1c2.206 0 4 1.794 4 4v3c0 1.86 1.277 3.412 3 3.85v.3c-1.723.438-3 1.99-3 3.85v3c0 2.206-1.794 4-4 4h-1v2h1z" fill="url(#python-gradient2)"/>
    </svg>
  );
};

export default PythonLogo;
