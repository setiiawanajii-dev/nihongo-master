import { CircleCheck } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './ui';

export function SuccessDialog({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}>
    <div className="success-dialog-content">
      <span className="success-dialog-icon"><CircleCheck size={32} aria-hidden="true" /></span>
      <p role="status">{message}</p>
      <Button onClick={onClose}>Mengerti</Button>
    </div>
  </Modal>;
}
