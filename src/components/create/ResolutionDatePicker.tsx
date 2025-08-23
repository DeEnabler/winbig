'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, addYears, parse, isValid } from 'date-fns';

interface ResolutionDatePickerProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  error?: string;
}

const QUICK_OPTIONS = [
  { label: '1 Month', getDate: () => addMonths(new Date(), 1) },
  { label: '6 Months', getDate: () => addMonths(new Date(), 6) },
  { label: '1 Year', getDate: () => addYears(new Date(), 1) }
];

export default function ResolutionDatePicker({
  selected,
  onSelect,
  disabled = (date) => date < new Date(new Date().setHours(0, 0, 0, 0)),
  className,
  error
}: ResolutionDatePickerProps) {
  const [textInput, setTextInput] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (selected) {
      setTextInput(format(selected, 'MM/dd/yyyy'));
    }
  }, [selected]);

  const handleQuickSelect = (getDate: () => Date) => {
    const date = getDate();
    onSelect(date);
    setTextInput(format(date, 'MM/dd/yyyy'));
  };

  const handleTextInputChange = (value: string) => {
    setTextInput(value);
    
    const formats = ['MM/dd/yyyy', 'MM/dd/yy', 'M/d/yyyy', 'M/d/yy'];
    
    for (const formatStr of formats) {
      try {
        const parsedDate = parse(value, formatStr, new Date());
        if (isValid(parsedDate) && !disabled(parsedDate)) {
          onSelect(parsedDate);
          return;
        }
      } catch {
        continue;
      }
    }
    
    if (!value.trim()) {
      onSelect(undefined);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Quick Options */}
      <div className="flex gap-2">
        {QUICK_OPTIONS.map((option) => (
          <Button
            key={option.label}
            type="button"
            variant={selected && format(selected, 'yyyy-MM-dd') === format(option.getDate(), 'yyyy-MM-dd') ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickSelect(option.getDate)}
            className="flex-1 min-h-[40px]"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Date Input and Calendar */}
      <div className="flex gap-2">
        <Input
          placeholder="MM/DD/YYYY"
          value={textInput}
          onChange={(e) => handleTextInputChange(e.target.value)}
          className="flex-1 min-h-[40px]"
        />
        
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-[40px] min-w-[40px]"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
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

      {/* Selected Date Display */}
      {selected && (
        <p className="text-sm text-gray-600">
          Resolves: {format(selected, 'EEEE, MMMM do, yyyy')}
        </p>
      )}

      {/* Error Display */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
