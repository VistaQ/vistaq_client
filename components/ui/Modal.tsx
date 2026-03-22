import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Optional gradient/color class for the header bar, e.g. 'bg-gradient-to-r from-blue-600 to-indigo-600' */
  headerClass?: string;
  /** Max width Tailwind class, e.g. 'max-w-md' (default) or 'max-w-2xl' */
  maxWidth?: string;
  children: React.ReactNode;
  /** Render custom header content after the title */
  headerContent?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  headerClass = 'bg-blue-600',
  maxWidth = 'max-w-md',
  children,
  headerContent,
}) => {
  const titleId = useId();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
      >
        {(title || headerContent) && (
          <div className={`${headerClass} px-6 py-4 flex items-center justify-between`}>
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold text-white truncate">
                  {title}
                </h2>
              )}
              {headerContent}
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="ml-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default Modal;
