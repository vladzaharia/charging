import { headers } from 'next/headers';
import { ServerButton } from '../button/ServerButton';

/**
 * Server Navigation Button Component
 *
 * Optimized server component for navigation buttons with server-side active state detection.
 * Eliminates the need for client-side usePathname hook, reducing client bundle size.
 * Active state is determined on the server using request headers.
 *
 * Usage Examples:
 *
 * // Navigation button with icon
 * <ServerNavButton path="scan" className="text-3xl">
 *   <FontAwesomeIcon icon={faQrcode} />
 * </ServerNavButton>
 *
 * // Navigation button with text
 * <ServerNavButton path="chargers" label="View Chargers">
 *   Chargers
 * </ServerNavButton>
 *
 * // Root navigation (home)
 * <ServerNavButton path="" label="Home">
 *   Home
 * </ServerNavButton>
 */

interface ServerNavButtonProps {
  path: string;
  className?: string;
  label?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export async function ServerNavButton({
  path,
  className = '',
  label,
  disabled = false,
  children,
}: ServerNavButtonProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  // Normalize the path by removing leading slash if present
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  // Determine if this navigation item is active
  // Handle root path specially: normalizedPath === '' matches '/' or ''
  // For other paths: pathname must start with `/${normalizedPath}`
  const isActive =
    normalizedPath === ''
      ? pathname === '/' || pathname === ''
      : pathname.startsWith(`/${normalizedPath}`);

  // Construct the href - handle root path specially
  const href = normalizedPath === '' ? '/' : `/${normalizedPath}`;

  return (
    <ServerButton
      href={href}
      variant="primary"
      disabled={disabled}
      className={`${className} ${isActive ? 'ring-2 ring-white/50' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label || undefined}
    >
      {children}
    </ServerButton>
  );
}
