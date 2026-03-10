import React from 'react';
import { getEntityFullName } from './EntityNameMap';
import { cn } from '@/lib/utils';

/**
 * Badge com tooltip para exibir código abreviado de entidade
 * Mostra nome completo ao passar o mouse
 */
export default function EntityBadge({ 
  code, 
  className = '',
  variant = 'default',
  size = 'md'
}) {
  const fullName = getEntityFullName(code);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const variantClasses = {
    default: 'bg-slate-700 text-slate-100 border border-slate-600',
    primary: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    success: 'bg-green-600/20 text-green-400 border border-green-600/30',
    warning: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30',
  };

  return (
    <div className="relative group inline-block">
      <span 
        className={cn(
          'rounded font-medium whitespace-nowrap inline-flex items-center justify-center cursor-help transition-colors hover:opacity-80',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        {code}
      </span>
      
      {/* Tooltip - só mostra se tiver nome completo */}
      {fullName && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-slate-900 text-white text-xs rounded px-2.5 py-1.5 whitespace-nowrap border border-slate-700 shadow-lg max-w-xs">
            {fullName}
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
          </div>
        </div>
      )}
    </div>
  );
}