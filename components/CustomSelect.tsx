import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled = false,
  hasError = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(options.length * 44 + 8, 264);
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownPos({
      top: openAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [options.length]);

  const open = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    const idx = options.findIndex(o => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  };

  const close = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const select = (val: string) => {
    onChange(val);
    close();
    triggerRef.current?.focus();
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          select(options[highlightedIndex].value);
        } else {
          open();
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
          setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
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

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll('[data-option]');
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`custom-select-trigger ${hasError ? 'custom-select-error' : ''} ${isOpen ? 'custom-select-open' : ''} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`custom-select-value ${!selectedOption ? 'custom-select-placeholder' : ''}`}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="custom-select-icon">{selectedOption.icon}</span>}
              {selectedOption.label}
            </>
          ) : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`custom-select-chevron ${isOpen ? 'custom-select-chevron-open' : ''}`}
        />
      </button>

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
          {options.map((option, index) => {
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
                  select(option.value);
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
          })}
        </div>,
        document.body
      )}

      <style>{`
        .custom-select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 9px 12px 9px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          font-size: 14px;
          line-height: 1.5;
          color: #1e293b;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
          text-align: left;
          font-family: inherit;
          min-height: 42px;
        }
        .custom-select-trigger:hover:not(:disabled) {
          border-color: #94a3b8;
        }
        .custom-select-trigger:focus:not(:disabled) {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .custom-select-open:not(:disabled) {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .custom-select-error {
          border-color: #fca5a5 !important;
          background: #fef2f2 !important;
        }
        .custom-select-error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
        }
        .custom-select-trigger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f8fafc;
        }
        .custom-select-value {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .custom-select-placeholder {
          color: #9ca3af;
        }
        .custom-select-icon {
          font-size: 16px;
          flex-shrink: 0;
        }
        .custom-select-chevron {
          flex-shrink: 0;
          color: #94a3b8;
          transition: transform 0.2s ease;
        }
        .custom-select-chevron-open {
          transform: rotate(180deg);
        }

        /* Dropdown menu */
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
    </>
  );
};

export default CustomSelect;
