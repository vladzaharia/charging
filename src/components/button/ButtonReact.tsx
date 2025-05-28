import type { ElementType, ComponentPropsWithoutRef, ReactNode } from 'react';
import { useMemo } from 'react';

/**
 * Unified Button Component System
 *
 * This component consolidates all button patterns used throughout the application:
 * - Navigation buttons with active state detection
 * - Action buttons with click handlers
 * - Conditional buttons with show/hide logic
 * - Loading states with polling indicators
 * - Multiple variants and sizes
 *
 * Usage Examples:
 *
 * // Navigation button (automatically renders as <a>)
 * <ButtonReact href="/scan" variant="primary" isActive={true}>Scan</ButtonReact>
 *
 * // Action button
 * <ButtonReact onClick={handleClick} variant="secondary">Submit</ButtonReact>
 *
 * // Conditional button with loading state
 * <ButtonReact show={hasData} isLoading={isPolling} variant="charger">Begin Charging</ButtonReact>
 *
 * // Custom element type
 * <ButtonReact as="div" variant="white" size="sm">Custom</ButtonReact>
 */

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary' | 'white' | 'orange' | 'red' | 'yellow' | 'purple' | 'charger';
  disabled?: boolean;
  as?: ElementType;
  className?: string;
  // Navigation support
  href?: string;
  isActive?: boolean;
  // Conditional rendering support
  show?: boolean;
  // Loading/polling state support
  isLoading?: boolean;
  loadingIndicator?: ReactNode;
  // Size variants
  size?: 'sm' | 'md' | 'lg';
};

type ButtonProps<T extends ElementType> = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<T>, keyof ButtonBaseProps> & {
    as?: T;
  };

export const ButtonReact = <T extends ElementType = 'button'>({
  children,
  variant = 'primary',
  disabled = false,
  className = '',
  as,
  href,
  isActive = false,
  show = true,
  isLoading = false,
  loadingIndicator,
  size = 'md',
  ...props
}: ButtonProps<T>) => {
  // Memoize static objects to prevent recreation on every render (must be before early return)
  const sizeClasses = useMemo(
    () => ({
      sm: 'py-2 px-3 text-sm gap-2',
      md: 'py-4 px-6 gap-4',
      lg: 'py-6 px-8 text-lg gap-6',
    }),
    []
  );

  const variantClasses = useMemo(
    () => ({
      primary:
        'text-charge-green hover:text-slate-900 bg-slate-900/10 hover:bg-charge-green/75 border-charge-green',
      secondary:
        'text-charge-blue hover:text-slate-900 bg-slate-900/10 hover:bg-charge-blue/75 border-charge-blue',
      white: 'text-white hover:text-slate-900 bg-slate-900/10 hover:bg-white/75 border-white',
      orange:
        'text-orange-500 hover:text-slate-900 bg-slate-900/10 hover:bg-orange-500/75 border-orange-500',
      red: 'text-red-500 hover:text-slate-900 bg-slate-900/10 hover:bg-red-500/75 border-red-500',
      yellow:
        'text-yellow-500 hover:text-slate-900 bg-slate-900/10 hover:bg-yellow-500/75 border-yellow-500',
      purple:
        'text-purple-500 hover:text-slate-900 bg-slate-900/10 hover:bg-purple-500/75 border-purple-500',
      charger:
        'text-charge-green hover:text-slate-900 bg-slate-900/10 hover:bg-charge-green/75 border-charge-green',
    }),
    []
  );

  // Conditional rendering support
  if (!show) {
    return null;
  }

  const baseClasses =
    'flex flex-row items-center justify-center font-display backdrop-blur backdrop-opacity-85 drop-shadow-lg transition-all duration-300 border-2 rounded-xl';

  const disabledClasses =
    'text-slate-400 bg-slate-900/10 border-slate-400 border-2 cursor-not-allowed';

  // Active state classes for navigation
  const activeClasses = isActive ? 'ring-2 ring-white/50' : '';

  // Loading state classes
  const loadingClasses = isLoading ? 'animate-pulse' : '';

  // Determine component type
  let Component: ElementType = as || 'button';
  if (href && !as) {
    Component = 'a';
  }

  // Prepare props based on component type
  const componentProps: Record<string, unknown> = { ...props };
  if (Component === 'a' && href) {
    componentProps.href = href;
  }
  if (Component === 'button') {
    componentProps.disabled = disabled;
  }

  return (
    <Component
      className={`${baseClasses} ${sizeClasses[size]} ${disabled ? disabledClasses : variantClasses[variant]} ${activeClasses} ${loadingClasses} ${className}`}
      {...componentProps}
    >
      {children}
      {isLoading &&
        (loadingIndicator || (
          <div className="w-2 h-2 bg-current rounded-full animate-pulse ml-2"></div>
        ))}
    </Component>
  );
};
