import React from 'react';

/**
 * Standard base Input UI primitive
 */
export function Input({
  label,
  error,
  id,
  type = 'text',
  className = '',
  disabled = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        disabled={disabled}
        className={`w-full rounded-lg border px-3.5 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default Input;
