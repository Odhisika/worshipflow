import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { songApi, collectionApi, Song, CreateSongRequest, Collection } from '../api';
import { presentationApi } from '../api/presentation';
import { parseSongFile, ParsedSong } from '../utils/songImport';
import { MdLibraryMusic, MdAdd, MdDownload, MdClose, MdPlayArrow, MdFolder, MdEdit, MdDelete, MdSettings, MdCheck } from 'react-icons/md';
import './SongLibrary.css';

const SongLibrary: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [batchImport, setBatchImport] = useState<{
    songs: ParsedSong[];
    fileName: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCollections();
    loadSongs();
    if (location.state?.openModal === 'add-song') {
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadCollections = async () => {
    try {
      const data = await collectionApi.getAll();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const loadSongs = async (collectionId?: string) => {
    try {
      setLoading(true);
      const cid = collectionId ?? selectedCollectionId;
      let data: Song[];
      if (cid === '__uncategorized') {
        data = await collectionApi.getUncategorized();
      } else if (cid) {
        data = await collectionApi.getSongsByCollection(cid);
      } else {
        data = await songApi.getAll();
      }
      setSongs(data);
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionFilter = async (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setSearchQuery('');
    await loadSongs(collectionId);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await songApi.searchFts(query);
        setSongs(results);
      } catch {
        try {
          const results = await songApi.search(query);
          setSongs(results);
        } catch (error) {
          console.error('Search failed:', error);
        }
      }
    } else {
      loadSongs();
    }
  };

  const handleExportLibrary = async () => {
    try {
      const data = await songApi.exportLibrary();
      const json = JSON.stringify({ songs: data, exported_at: new Date().toISOString() }, null, 2);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(json);
      await invoke('save_file', { filename: 'songs-library.json', data: Array.from(bytes) });
      alert(`Exported ${data.length} songs successfully!`);
    } catch (error: any) {
      if (error !== 'Save cancelled') {
        console.error('Export failed:', error);
        alert('Failed to export library');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      try {
        await songApi.delete(id);
        loadSongs();
      } catch (error) {
        console.error('Failed to delete song:', error);
      }
    }
  };

  const handleLoadToPresentation = async (song: Song) => {
    try {
      await presentationApi.loadSong(song.id);
      navigate('/presentation');
    } catch (error) {
      console.error('Failed to load song to presentation:', error);
      alert('Failed to load song to presentation');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Process each file sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseSongFile(file);
        if (parsed.length === 0) {
          alert(`No songs found in "${file.name}"`);
          continue;
        }
        if (parsed.length === 1) {
          // Single song — import directly
          const s = parsed[0];
          await songApi.importFromContent(
            s.title,
            s.lyrics,
            [...(s.tags || []), "imported"],
            selectedCollectionId || undefined
          );
        } else {
          // Multiple songs — show batch preview
          setBatchImport({ songs: parsed, fileName: file.name });
          return; // stop here, user will confirm in modal
        }
      } catch (error: any) {
        console.error(`Failed to import "${file.name}":`, error);
        alert(`Failed to import "${file.name}": ${error.message || error}`);
      }
    }

    loadSongs();
    // Reset input so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBatchImportConfirm = async (collectionId?: string) => {
    if (!batchImport) return;
    setImporting(true);
    try {
      let imported = 0;
      for (const s of batchImport.songs) {
        try {
          await songApi.importFromContent(
            s.title,
            s.lyrics,
            [...(s.tags || []), "imported"],
            collectionId || selectedCollectionId || undefined
          );
          imported++;
        } catch (err) {
          console.error(`Failed to import "${s.title}":`, err);
        }
      }
      setBatchImport(null);
      loadSongs();
      alert(`Imported ${imported} of ${batchImport.songs.length} songs successfully!`);
    } catch (error) {
      console.error('Batch import failed:', error);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="song-library">
      <header className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdLibraryMusic size={28} color="#3b82f6" /> Song Library
          </h1>
          <p>{songs.length} songs available</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={handleExportLibrary}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <MdDownload size={18} /> Export
          </button>
          <label className="btn-upload" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdAdd size={18} /> Import
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.docx,.txt,.song,.chord,.lyrics"
              multiple
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
          <button
            className="btn-primary"
            onClick={() => {
              setEditingSong(null);
              setShowAddModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <MdAdd size={20} /> Add Song
          </button>
        </div>
      </header>

      <div className="search-bar">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search songs by title or lyrics..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          <div className="collection-filter">
            <MdFolder size={16} />
            <select
              value={selectedCollectionId}
              onChange={(e) => handleCollectionFilter(e.target.value)}
              className="collection-select"
            >
              <option value="">All Collections</option>
              <option value="__uncategorized">Uncategorized</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              className="btn-icon"
              onClick={() => setShowCollectionManager(true)}
              title="Manage collections"
            >
              <MdSettings size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading songs...</div>
      ) : songs.length === 0 ? (
        <div className="empty-state">
          <p>No songs found. Add your first song to get started!</p>
        </div>
      ) : (
        <div className="song-grid">
          {songs.map((song) => {
            const coll = collections.find(c => c.id === song.collection_id);
            return (
              <div key={song.id} className="song-card">
                <div className="song-header">
                  <h3>{song.title}</h3>
                  {song.key && <span className="song-key">{song.key}</span>}
                </div>
                <div className="song-preview">
                  {song.lyrics.split('\n').slice(0, 3).join('\n')}...
                </div>
                <div className="song-tags">
                  {coll && <span className="tag tag-collection">{coll.name}</span>}
                  {song.tags.map((tag, idx) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                </div>
                <div className="song-actions">
                  <button
                    className="btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    onClick={() => handleLoadToPresentation(song)}
                    title="Load to Presentation"
                  >
                    <MdPlayArrow size={14} /> Present
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setEditingSong(song);
                      setShowAddModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => handleDelete(song.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <SongModal
          song={editingSong}
          collections={collections}
          selectedCollectionId={editingSong?.collection_id || selectedCollectionId || undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingSong(null);
          }}
          onSave={() => {
            loadSongs();
            setShowAddModal(false);
            setEditingSong(null);
          }}
        />
      )}

      {showCollectionManager && (
        <CollectionsManager
          collections={collections}
          onClose={() => setShowCollectionManager(false)}
          onSaved={() => {
            loadCollections();
            loadSongs();
          }}
        />
      )}

      {batchImport && (
        <BatchImportModal
          songs={batchImport.songs}
          fileName={batchImport.fileName}
          collections={collections}
          importing={importing}
          onConfirm={handleBatchImportConfirm}
          onCancel={() => {
            setBatchImport(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      )}
    </div>
  );
};

// ── Song Modal ──────────────────────────────────────────────────────────

interface SongModalProps {
  song: Song | null;
  collections: Collection[];
  selectedCollectionId?: string;
  onClose: () => void;
  onSave: () => void;
}

const SongModal: React.FC<SongModalProps> = ({ song, collections, selectedCollectionId, onClose, onSave }) => {
  const [formData, setFormData] = useState<CreateSongRequest>({
    title: song?.title || '',
    lyrics: song?.lyrics || '',
    key: song?.key || '',
    tempo: song?.tempo,
    tags: song?.tags || [],
    chords: song?.chords || '',
    show_chords: song?.show_chords || false,
    arrangement: song?.arrangement || '',
    collection_id: song?.collection_id || selectedCollectionId || undefined,
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (song) {
        await songApi.update(song.id, formData);
      } else {
        await songApi.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save song:', error);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{song ? 'Edit Song' : 'Add New Song'}</h2>
          <button className="close-btn" onClick={onClose}><MdClose size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Key</label>
              <input
                type="text"
                placeholder="e.g., C, G, D"
                value={formData.key || ''}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tempo (BPM)</label>
              <input
                type="number"
                placeholder="120"
                value={formData.tempo || ''}
                onChange={(e) => setFormData({ ...formData, tempo: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Collection / Hymnal</label>
            <select
              value={formData.collection_id || ''}
              onChange={(e) => setFormData({ ...formData, collection_id: e.target.value || undefined })}
              className="form-select"
            >
              <option value="">None (Uncategorized)</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Lyrics *</label>
            <textarea
              required
              rows={10}
              value={formData.lyrics}
              onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
              placeholder="Enter song lyrics here. Use [Verse 1], [Chorus], etc. to label sections."
            />
          </div>

          <div className="form-group">
            <label>Arrangement</label>
            <input
              type="text"
              placeholder="e.g., Intro - Verse 1 - Chorus - Bridge"
              value={formData.arrangement || ''}
              onChange={(e) => setFormData({ ...formData, arrangement: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Chords</label>
              <input
                type="text"
                placeholder="e.g., C - G - Am - F"
                value={formData.chords || ''}
                onChange={(e) => setFormData({ ...formData, chords: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Show Chords</label>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  checked={formData.show_chords || false}
                  onChange={(e) => setFormData({ ...formData, show_chords: e.target.checked })}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tag-input-container">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag and press Enter"
              />
              <button type="button" onClick={addTag} className="btn-secondary btn-sm">
                Add
              </button>
            </div>
            <div className="tags-display">
              {formData.tags?.map((tag, idx) => (
                <span key={idx} className="tag">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="tag-remove"><MdClose size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {song ? 'Update' : 'Create'} Song
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Collections Manager ──────────────────────────────────────────────────

interface CollectionsManagerProps {
  collections: Collection[];
  onClose: () => void;
  onSaved: () => void;
}

const CollectionsManager: React.FC<CollectionsManagerProps> = ({ collections, onClose, onSaved }) => {
  const [localCollections, setLocalCollections] = useState<Collection[]>(collections);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await collectionApi.create({ name: newName.trim(), description: newDescription.trim() || undefined });
      setNewName('');
      setNewDescription('');
      setShowForm(false);
      onSaved();
      const data = await collectionApi.getAll();
      setLocalCollections(data);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingCollection || !newName.trim()) return;
    try {
      await collectionApi.update(editingCollection.id, { name: newName.trim(), description: newDescription.trim() || undefined });
      setEditingCollection(null);
      setNewName('');
      setNewDescription('');
      setShowForm(false);
      onSaved();
      const data = await collectionApi.getAll();
      setLocalCollections(data);
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this collection? Songs will become uncategorized.')) return;
    try {
      await collectionApi.delete(id);
      onSaved();
      const data = await collectionApi.getAll();
      setLocalCollections(data);
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const startEdit = (c: Collection) => {
    setEditingCollection(c);
    setNewName(c.name);
    setNewDescription(c.description || '');
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingCollection(null);
    setNewName('');
    setNewDescription('');
    setShowForm(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><MdFolder size={20} /> Manage Collections</h2>
          <button className="close-btn" onClick={onClose}><MdClose size={20} /></button>
        </div>

        <div className="modal-body">
          {showForm && (
            <div className="collection-form">
              <h3>{editingCollection ? 'Edit Collection' : 'New Collection'}</h3>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Methodist Hymns, Presbyterian Hymns"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => { setShowForm(false); setEditingCollection(null); }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={editingCollection ? handleUpdate : handleCreate}>
                  {editingCollection ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          )}

          <div className="collection-list-header">
            <span>{localCollections.length} collections</span>
            <button className="btn-primary btn-sm" onClick={startCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MdAdd size={14} /> Add Collection
            </button>
          </div>

          {localCollections.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p>No collections yet. Create your first hymnal collection!</p>
            </div>
          ) : (
            <div className="collection-list">
              {localCollections.map((c) => (
                <div key={c.id} className="collection-item">
                  <div className="collection-info">
                    <strong>{c.name}</strong>
                    {c.description && <span className="text-secondary">{c.description}</span>}
                  </div>
                  <div className="collection-item-actions">
                    <button className="btn-icon" onClick={() => startEdit(c)} title="Edit">
                      <MdEdit size={16} />
                    </button>
                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(c.id)} title="Delete">
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Batch Import Modal ───────────────────────────────────────────────────

interface BatchImportModalProps {
  songs: ParsedSong[];
  fileName: string;
  collections: Collection[];
  importing: boolean;
  onConfirm: (collectionId?: string) => void;
  onCancel: () => void;
}

const BatchImportModal: React.FC<BatchImportModalProps> = ({ songs, fileName, collections, importing, onConfirm, onCancel }) => {
  const [targetCollectionId, setTargetCollectionId] = useState('');

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><MdDownload size={20} /> Import from "{fileName}"</h2>
          <button className="close-btn" onClick={onCancel}><MdClose size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="batch-import-summary">
            <MdCheck size={18} color="#22c55e" />
            <span>Found <strong>{songs.length} songs</strong> in this file</span>
          </div>

          <div className="form-group">
            <label>Import into collection (optional)</label>
            <select
              value={targetCollectionId}
              onChange={(e) => setTargetCollectionId(e.target.value)}
              className="form-select"
            >
              <option value="">None (keep existing or uncategorized)</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="batch-song-preview">
            <div className="batch-song-preview-header">
              <span>Title</span>
              <span>Key</span>
              <span>Preview</span>
            </div>
            {songs.map((s, i) => (
              <div key={i} className="batch-song-preview-row">
                <span className="batch-song-title">{s.title}</span>
                <span className="batch-song-key">{s.key || '—'}</span>
                <span className="batch-song-lyrics-preview">
                  {s.lyrics.split('\n').slice(0, 2).join(' ').substring(0, 80)}
                  {s.lyrics.length > 80 ? '...' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={importing}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(targetCollectionId || undefined)}
            disabled={importing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {importing ? 'Importing...' : `Import ${songs.length} Songs`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SongLibrary;
