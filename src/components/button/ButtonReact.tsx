import type { ElementType, ComponentPropsWithoutRef } from 'react';

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary' | 'white' | 'orange' | 'red' | 'yellow' | 'purple';
  disabled?: boolean;
  as?: ElementType;
  className?: string;
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
  ...props
}: ButtonProps<T>) => {
  const baseClasses =
    'flex flex-row items-center justify-center font-display p-4 gap-4 backdrop-blur backdrop-opacity-85 drop-shadow-lg transition-all duration-300 border-2 rounded-xl';

  const variantClasses = {
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
  };

  const disabledClasses =
    'text-slate-400 bg-slate-900/10 border-slate-400 border-2 cursor-not-allowed';

  const Component: ElementType = as || 'button';

  return (
    <Component
      className={`${baseClasses} ${disabled ? disabledClasses : variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </Component>
  );
};
