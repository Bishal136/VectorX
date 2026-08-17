import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ open, onClose, title, children }) => {
  const overlayRef = useRef();
  const modalRef = useRef();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus management and key listeners when modal opens
  useEffect(() => {
    if (!open) return;

    // Focus the first form input or first focusable element when modal opens
    const inputElement = modalRef.current?.querySelector('input:not([type="hidden"]), select, textarea');
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0];

    if (inputElement) {
      inputElement.focus();
    } else if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
      }
      if (e.key === 'Tab') {
        const currentFocusables = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!currentFocusables || currentFocusables.length === 0) return;
        const first = currentFocusables[0];
        const last = currentFocusables[currentFocusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col"
      >
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;