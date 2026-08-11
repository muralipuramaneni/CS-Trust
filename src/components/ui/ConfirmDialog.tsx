import { useState } from 'react';
import { Button } from './Button';
import type { ButtonVariant } from './Button';
import { Modal } from './Modal';

export function ConfirmDialog({
  open,
  title = 'Delete record',
  description = 'This action cannot be undone. Are you sure you want to delete this record?',
  confirmLabel = 'Delete',
  confirmVariant = 'destructive',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Parent handlers should surface errors; keep dialog open on failure.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      description={description}
      className="max-w-md"
    >
      <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          disabled={busy}
          onClick={() => void handleConfirm()}
        >
          {busy ? 'Deleting…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
