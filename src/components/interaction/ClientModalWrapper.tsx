'use client';

import { useEffect, ReactNode } from 'react';

/**
 * Client Modal Wrapper Component
 *
 * Lightweight client component that adds interactive modal behavior to server-rendered
 * modal layouts. Handles keyboard events (Escape key) and click-to-close functionality
 * while keeping the modal layout rendering on the server.
 *
 * Usage Examples:
 *
 * // Wrap server modal layout with client interactions
 * <ClientModalWrapper isOpen={isOpen} onClose={handleClose}>
 *   <ModalLayout>
 *     <AuthForm />
 *   </ModalLayout>
 * </ClientModalWrapper>
 *
 * // With custom backdrop click handling
 * <ClientModalWrapper isOpen={isOpen} onClose={handleClose} enableBackdropClick={false}>
 *   <ModalLayout>
 *     <CriticalForm />
 *   </ModalLayout>
 * </ClientModalWrapper>
 */

interface ClientModalWrapperProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  enableBackdropClick?: boolean;
  enableEscapeKey?: boolean;
  className?: string;
}

export function ClientModalWrapper({
  children,
  isOpen,
  onClose,
  enableBackdropClick = true,
  enableEscapeKey = true,
  className = '',
}: ClientModalWrapperProps) {
  // Handle keyboard events (Escape key)
  useEffect(() => {
    if (!enableEscapeKey || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, enableEscapeKey]);

  // Conditional rendering support
  if (!isOpen) {
    return null;
  }

  // Handle backdrop click
  const handleBackdropClick = enableBackdropClick ? onClose : undefined;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop with optional click-to-close */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur backdrop-opacity-85"
        onClick={handleBackdropClick}
      />
      {/* Modal content (server-rendered) */}
      {children}
    </div>
  );
}
