import React from 'react';

interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmStyle?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmStyle = 'danger',
    onConfirm,
    onCancel
}) => {
    const confirmBtnColor = confirmStyle === 'danger'
        ? 'var(--accent-red)'
        : confirmStyle === 'warning'
            ? 'var(--accent-orange)'
            : 'var(--primary-blue)';

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <h2 style={{ color: confirmStyle === 'danger' ? 'var(--accent-red)' : 'inherit' }}>{title}</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>{message}</p>
                <div className="modal-actions">
                    <button className="btn-outline-small" onClick={onCancel}>{cancelLabel}</button>
                    <button
                        className="btn-primary-small"
                        style={{ background: confirmBtnColor, borderColor: confirmBtnColor }}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
