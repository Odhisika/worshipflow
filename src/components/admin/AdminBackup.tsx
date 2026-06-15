import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdBackup, MdRestore, MdRefresh } from 'react-icons/md';
import { backupApi, BackupInfo } from '../../api/backup';
import { useDataRefresh } from '../../context/DataRefreshContext';
import ConfirmModal from './ConfirmModal';
import './AdminViews.css';

const AdminBackup: React.FC = () => {
    const [backups, setBackups] = useState<BackupInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [backingUp, setBackingUp] = useState(false);
    const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const fetchData = async () => {
        setLoading(true);
        try { setBackups(await backupApi.listBackups()); }
        catch { toast.error('Failed to list backups.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleBackup = async () => {
        setBackingUp(true);
        try {
            const name = await backupApi.backupDatabase();
            toast.success(`Backup created: ${name}`);
            setResult(`Backup saved: ${name}`);
            triggerRefresh();
        } catch { toast.error('Backup failed.'); setResult('Backup failed.'); }
        finally { setBackingUp(false); }
    };

    const handleRestore = async (backupName: string) => {
        try {
            await backupApi.restoreDatabase(backupName);
            toast.success('Database restored. Reloading...');
            setConfirmRestore(null);
            setTimeout(() => window.location.reload(), 1500);
        } catch { toast.error('Restore failed.'); }
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Backup & Restore</h1><p>Create database backups and restore from previous snapshots.</p></div>
                <div className="admin-controls">
                    <button className="btn-outline-small" onClick={fetchData}><MdRefresh /></button>
                    <button className="btn-primary" onClick={handleBackup} disabled={backingUp}><MdBackup /> {backingUp ? 'Backing up...' : 'Create Backup'}</button>
                </div>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>File Name</th><th>Size</th><th>Created At</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={4} className="empty-table">Loading...</td></tr> :
                        backups.length === 0 ? <tr><td colSpan={4} className="empty-table">No backups yet. Create your first one!</td></tr> :
                        backups.map((b, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 600 }}><MdBackup style={{ marginRight: '8px' }} />{b.file_name}</td>
                                <td>{formatBytes(b.file_size)}</td>
                                <td>{new Date(b.created_at).toLocaleString()}</td>
                                <td>
                                    <button className="btn-text" style={{ color: 'var(--accent-yellow)' }} onClick={() => setConfirmRestore(b.file_name)}><MdRestore /> Restore</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {result && <div className="admin-overview-card" style={{ marginTop: '1rem' }}><p>{result}</p></div>}

            {confirmRestore && <ConfirmModal title="Restore Backup" message="Restoring will replace ALL current data with the backup. This cannot be undone. Are you sure?" confirmLabel="Restore" confirmStyle="danger" onConfirm={() => handleRestore(confirmRestore)} onCancel={() => setConfirmRestore(null)} />}
        </div>
    );
};

export default AdminBackup;
