/* ====================================================================================================
 * FileName: DateInputDDMMYYYY.jsx
 * Folder: frontend/src/components/
 * 
 * Purpose:
 * Dual-Mode Date Input supporting:
 * 1. Manual typing in DD-MM-YYYY format (e.g. 25-10-2026, 25/10/2026, or 25102026)
 * 2. Visual calendar picker via 📅 button that auto-formats to DD-MM-YYYY
 * 3. Shows placeholder 'dd-mm-yyyy' instead of browser's default 'mm/dd/yyyy'
 * ==================================================================================================== */

import React, { useState, useEffect, useRef } from 'react';
import { formatDateDDMMYYYY } from '../utils/security';

export default function DateInputDDMMYYYY({
  value,
  onChange,
  placeholder = 'dd-mm-yyyy',
  required = false,
  className = 'form-input',
  style = {},
  inputStyle = {},
  disabled = false,
  min,
  max,
  id,
  name
}) {
  const [displayText, setDisplayText] = useState('');
  const pickerRef = useRef(null);

  // Sync internal display when external value changes
  useEffect(() => {
    if (!value) {
      setDisplayText('');
      return;
    }
    // If value is already in DD-MM-YYYY format
    if (typeof value === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(value.trim())) {
      setDisplayText(value.trim());
    } else {
      // If it's ISO or Date object
      const formatted = formatDateDDMMYYYY(value, '');
      if (formatted && formatted !== 'Today' && formatted !== 'Invalid Date') {
        setDisplayText(formatted);
      } else {
        setDisplayText(String(value));
      }
    }
  }, [value]);

  const handleTextChange = (e) => {
    const raw = e.target.value;
    const normalized = raw.replace(/[\/\.]/g, '-');
    const clean = normalized.replace(/[^0-9-]/g, '').slice(0, 10);
    setDisplayText(clean);

    // If 8 continuous digits like 25102026
    const digitsOnly = clean.replace(/\D/g, '');
    if (digitsOnly.length === 8 && !clean.includes('-')) {
      const d = digitsOnly.slice(0, 2);
      const m = digitsOnly.slice(2, 4);
      const y = digitsOnly.slice(4, 8);
      const formatted = `${d}-${m}-${y}`;
      const iso = `${y}-${m}-${d}`;
      setDisplayText(formatted);
      if (onChange) onChange(iso, formatted);
      return;
    }

    const match = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      const iso = `${y}-${m}-${d}`;
      if (onChange) onChange(iso, clean);
    } else {
      if (onChange) onChange(clean, clean);
    }
  };

  const handleCalendarChange = (e) => {
    const selectedIso = e.target.value; // YYYY-MM-DD
    if (selectedIso) {
      const formatted = formatDateDDMMYYYY(selectedIso);
      setDisplayText(formatted);
      if (onChange) onChange(selectedIso, formatted);
    }
  };

  const openCalendar = () => {
    if (pickerRef.current) {
      if (typeof pickerRef.current.showPicker === 'function') {
        pickerRef.current.showPicker();
      } else {
        pickerRef.current.focus();
      }
    }
  };

  // Convert current value / displayText to YYYY-MM-DD for native picker sync
  const getPickerIsoValue = () => {
    if (!displayText) return '';
    const match = displayText.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return '';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%', ...style }}>
      <input
        type="text"
        id={id}
        name={name}
        className={className}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={displayText}
        onChange={handleTextChange}
        style={{
          paddingRight: '2.5rem',
          width: '100%',
          letterSpacing: '0.5px',
          fontWeight: 600,
          color: '#800020',
          borderRadius: '6px',
          border: '1.5px solid #d4af37',
          background: '#fff',
          fontSize: '0.9rem',
          ...inputStyle
        }}
        title="Format: dd-mm-yyyy (Type manually or click 📅 for calendar)"
      />
      <label
        onClick={openCalendar}
        style={{
          position: 'absolute',
          right: '8px',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: '1.15rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          userSelect: 'none'
        }}
        title="Open Calendar (Select DD-MM-YYYY)"
      >
        📅
        <input
          ref={pickerRef}
          type="date"
          min={min}
          max={max}
          disabled={disabled}
          value={getPickerIsoValue()}
          onChange={handleCalendarChange}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: disabled ? 'default' : 'pointer'
          }}
          tabIndex={-1}
        />
      </label>
    </div>
  );
}
