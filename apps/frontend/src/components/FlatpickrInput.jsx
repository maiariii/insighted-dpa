import React, { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

export const FlatpickrInput = ({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  disabled = false,
  minDate = undefined,
  allowInput = true,
  className = '',
  readOnly = false
}) => {
  const inputRef = useRef(null);
  const fpInstanceRef = useRef(null);

  const cleanDateVal = (val) => {
    if (!val || val === 'N/A' || val === 'null' || val === 'undefined') return undefined;
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : val;
  };

  useEffect(() => {
    if (!inputRef.current || disabled) {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
        fpInstanceRef.current = null;
      }
      return;
    }

    try {
      fpInstanceRef.current = flatpickr(inputRef.current, {
        dateFormat: 'Y-m-d',
        defaultDate: cleanDateVal(value),
        changeMonth: true,
        changeYear: true,
        allowInput,
        minDate,
        clickOpens: true,
        onChange: (selectedDates, dateStr) => {
          if (onChange) onChange(dateStr);
        }
      });
    } catch (err) {
      console.warn('Flatpickr init warning:', err);
    }

    return () => {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
        fpInstanceRef.current = null;
      }
    };
  }, [disabled, minDate, allowInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fpInstanceRef.current && value !== undefined) {
      const clean = cleanDateVal(value);
      try {
        if (clean) {
          fpInstanceRef.current.setDate(clean, false);
        } else {
          fpInstanceRef.current.clear(false);
        }
      } catch (err) {
        console.warn('Flatpickr setDate error:', err);
      }
    }
  }, [value]);

  if (disabled) {
    return (
      <input
        type="text"
        className="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full"
        disabled
        value="N/A"
      />
    );
  }

  const displayVal = value && value !== 'N/A' && value !== 'null' ? value : '';

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      placeholder={placeholder}
      className={className || "form-input border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-600"}
      value={displayVal}
      onChange={(e) => {
        if (onChange) onChange(e.target.value);
      }}
      readOnly={readOnly}
    />
  );
};
