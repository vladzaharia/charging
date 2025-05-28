'use client';

import { usePathname } from 'next/navigation';
import { ButtonReact } from './button/ButtonReact';

interface ButtonProps {
  path: string;
  className?: string;
  label?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export default function Button({
  path,
  className,
  label,
  disabled = false,
  children,
}: ButtonProps) {
  const pathname = usePathname();

  // Check if current path matches this nav item
  const isActive =
    path === '' ? pathname === '/' || pathname === '' : pathname.startsWith(`/${path}`);

  return (
    <ButtonReact
      href={`/${path}`}
      variant="primary"
      disabled={disabled}
      isActive={isActive}
      className={className}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label || undefined}
    >
      {children}
    </ButtonReact>
  );
}
