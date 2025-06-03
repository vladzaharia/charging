/**
 * Shared utility functions for button styling
 * Used by both ServerButton and ButtonReact components
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'white'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'purple'
  | 'charger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Get size-specific CSS classes for buttons
 */
export function getSizeClasses(size: ButtonSize): string {
  const sizeMap: Record<ButtonSize, string> = {
    sm: 'py-2 px-3 text-sm gap-2',
    md: 'py-4 px-6 gap-4',
    lg: 'py-6 px-8 text-lg gap-6',
  };

  return sizeMap[size];
}

/**
 * Get variant-specific CSS classes for buttons
 */
export function getVariantClasses(variant: ButtonVariant): string {
  const variantMap: Record<ButtonVariant, string> = {
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
  };

  return variantMap[variant];
}

/**
 * Base CSS classes shared by all button variants
 */
export const BASE_BUTTON_CLASSES =
  'flex flex-row items-center justify-center font-display backdrop-blur backdrop-opacity-85 drop-shadow-lg transition-all duration-300 border-2 rounded-xl';

/**
 * CSS classes for disabled button state
 */
export const DISABLED_BUTTON_CLASSES =
  'text-slate-400 bg-slate-900/10 border-slate-400 border-2 cursor-not-allowed';
