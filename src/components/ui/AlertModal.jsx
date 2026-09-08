import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Truck, HelpCircle } from 'lucide-react';

const VARIANTS = {
  info: {
    icon: Info,
    iconColor: 'text-[#10B981]',
    iconBg: 'bg-[#EBF5F0]',
    buttonVariant: 'primary',
  },
  success: {
    icon: CheckCircle2,
    iconColor: 'text-[#10B981]',
    iconBg: 'bg-[#DCFCE7]',
    buttonVariant: 'primary',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-[#D97706]',
    iconBg: 'bg-[#FEF3C7]',
    buttonVariant: 'accent',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-[#DC2626]',
    iconBg: 'bg-[#FEE2E2]',
    buttonVariant: 'primary',
  },
  dispatch: {
    icon: Truck,
    iconColor: 'text-[#0B3326]',
    iconBg: 'bg-[#DCFCE7]',
    buttonVariant: 'primary',
  },
  confirm: {
    icon: HelpCircle,
    iconColor: 'text-[#10B981]',
    iconBg: 'bg-[#EBF5F0]',
    buttonVariant: 'primary',
  },
};

export default function AlertModal({
  isOpen,
  onClose,
  title = 'Notification',
  message,
  description,
  type = 'info',
  confirmText = 'Got it',
  cancelText = 'Cancel',
  showCancel = false,
  onConfirm,
  onCancel,
  isProcessing = false,
}) {
  const config = VARIANTS[type] || VARIANTS.info;
  const IconComponent = config.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose?.();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose?.();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={IconComponent}
      iconColor={config.iconColor}
      iconBg={config.iconBg}
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
          {showCancel && (
            <Button
              variant="secondary"
              size="md"
              onClick={handleCancel}
              disabled={isProcessing}
              className="w-full sm:w-auto font-bold py-2.5 px-4 text-xs cursor-pointer"
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant={config.buttonVariant}
            size="md"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full sm:w-auto font-bold py-2.5 px-5 text-xs shadow-xs cursor-pointer"
          >
            {isProcessing ? 'Processing...' : confirmText}
          </Button>
        </div>
      }
    >
      <div className="py-2 space-y-2 text-left">
        <p className="text-sm text-[#14211D] font-medium leading-relaxed">
          {message}
        </p>
        {description && (
          <p className="text-xs text-[#566861] leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </Modal>
  );
}
