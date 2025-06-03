import type { ReactNode } from 'react';
import { getModalContainerClasses, getModalContentClasses } from './modal-utils';

/**
 * Server Modal Layout Component
 *
 * Optimized server component for static modal structure rendering without client-side JavaScript.
 * Handles the modal container and content wrapper while ClientModalWrapper handles overlay and interactions.
 * This component reduces client-side JavaScript bundle size by rendering modal structure on the server.
 *
 * Usage Examples:
 *
 * // Basic modal layout
 * <ServerModalLayout>
 *   <AuthForm />
 * </ServerModalLayout>
 *
 * // Modal layout with custom styling
 * <ServerModalLayout className="custom-modal-styles">
 *   <CustomContent />
 * </ServerModalLayout>
 *
 * // Used with ClientModalWrapper for complete modal functionality
 * <ClientModalWrapper isOpen={isOpen} onClose={handleClose}>
 *   <ServerModalLayout>
 *     <ModalContent />
 *   </ServerModalLayout>
 * </ClientModalWrapper>
 */

interface ServerModalLayoutProps {
  children: ReactNode;
  className?: string;
}

export function ServerModalLayout({ children, className = '' }: ServerModalLayoutProps) {
  const containerClasses = getModalContainerClasses();
  const contentClasses = getModalContentClasses();

  return (
    <div className={containerClasses}>
      <div className={`${contentClasses} ${className}`}>{children}</div>
    </div>
  );
}
