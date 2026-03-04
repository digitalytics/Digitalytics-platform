'use client';

import { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface InputOtpProps {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function InputOtp({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
}: InputOtpProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (index: number) => {
    refs.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    // Accept only last typed digit
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);

    if (digit) {
      if (index < length - 1) {
        focusAt(index + 1);
      } else {
        // Last slot filled
        refs.current[index]?.blur();
        const code = next.join('');
        if (code.length === length && !code.includes('')) {
          onComplete?.(code);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        const next = [...value];
        next[index] = '';
        onChange(next);
      } else if (index > 0) {
        const next = [...value];
        next[index - 1] = '';
        onChange(next);
        focusAt(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const next = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    onChange(next);
    const lastFilled = Math.min(pasted.length, length - 1);
    focusAt(lastFilled);
    if (pasted.length === length) {
      onComplete?.(pasted);
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, i) => {
        const filled = !!value[i];
        const borderClass = hasError
          ? 'border-red-400 bg-red-50'
          : filled
          ? 'border-[#004D3E] bg-[#004D3E]/5 text-[#004D3E]'
          : 'border-gray-300 bg-white';

        return (
          <input
            key={i}
            ref={el => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={2} // allow 2 so we can grab the last digit on change
            value={value[i] ?? ''}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={e => e.target.select()}
            disabled={disabled}
            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#004D3E]/20 disabled:opacity-50 disabled:cursor-not-allowed ${borderClass}`}
            autoComplete="one-time-code"
          />
        );
      })}
    </div>
  );
}
