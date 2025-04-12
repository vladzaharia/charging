import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur backdrop-opacity-85"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-4xl m-0 md:m-4">
        <div className="bg-slate-900/10 border-slate-400/15 border-2 rounded-xl backdrop-blur backdrop-opacity-85 drop-shadow-lg overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
