'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, ChevronDown, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, addWeeks, addMonths, addYears, parse, isValid } from 'date-fns';

interface ResolutionDatePickerProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  error?: string;
}

interface PresetOption {
  label: string;
  value: string;
  getDate: () => Date;
  category: 'short' | 'medium' | 'long';
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    label: '1 Week',
    value: '1w',
    getDate: () => addWeeks(new Date(), 1),
    category: 'short'
  },
  {
    label: '2 Weeks',
    value: '2w',
    getDate: () => addWeeks(new Date(), 2),
    category: 'short'
  },
  {
    label: '1 Month',
    value: '1m',
    getDate: () => addMonths(new Date(), 1),
    category: 'medium'
  },
  {
    label: '3 Months',
    value: '3m',
    getDate: () => addMonths(new Date(), 3),
    category: 'medium'
  },
  {
    label: '6 Months',
    value: '6m',
    getDate: () => addMonths(new Date(), 6),
    category: 'medium'
  },
  {
    label: '1 Year',
    value: '1y',
    getDate: () => addYears(new Date(), 1),
    category: 'long'
  },
  {
    label: '2 Years',
    value: '2y',
    getDate: () => addYears(new Date(), 2),
    category: 'long'
  },
  {
    label: '5 Years',
    value: '5y',
    getDate: () => addYears(new Date(), 5),
    category: 'long'
  }
];

const CONTEXT_SUGGESTIONS = {
  election: [
    { label: 'Election Day 2024', date: new Date(2024, 10, 5) },
    { label: 'Election Day 2026', date: new Date(2026, 10, 3) },
    { label: 'Election Day 2028', date: new Date(2028, 10, 7) }
  ],
  earnings: [
    { label: 'End of Q1 2024', date: new Date(2024, 2, 31) },
    { label: 'End of Q2 2024', date: new Date(2024, 5, 30) },
    { label: 'End of Q3 2024', date: new Date(2024, 8, 30) },
    { label: 'End of Q4 2024', date: new Date(2024, 11, 31) }
  ],
  sports: [
    { label: 'Super Bowl 2025', date: new Date(2025, 1, 9) },
    { label: 'World Cup 2026', date: new Date(2026, 6, 19) }
  ]
};

export default function ResolutionDatePicker({
  selected,
  onSelect,
  disabled = (date) => date < new Date(new Date().setHours(0, 0, 0, 0)),
  className,
  error
}: ResolutionDatePickerProps) {
  const [mode, setMode] = useState<'presets' | 'advanced'>('presets');
  const [textInput, setTextInput] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Generate year options (current year + 10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear + i);
  
  const monthOptions = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

  useEffect(() => {
    if (selected) {
      setSelectedYear(selected.getFullYear().toString());
      setSelectedMonth(selected.getMonth().toString());
      setTextInput(format(selected, 'MM/dd/yyyy'));
    }
  }, [selected]);

  const handlePresetSelect = (preset: PresetOption) => {
    const date = preset.getDate();
    onSelect(date);
    setTextInput(format(date, 'MM/dd/yyyy'));
  };

  const handleTextInputChange = (value: string) => {
    setTextInput(value);
    
    // Try to parse common date formats
    const formats = ['MM/dd/yyyy', 'MM/dd/yy', 'M/d/yyyy', 'M/d/yy', 'yyyy-MM-dd'];
    
    for (const formatStr of formats) {
      try {
        const parsedDate = parse(value, formatStr, new Date());
        if (isValid(parsedDate) && !disabled(parsedDate)) {
          onSelect(parsedDate);
          return;
        }
      } catch {
        // Continue to next format
      }
    }
    
    // If no format matched and input is cleared, clear selection
    if (!value.trim()) {
      onSelect(undefined);
    }
  };

  const handleYearMonthChange = () => {
    if (selectedYear && selectedMonth) {
      const date = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
      onSelect(date);
      setTextInput(format(date, 'MM/dd/yyyy'));
    }
  };

  useEffect(() => {
    handleYearMonthChange();
  }, [selectedYear, selectedMonth]);

  const getContextSuggestions = (text: string): Array<{ label: string; date: Date }> => {
    const lowerText = text.toLowerCase();
    let suggestions: Array<{ label: string; date: Date }> = [];

    if (lowerText.includes('election') || lowerText.includes('vote') || lowerText.includes('president')) {
      suggestions = [...suggestions, ...CONTEXT_SUGGESTIONS.election];
    }
    if (lowerText.includes('earnings') || lowerText.includes('quarter') || lowerText.includes('q1') || lowerText.includes('q2') || lowerText.includes('q3') || lowerText.includes('q4')) {
      suggestions = [...suggestions, ...CONTEXT_SUGGESTIONS.earnings];
    }
    if (lowerText.includes('super bowl') || lowerText.includes('world cup') || lowerText.includes('sport')) {
      suggestions = [...suggestions, ...CONTEXT_SUGGESTIONS.sports];
    }

    return suggestions.filter(s => s.date > new Date());
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={mode === 'presets' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('presets')}
          className="flex items-center gap-2 min-h-[40px] touch-manipulation"
        >
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Select</span>
          <span className="sm:hidden">Quick</span>
        </Button>
        <Button
          type="button"
          variant={mode === 'advanced' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('advanced')}
          className="flex items-center gap-2 min-h-[40px] touch-manipulation"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Custom Date</span>
          <span className="sm:hidden">Custom</span>
        </Button>
      </div>

      {mode === 'presets' ? (
        <div className="space-y-4">
          {/* Quick Presets */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Common Timeframes</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {PRESET_OPTIONS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={selected && format(selected, 'yyyy-MM-dd') === format(preset.getDate(), 'yyyy-MM-dd') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                  className="justify-center touch-manipulation min-h-[44px] active:scale-95 transition-transform"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Text Input for Natural Language */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Or type a date</Label>
            <Input
              placeholder="e.g., 12/31/2024, Election Day 2026"
              value={textInput}
              onChange={(e) => handleTextInputChange(e.target.value)}
              className="w-full min-h-[44px] touch-manipulation"
              inputMode="text"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports MM/DD/YYYY format
            </p>
          </div>

          {/* Calendar Popup for Precision */}
          <div>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal min-h-[44px] touch-manipulation"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {selected ? format(selected, 'PPP') : 'Pick specific date'}
                  </span>
                  <ChevronDown className="ml-auto h-4 w-4 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selected}
                  onSelect={(date) => {
                    onSelect(date);
                    if (date) {
                      setTextInput(format(date, 'MM/dd/yyyy'));
                    }
                    setIsCalendarOpen(false);
                  }}
                  disabled={disabled}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Year/Month Dropdowns */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Year/Month Selection</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Text Input */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Enter Date Manually</Label>
            <Input
              placeholder="MM/DD/YYYY"
              value={textInput}
              onChange={(e) => handleTextInputChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Full Calendar */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Calendar View</Label>
            <div className="rounded-md border">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(date) => {
                  onSelect(date);
                  if (date) {
                    setTextInput(format(date, 'MM/dd/yyyy'));
                  }
                }}
                disabled={disabled}
                className="rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Selected Date Display */}
      {selected && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800">
            Selected: {format(selected, 'EEEE, MMMM do, yyyy')}
          </p>
          <p className="text-xs text-green-600">
            {Math.ceil((selected.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days from now
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
