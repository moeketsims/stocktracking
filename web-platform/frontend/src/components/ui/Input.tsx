import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
}

// Premium enterprise input: height 40px, r-10, 1px border
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightIcon, className = '', id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const inputId = providedId || `input-${generatedId}`;
    const errorId = `error-${generatedId}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? 'true' : undefined}
            className={`
              block w-full h-10 rounded-card border border-gray-200 bg-white
              px-3 text-sm text-gray-900 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
              disabled:bg-gray-50 disabled:text-gray-500
              ${icon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
