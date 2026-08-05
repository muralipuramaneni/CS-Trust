import { Button } from './Button';
import { Modal } from './Modal';

export function ConfirmDialog({
  open,
  title = 'Delete record',
  description = 'This action cannot be undone. Are you sure you want to delete this record?',
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} className="max-w-md">
      <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
