import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Check } from 'lucide-react';

// options: [{ value, label }]
// selected: array of values (empty = todos)
export default function MultiSelectFilter({ label, options, selected, onChange, width = 'w-40' }) {
  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else onChange([...selected, value]);
  };

  const allCount = options.length;
  const isAll = selected.length === 0;
  const triggerLabel = isAll
    ? `${label}: Todos`
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label || label
      : `${label}: ${selected.length}/${allCount}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center justify-between gap-2 bg-slate-700 border border-slate-600 text-white h-8 text-sm rounded-md px-3 ${width} hover:bg-slate-600 transition-colors`}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-slate-800 border-slate-700 p-1.5 w-52" align="start">
        <button
          onClick={() => onChange([])}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <span className={`w-4 h-4 flex items-center justify-center ${isAll ? 'text-purple-400' : 'text-transparent'}`}>
            <Check className="w-3.5 h-3.5" />
          </span>
          Todos
        </button>
        <div className="h-px bg-slate-700 my-1" />
        <div className="max-h-64 overflow-y-auto">
          {options.map(o => (
            <label
              key={o.value}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
                className="border-slate-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}