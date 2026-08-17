// src/hooks/useToast.js
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { toast } from 'react-toastify';


// ---- Toast Context ----
const ToastContext = createContext();

// ---- Toast Reducer ----
const initialState = {
  toasts: [],
};

const toastReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload.id),
      };
    case 'CLEAR_TOASTS':
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
};

let toastIdCounter = 0;

// ---- Toast Provider ----
export const ToastProvider = ({ children }) => {
  const [state, dispatch] = useReducer(toastReducer, initialState);

  const addToast = useCallback(({ type = 'info', message, duration = 5000 }) => {
    const id = ++toastIdCounter;
    const toast = { id, type, message, duration };
    dispatch({ type: 'ADD_TOAST', payload: toast });

    // Auto-remove after duration (if > 0)
    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: { id } });
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: { id } });
  }, []);

  const clearAllToasts = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' });
  }, []);

  const value = {
    toasts: state.toasts,
    addToast,
    removeToast,
    clearAllToasts,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

// ---- useToast hook ----
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast, removeToast, clearAllToasts } = context;

  // Convenience methods for different types
  const showToast = useCallback(
    (message, type = 'info', duration = 5000) => {
      addToast({ type, message, duration });
    },
    [addToast]
  );

  const success = useCallback(
    (message, duration = 5000) => showToast(message, 'success', duration),
    [showToast]
  );

  const error = useCallback(
    (message, duration = 5000) => showToast(message, 'error', duration),
    [showToast]
  );

  const warning = useCallback(
    (message, duration = 5000) => showToast(message, 'warning', duration),
    [showToast]
  );

  const info = useCallback(
    (message, duration = 5000) => showToast(message, 'info', duration),
    [showToast]
  );

  return {
    showToast,
    success,
    error,
    warning,
    info,
    removeToast,
    clearAllToasts,
    toasts: context.toasts,
  };
};

// ---- Optional: ToastContainer component to render toasts ----
// You can place this in your App.jsx or Layout.
export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded shadow-lg text-white transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'error'
              ? 'bg-red-500'
              : toast.type === 'warning'
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
          role="alert"
        >
          <div className="flex justify-between items-center">
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-white hover:text-gray-200"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default useToast;