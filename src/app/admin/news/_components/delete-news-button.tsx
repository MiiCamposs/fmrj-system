'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { deleteNewsAction } from '../actions';

export function DeleteNewsButton({
  postId,
  title,
}: {
  postId: string;
  title: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await deleteNewsAction(postId);
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Notícia excluída.', 'success');
    router.replace('/admin/news');
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={buttonClasses.danger}
        onClick={() => setOpen(true)}
      >
        Excluir
      </button>
      <ConfirmDialog
        open={open}
        danger
        loading={loading}
        title="Excluir notícia?"
        description={
          <>
            <strong>{title}</strong> será removida permanentemente. Esta ação
            não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
