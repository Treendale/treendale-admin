import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  startOfDay,
} from 'date-fns';

interface AdminDatePickerProps {
  value: string;            // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className,
}: AdminDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseISO(value) : null;
  const today = startOfDay(new Date());
  
  // Keep track of the month currently displayed in the calendar
  const [viewMonth, setViewMonth] = useState(selectedDate || today);

  // Close calendar popup on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd   = endOfMonth(viewMonth);
    const calStart   = startOfWeek(monthStart);
    const calEnd     = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewMonth]);

  function handleSelect(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  }

  function prevMonth(e: React.MouseEvent) {
    e.stopPropagation();
    setViewMonth((m) => subMonths(m, 1));
  }

  function nextMonth(e: React.MouseEvent) {
    e.stopPropagation();
    setViewMonth((m) => addMonths(m, 1));
  }

  const displayValue = value ? format(parseISO(value), 'dd/MM/yyyy') : '';

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      <div className="relative">
        <input
          type="text"
          readOnly
          placeholder={placeholder}
          value={displayValue}
          onClick={() => setIsOpen(!isOpen)}
          className="input pr-10 cursor-pointer select-none text-left"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        />
        <Calendar
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-950/40 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* ── Dropdown Popup ── */}
      {isOpen && (
        <div
          className="absolute left-0 mt-2 z-50 p-4 rounded-xl border border-admin-border bg-white shadow-xl max-w-sm w-[280px]"
          role="dialog"
          aria-label="Choose a date"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-brand-500/10 text-brand-950/70 hover:text-brand-900 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-brand-950 text-sm">
              {format(viewMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-brand-500/10 text-brand-950/70 hover:text-brand-900 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-brand-950/30 text-xxs font-bold uppercase tracking-wider py-0.5">
                {wd[0]}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, viewMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const todayDay = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={clsx(
                    'aspect-square rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-center min-h-[32px] w-full',
                    !isCurrentMonth && 'text-brand-950/15',
                    isCurrentMonth && !isSelected && 'text-brand-950/80 hover:bg-brand-500/10 hover:text-brand-900',
                    todayDay && !isSelected && 'ring-1 ring-brand-500/50 text-brand-600 font-bold',
                    // Selected state: forces white color via CSS rule to avoid black-on-pink
                    isSelected && 'bg-gradient-to-br from-brand-500 to-brand-600 text-white-force font-bold shadow-md shadow-brand-500/20',
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
