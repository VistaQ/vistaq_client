import React, { useId } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (inputProps: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  className = '',
  children,
}) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {children({
        id,
        ...(error ? { 'aria-describedby': errorId, 'aria-invalid': true } : {}),
      })}

      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Standard input class string — import and apply to <input> / <select> / <textarea>
 * to ensure consistent styling across all forms.
 */
export const inputClass = (error?: string) =>
  [
    'block w-full px-3 py-2.5 bg-white border rounded-lg text-sm text-gray-900',
    'placeholder-gray-400 transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500',
    error ? 'border-red-400' : 'border-gray-300',
  ].join(' ');

export default FormField;
