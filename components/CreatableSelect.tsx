import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { SelectOption } from './CustomSelect';

interface CreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

const CreatableSelect: React.FC<CreatableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione ou digite...',
  disabled = false,
  hasError = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(value.toLowerCase()));

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min((filteredOptions.length || 1) * 44 + 8, 264);
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownPos({
      top: openAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [filteredOptions.length]);

  const open = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const close = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const selectOption = (val: string) => {
    onChange(val);
    close();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      close();
    };
    const handleScroll = () => updatePosition();
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updatePosition]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex].value);
        } else {
          close();
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => Math.max(prev - 1, 0));
        }
        break;
      case 'Tab':
        if (isOpen) close();
        break;
    }
  };

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll('[data-option]');
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div 
        className={`custom-select-trigger ${hasError ? 'custom-select-error' : ''} ${isOpen ? 'custom-select-open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            open();
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) open();
          }}
          onKeyDown={handleKeyDown}
          onFocus={open}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 py-2.5"
        />
        <div 
          className="p-1 cursor-pointer flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            if (isOpen) close();
            else {
              inputRef.current?.focus();
              open();
            }
          }}
        >
          <ChevronDown
            size={16}
            className={`custom-select-chevron ${isOpen ? 'custom-select-chevron-open' : ''}`}
          />
        </div>
      </div>

      {isOpen && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          className="custom-select-dropdown"
          role="listbox"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 99999,
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <div
                  key={option.value}
                  data-option
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select-option ${isHighlighted ? 'custom-select-option-highlighted' : ''} ${isSelected ? 'custom-select-option-selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectOption(option.value);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="custom-select-option-content">
                    {option.icon && <span className="custom-select-option-icon">{option.icon}</span>}
                    <span>{option.label}</span>
                  </span>
                  {isSelected && <Check size={14} className="custom-select-check" />}
                </div>
              );
            })
          ) : (
            <div className="p-3 text-sm text-slate-500 text-center">
              Pressione Enter para usar "{value}"
            </div>
          )}
        </div>,
        document.body
      )}

      <style>{`
        .custom-select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0 12px 0 16px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          font-size: 14px;
          line-height: 1.5;
          color: #1e293b;
          transition: all 0.2s ease;
          min-height: 42px;
          cursor: text;
        }
        .custom-select-trigger:hover:not(.disabled) {
          border-color: #94a3b8;
        }
        .custom-select-trigger:focus-within:not(.disabled) {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .custom-select-open:not(.disabled) {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .custom-select-error {
          border-color: #fca5a5 !important;
          background: #fef2f2 !important;
        }
        .custom-select-error:focus-within {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
        }
        .custom-select-trigger.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f8fafc;
        }
        
        .custom-select-chevron {
          color: #94a3b8;
          transition: transform 0.2s ease;
        }
        .custom-select-chevron-open {
          transform: rotate(180deg);
        }

        .custom-select-dropdown {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
          overflow-y: auto;
          max-height: 264px;
          padding: 4px;
          animation: customSelectFadeIn 0.15s ease-out;
        }

        @keyframes customSelectFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .custom-select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          color: #334155;
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
          user-select: none;
        }
        .custom-select-option-highlighted {
          background: #f0f0ff;
          color: #1e293b;
        }
        .custom-select-option-selected {
          color: #4338ca;
          font-weight: 600;
        }
        .custom-select-option-selected.custom-select-option-highlighted {
          background: #eef2ff;
        }
        .custom-select-option-content {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .custom-select-option-icon {
          font-size: 16px;
          flex-shrink: 0;
        }
        .custom-select-check {
          color: #4338ca;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default CreatableSelect;
