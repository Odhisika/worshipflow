import React, { useEffect, useState } from 'react';
import { bibleApi, VersionInfo } from '../api/bible';
import { MdClose, MdCloudDownload, MdDelete, MdCheckCircle, MdError, MdInfo, MdLibraryBooks } from 'react-icons/md';
import './BibleImportModal.css';

interface Props {
  onClose: () => void;
  onImported: (version: string) => void;
}

const BibleImportModal: React.FC<Props> = ({ onClose, onImported }) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; msg: string }>({ type: null, msg: '' });
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  const loadVersions = async () => {
    try {
      const info = await bibleApi.getBibleVersionInfo();
      setVersions(info.map(([version, count]) => ({ version, count })));
    } catch (e) {
      console.error('Failed to load version info', e);
    }
  };

  useEffect(() => {
    loadVersions();
  }, []);

  const handleBrowse = async () => {
    try {
      const filePath = await bibleApi.openBibleFileDialog();
      if (filePath) {
        await doImport(filePath);
      }
    } catch (e) {
      setStatus({ type: 'error', msg: 'Failed to open file dialog' });
    }
  };

  const doImport = async (filePath: string) => {
    setImporting(true);
    setStatus({ type: 'info', msg: 'Importing Bible verses...' });
    setImportProgress(30);
    try {
      const [version, count] = await bibleApi.importBibleFile(filePath);
      setImportProgress(100);
      setStatus({ type: 'success', msg: `Imported ${count.toLocaleString()} verses for "${version}"` });
      await loadVersions();
      onImported(version);
    } catch (e: any) {
      setStatus({ type: 'error', msg: typeof e === 'string' ? e : (e?.message || 'Import failed') });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (version: string) => {
    try {
      await bibleApi.deleteBibleVersion(version);
      setConfirmDelete(null);
      setStatus({ type: 'success', msg: `Deleted "${version}"` });
      await loadVersions();
    } catch (e: any) {
      setStatus({ type: 'error', msg: 'Failed to delete version' });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const path = (file as any).path;
      if (path) {
        await doImport(path);
      } else {
        setStatus({ type: 'error', msg: 'Cannot access file path from drop. Use Browse instead.' });
      }
    }
  };

  return (
    <div className="bible-import-overlay" onClick={onClose}>
      <div className="bible-import-modal" onClick={e => e.stopPropagation()}>
        <div className="bible-import-header">
          <h2><MdLibraryBooks size={20} /> Add Bible Version</h2>
          <button className="bible-import-close" onClick={onClose}><MdClose size={22} /></button>
        </div>

        <div className="bible-import-body">
          <div
            className={`bim-drop-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="bim-drop-zone-icon"><MdCloudDownload /></div>
            <div className="bim-drop-zone-text">
              Drag & drop a Bible file here, or <strong>click Browse</strong>
            </div>
            <button className="bim-browse-btn" onClick={handleBrowse} disabled={importing}>
              Browse Files
            </button>
          </div>

          {status.type && (
            <div className="bim-status-section">
              <div className={`bim-status-message ${status.type}`}>
                {status.type === 'success' ? <MdCheckCircle size={18} /> :
                 status.type === 'error' ? <MdError size={18} /> :
                 <MdInfo size={18} />}
                {status.msg}
              </div>
              {importing && (
                <div className="bim-progress-bar">
                  <div className="bim-progress-fill" style={{ width: `${importProgress}%` }} />
                </div>
              )}
            </div>
          )}

          <div>
            <div className="bim-section-title">Imported Versions</div>
            {versions.length === 0 ? (
              <div className="bim-version-empty">No versions loaded yet</div>
            ) : (
              <div className="bim-version-list">
                {versions.map(v => (
                  <div key={v.version} className="bim-version-item">
                    <div className="bim-version-item-left">
                      <span className="bim-version-item-name">{v.version}</span>
                      <span className="bim-version-item-count">{v.count.toLocaleString()} verses</span>
                    </div>
                    <button
                      className="bim-version-item-delete"
                      onClick={() => setConfirmDelete(v.version)}
                    >
                      <MdDelete size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bim-info-section">
            <h4>Where to get free Bible files</h4>
            <p>
              Download Zefania XML files from trusted sources. These are open-standard files
              compatible with WorshipFlow.
            </p>
            <div className="bim-info-formats">
              <span className="bim-format-badge">Zefania XML (.xml)</span>
              <span className="bim-format-badge">OSIS XML (.xml/.osis)</span>
              <span className="bim-format-badge">WorshipFlow JSON (.json)</span>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="bim-confirm-delete-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="bim-confirm-delete-box" onClick={e => e.stopPropagation()}>
            <h3>Delete "{confirmDelete}"?</h3>
            <p>This will permanently remove all verses for this version from the database.</p>
            <div className="bim-confirm-actions">
              <button className="bim-confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="bim-confirm-delete" onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BibleImportModal;
