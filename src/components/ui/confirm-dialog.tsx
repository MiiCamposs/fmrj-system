'use client';

import { useState, type ReactNode } from 'react';
import { buttonClasses } from './ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmacao consistente com o design (secao 23), substitui
 * window.confirm(). Renderiza apenas quando `open`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {description && (
          <div className="mt-2 text-sm text-neutral-600">{description}</div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className={buttonClasses.secondary}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? buttonClasses.danger : buttonClasses.primary}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook utilitario para controlar um ConfirmDialog. */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
  };
}
