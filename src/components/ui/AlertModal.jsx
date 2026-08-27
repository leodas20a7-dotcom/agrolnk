import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

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
    buttonVariant: 'primary',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-[#DC2626]',
    iconBg: 'bg-[#FEE2E2]',
    buttonVariant: 'primary',
  },
};

export default function AlertModal({
  isOpen,
  onClose,
  title = 'Notification',
  message,
  type = 'info',
  confirmText = 'Got it',
  onConfirm,
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
        <Button
          variant={config.buttonVariant}
          size="md"
          onClick={handleConfirm}
          className="w-full sm:w-auto font-bold py-2.5 px-6"
        >
          {confirmText}
        </Button>
      }
    >
      <div className="py-2">
        <p className="text-sm sm:text-base text-[#566861] leading-relaxed">
          {message}
        </p>
      </div>
    </Modal>
  );
}
