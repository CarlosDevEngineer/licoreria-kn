'use client';

import { useEffect, useRef, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  error?: string;
}

export default function CustomSelect({ value, onChange, options, placeholder, className, error }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-sm text-left flex items-center justify-between gap-2 min-w-0 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-800 ${error ? 'border-red-400' : 'border-gray-300'} ${!selected ? 'text-gray-400' : 'text-gray-800'}`}>
        <span className="truncate">{selected ? selected.label : (placeholder || 'Seleccionar')}</span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto left-0 w-full">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 md:px-4 md:py-3 text-sm hover:bg-gray-100 cursor-pointer ${opt.value === value ? 'bg-gray-100 font-semibold' : ''} ${!opt.value ? 'text-gray-400' : 'text-gray-800'}`}>
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
