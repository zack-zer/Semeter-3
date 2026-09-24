import React from 'react';
import Modal from './Modal';

const ConfirmDialog = ({ isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) => {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel}>
      <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
