import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { songApi, Song, CreateSongRequest } from '../api';
import { presentationApi } from '../api/presentation';
import { MdLibraryMusic, MdAdd, MdDownload, MdClose, MdPlayArrow } from 'react-icons/md';
import './SongLibrary.css';

const SongLibrary: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  useEffect(() => {
    loadSongs();
    if (location.state?.openModal === 'add-song') {
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const data = await songApi.getAll();
      setSongs(data);
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await songApi.search(query);
        setSongs(results);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      loadSongs();
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
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        if (content) {
          // Extract title from filename
          const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
          const title = fileName.charAt(0).toUpperCase() + fileName.slice(1);

          // Import the song
          await songApi.importFromContent(title, content, ["imported"]);
          loadSongs();
          alert(`Successfully imported song: ${title}`);
        }
      } catch (error) {
        console.error("Failed to import song from file:", error);
        alert("Failed to import song from file");
      }
    };
    reader.readAsText(file);
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
          <label className="btn-upload" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdDownload size={18} /> Import Song
            <input
              type="file"
              accept=".txt,.song,.chord,.lyrics"
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
        <input
          type="text"
          placeholder="Search songs by title or lyrics..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading">Loading songs...</div>
      ) : songs.length === 0 ? (
        <div className="empty-state">
          <p>No songs found. Add your first song to get started!</p>
        </div>
      ) : (
        <div className="song-grid">
          {songs.map((song) => (
            <div key={song.id} className="song-card">
              <div className="song-header">
                <h3>{song.title}</h3>
                {song.key && <span className="song-key">{song.key}</span>}
              </div>
              <div className="song-preview">
                {song.lyrics.split('\n').slice(0, 3).join('\n')}...
              </div>
              <div className="song-tags">
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
          ))}
        </div>
      )}

      {showAddModal && (
        <SongModal
          song={editingSong}
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
    </div>
  );
};

interface SongModalProps {
  song: Song | null;
  onClose: () => void;
  onSave: () => void;
}

const SongModal: React.FC<SongModalProps> = ({ song, onClose, onSave }) => {
  const [formData, setFormData] = useState<CreateSongRequest>({
    title: song?.title || '',
    lyrics: song?.lyrics || '',
    key: song?.key || '',
    tempo: song?.tempo,
    tags: song?.tags || [],
    chords: song?.chords || '',
    show_chords: song?.show_chords || false,
    arrangement: song?.arrangement || '',
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
            <label>Lyrics *</label>
            <textarea
              required
              rows={10}
              value={formData.lyrics}
              onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
              placeholder="Enter song lyrics here..."
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

export default SongLibrary;
