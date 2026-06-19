import { type FormEvent, useState } from "react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { LayoutDashboard } from "lucide-react";

interface SaveTemplateDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  initialName?: string;
  confirmLabel?: string;
  backdropClassName?: string;
  containerClassName?: string;
  onClose: () => void;
  onConfirm: (name: string) => void | Promise<void>;
}

function SaveTemplateForm({
  initialName,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  initialName: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch {
      // Error toast handled by API layer (mutation onError or caller)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div>
        <label
          htmlFor="dashboard-template-name"
          className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Template name
        </label>
        <input
          id="dashboard-template-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Operations view"
          autoFocus
          className="w-full rounded-xs border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-500/50 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-100"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || isSubmitting} loading={isSubmitting}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}

export function SaveTemplateDialog({
  open,
  title,
  subtitle,
  initialName = "",
  confirmLabel = "Save",
  backdropClassName,
  containerClassName,
  onClose,
  onConfirm,
}: SaveTemplateDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={LayoutDashboard}
      centerModal
      maxWidth="max-w-md"
      backdropClassName={backdropClassName}
      containerClassName={containerClassName}
    >
      {open ? (
        <SaveTemplateForm
          key={initialName}
          initialName={initialName}
          confirmLabel={confirmLabel}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      ) : null}
    </Modal>
  );
}
