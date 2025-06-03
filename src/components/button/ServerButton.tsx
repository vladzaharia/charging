import type { ReactNode } from 'react';
import {
  getSizeClasses,
  getVariantClasses,
  BASE_BUTTON_CLASSES,
  DISABLED_BUTTON_CLASSES,
  type ButtonVariant,
  type ButtonSize,
} from './button-utils';

/**
 * Server Button Component
 *
 * Optimized server component for static button rendering without client-side JavaScript.
 * Handles all static button variants and automatically renders as anchor or button element
 * based on the href prop.
 *
 * Usage Examples:
 *
 * // Navigation link (renders as <a>)
 * <ServerButton href="/scan" variant="primary">Scan</ServerButton>
 *
 * // Static button (renders as <button>)
 * <ServerButton variant="secondary">Submit</ServerButton>
 *
 * // Disabled button
 * <ServerButton disabled variant="primary">Disabled</ServerButton>
 */

interface ServerButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false' | boolean;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

export function ServerButton({
  variant = 'primary',
  size = 'md',
  href,
  disabled = false,
  className = '',
  children,
  type = 'button',
  onClick,
  ...props
}: ServerButtonProps) {
  const sizeClasses = getSizeClasses(size);
  const variantClasses = getVariantClasses(variant);

  const finalClassName = `${BASE_BUTTON_CLASSES} ${sizeClasses} ${
    disabled ? DISABLED_BUTTON_CLASSES : variantClasses
  } ${className}`;

  // Render as anchor if href is provided and not disabled
  if (href && !disabled) {
    return (
      <a href={href} className={finalClassName} {...props}>
        {children}
      </a>
    );
  }

  // Render as button element
  return (
    <button disabled={disabled} type={type} className={finalClassName} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
