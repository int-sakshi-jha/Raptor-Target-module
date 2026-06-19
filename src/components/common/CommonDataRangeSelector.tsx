import React, { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import { Calendar, ChevronDown } from "lucide-react";
import {
  format,
  addDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

// Custom CSS for better styling
const customStyles = `
  .react-datepicker {
    font-family: inherit;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background-color: #FFFFFF;
  }

  .dark .react-datepicker {
    background-color: #1D1E1F; /* 100 */
    border-color: #434344;
    color: #F5F5F5;
  }

  /* HEADER */
  .react-datepicker__header {
    background-color: #E0E2E7; /* 200 */
    border-bottom: 1px solid #D1D5DB;
  }

  .dark .react-datepicker__header {
    background-color: #27292A; /* 200 */
    border-color: #434344;
  }

  .react-datepicker__month-container {
    background-color: #E0E2E7;
  }

  .dark .react-datepicker__month-container {
    background-color: #27292A;
  }

  /* MONTH TITLE */
  .react-datepicker__current-month {
    color: #07090F; /* 900 */
    font-weight: 600;
  }

  .dark .react-datepicker__current-month {
    color: #F5F5F5;
  }

  /* DAY NAMES */
  .react-datepicker__day-name {
    color: #374151; /* 700 */
  }

  .dark .react-datepicker__day-name {
    color: #D3D3D3;
  }

  /* DAYS */
  .react-datepicker__day {
    color: #07090F;
  }

  .dark .react-datepicker__day {
    color: #F5F5F5;
  }

  /* HOVER */
  .react-datepicker__day:hover {
    background-color: #F3F4F6; /* 100 */
  }

  .dark .react-datepicker__day:hover {
    background-color: #434344; /* 300 */
  }

  /* SELECTED DAY */
  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected {
    background-color: #4B5563; /* 600 */
    color: #FFFFFF;
  }

  .dark .react-datepicker__day--selected,
  .dark .react-datepicker__day--keyboard-selected {
    background-color: #434344; /* 300 */
    color: #FFFFFF;
  }

  /* RANGE BACKGROUND */
  .react-datepicker__day--in-range {
    background-color: #E0E2E7; /* 200 */
    color: #07090F;
  }

  .react-datepicker__day--in-range:hover {
    background-color: #D1D5DB; /* 300 */
  }

  .dark .react-datepicker__day--in-range {
    background-color: #27292A; /* 200 */
    color: #D3D3D3;
  }

  .dark .react-datepicker__day--in-range:hover {
    background-color: #434344; /* 300 */
  }

  /* RANGE START & END */
  .react-datepicker__day--range-start,
  .react-datepicker__day--range-end {
    background-color: #374151; /* 700 */
    color: #FFFFFF;
  }

  .dark .react-datepicker__day--range-start,
  .dark .react-datepicker__day--range-end {
    background-color: #515253; /* 400 */
    color: #FFFFFF;
  }

  /* OPTIONAL: Rounded edges */
  .react-datepicker__day--range-start {
    border-radius: 50% 0 0 50%;
  }

  .react-datepicker__day--range-end {
    border-radius: 0 50% 50% 0;
  }

  /* DISABLED */
  .react-datepicker__day--disabled {
    color: #9CA3AF;
    background-color: transparent;
  }

  .dark .react-datepicker__day--disabled {
    color: #515253;
  }

  /* NAVIGATION */
  .react-datepicker__navigation {
    color: #6B7280;
  }

  .dark .react-datepicker__navigation {
    color: #9E9EA0;
  }

  /* MONTH + YEAR DROPDOWN */
  .react-datepicker__month-select,
  .react-datepicker__year-select {
    background-color: #E0E2E7;
    color: #07090F;
    border-radius: 0.375rem;
    padding: 2px 6px;
  }

  .dark .react-datepicker__month-select,
  .dark .react-datepicker__year-select {
    background-color: #27292A;
    color: #F5F5F5;
  }

  /* FOCUS */
  .react-datepicker__month-select:focus,
  .react-datepicker__year-select:focus {
    outline: none;
    box-shadow: 0 0 0 2px #9CA3AF;
  }

  .dark .react-datepicker__month-select:focus,
  .dark .react-datepicker__year-select:focus {
    box-shadow: 0 0 0 2px #434344;
  }
`;

export interface DateRangeType {
  startDate: Date;
  endDate: Date;
}

interface CommonDateRangeSelectorProps {
  dateRange: DateRangeType;
  onDateRangeChange: (dateRange: DateRangeType) => void;
  label?: string;
  maxDays?: number;
  className?: string;
  isEmpty?: boolean;
  placeholder?: string;
  onClear?: () => void;
}

const CommonDateRangeSelector: React.FC<CommonDateRangeSelectorProps> = ({
  dateRange,
  onDateRangeChange,
  label,
  maxDays = 31,
  className = "",
  isEmpty = false,
  placeholder = "Select date range",
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(
    dateRange.startDate,
  );
  const [tempEndDate, setTempEndDate] = useState<Date | null>(
    dateRange.endDate,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync temp dates with prop changes
  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      if (isEmpty) {
        setTempStartDate(null);
        setTempEndDate(null);
        return;
      }

      // Safety check for valid dates
      const startDate =
        dateRange.startDate instanceof Date
          ? dateRange.startDate
          : new Date(dateRange.startDate);
      const endDate =
        dateRange.endDate instanceof Date
          ? dateRange.endDate
          : new Date(dateRange.endDate);

      // Only set if dates are valid
      if (!isNaN(startDate.getTime())) {
        setTempStartDate(startDate);
      }
      if (!isNaN(endDate.getTime())) {
        setTempEndDate(endDate);
      }
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [dateRange.startDate, dateRange.endDate, isEmpty]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset temp dates if dropdown is closed without applying
        if (isEmpty) {
          setTempStartDate(null);
          setTempEndDate(null);
        } else {
          setTempStartDate(dateRange.startDate);
          setTempEndDate(dateRange.endDate);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, dateRange.startDate, dateRange.endDate, isEmpty]);

  const quickPresets = [
    {
      label: "Today",
      getValue: () => ({
        startDate: startOfDay(new Date()),
        endDate: endOfDay(new Date()),
      }),
    },
    {
      label: "Yesterday",
      getValue: () => ({
        startDate: startOfDay(subDays(new Date(), 1)),
        endDate: endOfDay(subDays(new Date(), 1)),
      }),
    },
    {
      label: "Last 7 Days",
      getValue: () => ({
        startDate: startOfDay(subDays(new Date(), 6)),
        endDate: endOfDay(new Date()),
      }),
    },
    {
      label: "Last 30 Days",
      getValue: () => ({
        startDate: startOfDay(subDays(new Date(), 29)),
        endDate: endOfDay(new Date()),
      }),
    },
    {
      label: "This Week",
      getValue: () => ({
        startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
        endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: "Last Week",
      getValue: () => ({
        startDate: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
        endDate: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
      }),
    },
    {
      label: "This Month",
      getValue: () => ({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
      }),
    },
    {
      label: "Last Month",
      getValue: () => ({
        startDate: startOfMonth(subMonths(new Date(), 1)),
        endDate: endOfMonth(subMonths(new Date(), 1)),
      }),
    },
  ];

  const handlePresetClick = (preset: (typeof quickPresets)[0]) => {
    const newRange = preset.getValue();
    onDateRangeChange(newRange);
    setTempStartDate(newRange.startDate);
    setTempEndDate(newRange.endDate);
    setIsOpen(false);
  };

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setTempStartDate(start);
    setTempEndDate(end);

    // If both dates are selected, validate and apply
    if (start && end) {
      const daysDiff = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff > maxDays) {
        alert(`Date range cannot exceed ${maxDays} days`);
        setTempEndDate(null); // Reset end date to allow re-selection
        return;
      }
      // Apply the date range
      onDateRangeChange({ startDate: start, endDate: end });
      setIsOpen(false);
    }
  };

  // Function to check if a date is selectable (for filterDate)
  const isDateSelectable = (date: Date) => {
    const minDate = new Date("2020-01-01");
    const maxDate = new Date("2030-12-31");

    // Restrict to minDate and maxDate
    if (date < minDate || date > maxDate) {
      return false;
    }

    // If selecting start date (tempStartDate is null) or both dates are selected, allow all dates in range
    if (!tempStartDate || tempEndDate) {
      return true;
    }

    // If selecting end date, restrict to maxDays after tempStartDate
    const maxEndDate = addDays(tempStartDate, maxDays);
    return date >= startOfDay(tempStartDate) && date <= endOfDay(maxEndDate);
  };

  const formatDateRange = () => {
    if (isEmpty || !dateRange.startDate || !dateRange.endDate) {
      return placeholder;
    }

    // Safety check for valid dates
    const startDate =
      dateRange.startDate instanceof Date
        ? dateRange.startDate
        : new Date(dateRange.startDate);
    const endDate =
      dateRange.endDate instanceof Date
        ? dateRange.endDate
        : new Date(dateRange.endDate);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return placeholder;
    }

    return `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd, yyyy")}`;
  };

  const getInstructionText = () => {
    if (!tempStartDate) {
      return "Select start date";
    } else if (!tempEndDate) {
      return `Select end date (within ${maxDays} days)`;
    } else {
      return "Date range selected";
    }
  };

  return (
    <div className={`w-full ${className}`} ref={dropdownRef}>
      <style>{customStyles}</style>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xs bg-white dark:bg-neutral-dark-200 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent min-h-[2.5rem]"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <span>{formatDateRange()}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-neutral-dark-200 border border-neutral-300 dark:border-neutral-600 rounded-xs shadow-lg">
            {onClear && (
              <div className="flex justify-end px-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setTempStartDate(null);
                    setTempEndDate(null);
                    setIsOpen(false);
                  }}
                  className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  Clear
                </button>
              </div>
            )}
            {/* Quick Presets */}
            <div className="p-2 border-b border-neutral-200 dark:border-neutral-700">
              <h4 className="text-xs font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Quick Presets
              </h4>
              <div className="grid grid-cols-2 gap-1">
                {quickPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetClick(preset)}
                    className="text-left px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-dark-400 rounded-xs"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Date Picker */}
            <div className="p-2">
              <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                {getInstructionText()}
              </div>
              <DatePicker
                selected={tempStartDate}
                onChange={handleDateChange}
                startDate={tempStartDate}
                endDate={tempEndDate}
                openToDate={tempStartDate ?? tempEndDate ?? new Date()}
                selectsRange
                inline
                filterDate={isDateSelectable}
                dateFormat="MMM dd, yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                className="w-full"
                minDate={new Date("2020-01-01")}
                maxDate={new Date("2030-12-31")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommonDateRangeSelector;
