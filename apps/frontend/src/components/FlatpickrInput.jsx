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

  useEffect(() => {
    if (!inputRef.current || disabled) {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
        fpInstanceRef.current = null;
      }
      return;
    }

    fpInstanceRef.current = flatpickr(inputRef.current, {
      dateFormat: 'Y-m-d',
      defaultDate: value || undefined,
      changeMonth: true,
      changeYear: true,
      allowInput,
      minDate,
      clickOpens: true,
      onChange: (selectedDates, dateStr) => {
        if (onChange) onChange(dateStr);
      }
    });

    return () => {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
        fpInstanceRef.current = null;
      }
    };
  }, [disabled, minDate, allowInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fpInstanceRef.current && value !== undefined) {
      fpInstanceRef.current.setDate(value || '', false);
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

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      placeholder={placeholder}
      className={className || "form-input border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-600"}
      defaultValue={value || ''}
      readOnly={readOnly}
    />
  );
};
