/**
 * Shared utility functions for modal styling
 * Used by ServerModalLayout and ClientModalWrapper components
 */

/**
 * CSS classes for modal overlay (outermost container)
 */
export const MODAL_OVERLAY_CLASSES = 'fixed inset-0 z-50 flex items-center justify-center';

/**
 * CSS classes for modal backdrop (click-to-close background)
 */
export const MODAL_BACKDROP_CLASSES =
  'fixed inset-0 bg-slate-900/50 backdrop-blur backdrop-opacity-85';

/**
 * CSS classes for modal container (content positioning)
 */
export const MODAL_CONTAINER_CLASSES = 'relative z-50 w-full max-w-4xl m-0 md:m-4';

/**
 * CSS classes for modal content (styled content wrapper)
 */
export const MODAL_CONTENT_CLASSES =
  'bg-slate-900/10 border-slate-400/15 border-2 rounded-xl backdrop-blur backdrop-opacity-85 drop-shadow-lg overflow-hidden';

/**
 * Modal styling configuration object
 */
export interface ModalClasses {
  overlay: string;
  backdrop: string;
  container: string;
  content: string;
}

/**
 * Get all modal CSS classes as a structured object
 * @returns Object containing all modal styling classes
 */
export function getModalClasses(): ModalClasses {
  return {
    overlay: MODAL_OVERLAY_CLASSES,
    backdrop: MODAL_BACKDROP_CLASSES,
    container: MODAL_CONTAINER_CLASSES,
    content: MODAL_CONTENT_CLASSES,
  };
}

/**
 * Get modal overlay classes (for ClientModalWrapper)
 * @returns CSS classes for the modal overlay
 */
export function getModalOverlayClasses(): string {
  return MODAL_OVERLAY_CLASSES;
}

/**
 * Get modal backdrop classes (for ClientModalWrapper)
 * @returns CSS classes for the modal backdrop
 */
export function getModalBackdropClasses(): string {
  return MODAL_BACKDROP_CLASSES;
}

/**
 * Get modal container classes (for ServerModalLayout)
 * @returns CSS classes for the modal container
 */
export function getModalContainerClasses(): string {
  return MODAL_CONTAINER_CLASSES;
}

/**
 * Get modal content classes (for ServerModalLayout)
 * @returns CSS classes for the modal content wrapper
 */
export function getModalContentClasses(): string {
  return MODAL_CONTENT_CLASSES;
}
