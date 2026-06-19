import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import Button from './Button';

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
  isLoading?: boolean;
  /** Tailwind z-index class for the overlay, e.g. z-[70] */
  overlayClassName?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false,
  overlayClassName = 'z-50',
}) => {
  if (!open) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="w-6 h-6 text-red-500 dark:text-red-400" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />;
      case 'info':
        return <Info className="w-6 h-6 text-brand-600" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-6 h-6 text-brand-600" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (type) {
      case 'danger':
        return 'danger';
      case 'success':
        return 'primary';
      case 'info':
        return 'primary';
      case 'warning':
      default:
        return 'primary';
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center ${overlayClassName}`}>
      <div className="card rounded-md shadow-card-lg max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {getIcon()}
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2"
            >
              {cancelText}
            </Button>
            <Button
              variant={getConfirmButtonVariant()}
              onClick={onConfirm}
              disabled={isLoading}
              loading={isLoading}
              className="px-4 py-2"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
