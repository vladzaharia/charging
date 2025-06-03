'use client';

import { useState, ReactNode } from 'react';
import { ClientModalWrapper } from './ClientModalWrapper';
import { ServerModalLayout } from '../modal/ServerModalLayout';

/**
 * Client Auth Wrapper Component
 *
 * Lightweight client component that manages authentication modal state and wraps
 * server-rendered auth buttons. Provides minimal client-side JavaScript for
 * modal open/close state management while keeping button rendering on the server.
 *
 * Usage Examples:
 *
 * // Wrap server auth button with modal state management
 * <ClientAuthWrapper>
 *   <ServerButton variant="primary">Sign In</ServerButton>
 * </ClientAuthWrapper>
 *
 * // With custom modal content
 * <ClientAuthWrapper modalContent={<CustomAuthForm />}>
 *   <ServerButton variant="secondary">Login</ServerButton>
 * </ClientAuthWrapper>
 *
 * // With custom initial state
 * <ClientAuthWrapper initialOpen={false}>
 *   <ServerButton variant="primary">Sign In</ServerButton>
 * </ClientAuthWrapper>
 */

interface ClientAuthWrapperProps {
  children: ReactNode;
  modalContent?: ReactNode;
  initialOpen?: boolean;
  className?: string;
  onStateChange?: (isOpen: boolean) => void;
}

export function ClientAuthWrapper({
  children,
  modalContent,
  initialOpen = false,
  className = '',
  onStateChange,
}: ClientAuthWrapperProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  // Handle modal open
  const handleOpen = () => {
    setIsOpen(true);
    onStateChange?.(true);
  };

  // Handle modal close
  const handleClose = () => {
    setIsOpen(false);
    onStateChange?.(false);
  };

  return (
    <div className={className}>
      {/* Wrap children with click handler to open modal */}
      <div onClick={handleOpen} className="cursor-pointer">
        {children}
      </div>

      {/* Render modal content when open */}
      {isOpen && modalContent && (
        <ClientModalWrapper isOpen={isOpen} onClose={handleClose}>
          <ServerModalLayout>{modalContent}</ServerModalLayout>
        </ClientModalWrapper>
      )}
    </div>
  );
}
