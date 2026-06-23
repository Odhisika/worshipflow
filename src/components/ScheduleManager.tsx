import React, { useState, useEffect, useRef, useCallback } from 'react';
import { scheduleApi, ScheduleDay, ScheduleActivity } from '../api/scheduleApi';
import { mediaApi } from '../api/media';
import { presentationApi } from '../api/presentation';
import { timerApi, TimerInfo } from '../api/timer';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import {
  MdDelete, MdEdit, MdAdd, MdPlayArrow, MdPause, MdStop, MdSkipNext,
  MdSave, MdClose, MdImage, MdMovie, MdFormatBold,
  MdFormatAlignLeft, MdFormatAlignCenter, MdFormatAlignRight,
  MdSchedule, MdArrowUpward, MdArrowDownward,
  MdCalendarToday, MdTimer, MdCheckCircle, MdRadioButtonChecked,
  MdWarning,
} from 'react-icons/md';
import './ScheduleManager.css';

const FONT_OPTIONS = [
  { label: 'Default', value: "'Inter', 'Segoe UI', Tahoma, sans-serif" },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
];

type PageMode = 'view' | 'play';

const emptyActivityForm = {
  name: '',
  duration_minutes: 10,
  content: '',
  background_path: null as string | null,
  background_type: 'none' as 'image' | 'video' | 'none',
  font_family: "'Inter', 'Segoe UI', Tahoma, sans-serif",
  font_size: 48,
  font_color: '#f0f4ff',
  font_weight: 'normal' as 'normal' | 'bold',
  text_align: 'center' as 'left' | 'center' | 'right',
  content_type: 'text' as 'text' | 'song' | 'bible' | 'media',
  media_path: null as string | null,
};

const ScheduleManager: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleDay | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<PageMode>('view');
  const [editActivity, setEditActivity] = useState<ScheduleActivity | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [playIdx, setPlayIdx] = useState(-1);
  const [playState, setPlayState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [timerInfo, setTimerInfo] = useState<TimerInfo | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const advancingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({ ...emptyActivityForm });

  // ── Load schedule for selected date ──
  const loadSchedule = useCallback((date: string) => {
    const existing = scheduleApi.getByDate(date);
    if (existing) {
      setSchedule(existing);
      setTitle(existing.title);
    } else {
      setSchedule(null);
      setTitle('');
    }
    setMode('view');
    setPlayIdx(-1);
    setPlayState('idle');
    setShowEditor(false);
    setEditActivity(null);
    setTimerInfo(null);
  }, []);

  useEffect(() => {
    loadSchedule(selectedDate);
  }, [selectedDate, loadSchedule]);

  // ── Timer events ──
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    listen<TimerInfo>('timer-started', e => setTimerInfo(e.payload)).then(fn => unsubs.push(fn));
    listen<TimerInfo>('timer-paused', e => setTimerInfo(e.payload)).then(fn => unsubs.push(fn));
    listen<TimerInfo>('timer-resumed', e => setTimerInfo(e.payload)).then(fn => unsubs.push(fn));
    listen<TimerInfo>('timer-updated', e => setTimerInfo(e.payload)).then(fn => unsubs.push(fn));
    return () => { unsubs.forEach(fn => fn()); };
  }, []);

  // ── Poll timer state ──
  useEffect(() => {
    if (playState === 'playing') {
      pollRef.current = setInterval(async () => {
        try { setTimerInfo(await timerApi.getState()); } catch { /* ignore */ }
      }, 1000);
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [playState]);

  // ── Auto-advance on timer end ──
  useEffect(() => {
    if (!timerInfo?.current_timer || playState !== 'playing') return;
    if (advancingRef.current) return;
    const t = timerInfo.current_timer;
    if (t.is_running && !t.is_overrun && t.elapsed_seconds < t.duration_seconds) return;

    advancingRef.current = true;
    const next = playIdx + 1;
    if (!schedule || next >= schedule.activities.length) {
      stopPlayback();
      advancingRef.current = false;
      return;
    }
    setTimeout(() => {
      advanceTo(next).finally(() => { advancingRef.current = false; });
    }, 800);
    return () => { advancingRef.current = false; };
  }, [timerInfo, playState, playIdx, schedule]);

  // ── Save / Create schedule ──
  const handleSaveSchedule = () => {
    if (!title.trim()) return;
    if (schedule) {
      scheduleApi.update(schedule.id, { title: title.trim() });
      setSchedule(prev => prev ? { ...prev, title: title.trim() } : null);
    } else {
      const created = scheduleApi.create({ date: selectedDate, title: title.trim() });
      setSchedule(created);
    }
  };

  // ── Activity CRUD ──
  const openNewActivity = () => {
    setForm({ ...emptyActivityForm });
    setEditActivity(null);
    setBgPreviewUrl('');
    setShowEditor(true);
  };

  const openEditActivity = (activity: ScheduleActivity) => {
    setForm({
      name: activity.name,
      duration_minutes: activity.duration_minutes,
      content: activity.content,
      background_path: activity.background_path,
      background_type: activity.background_type,
      font_family: activity.font_family,
      font_size: activity.font_size,
      font_color: activity.font_color,
      font_weight: activity.font_weight,
      text_align: activity.text_align,
      content_type: activity.content_type,
      media_path: activity.media_path,
    });
    setEditActivity(activity);
    if (activity.background_path) {
      mediaApi.getLocalImageUrl(activity.background_path).then(setBgPreviewUrl).catch(() => setBgPreviewUrl(''));
    } else {
      setBgPreviewUrl('');
    }
    setShowEditor(true);
  };

  const handleSaveActivity = async () => {
    if (!schedule || !form.name.trim()) return;
    if (editActivity) {
      const updated = scheduleApi.updateActivity(schedule.id, editActivity.id, {
        name: form.name.trim(),
        duration_minutes: form.duration_minutes,
        content: form.content,
        background_path: form.background_path,
        background_type: form.background_type,
        font_family: form.font_family,
        font_size: form.font_size,
        font_color: form.font_color,
        font_weight: form.font_weight,
        text_align: form.text_align,
        content_type: form.content_type,
        media_path: form.media_path,
      });
      if (updated) {
        setSchedule(prev => prev ? {
          ...prev,
          activities: prev.activities.map(a => a.id === updated.id ? updated : a),
        } : null);
      }
    } else {
      const created = scheduleApi.addActivity(schedule.id, {
        name: form.name.trim(),
        duration_minutes: form.duration_minutes,
        content: form.content,
        background_path: form.background_path,
        background_type: form.background_type,
        font_family: form.font_family,
        font_size: form.font_size,
        font_color: form.font_color,
        font_weight: form.font_weight,
        text_align: form.text_align,
        content_type: form.content_type,
        media_path: form.media_path,
      });
      if (created) {
        setSchedule(prev => prev ? { ...prev, activities: [...prev.activities, created] } : null);
      }
    }
    setShowEditor(false);
    setEditActivity(null);
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!schedule) return;
    scheduleApi.deleteActivity(schedule.id, activityId);
    setSchedule(prev => prev ? { ...prev, activities: prev.activities.filter(a => a.id !== activityId) } : null);
  };

  const moveActivity = (idx: number, direction: -1 | 1) => {
    if (!schedule) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= schedule.activities.length) return;
    const ids = schedule.activities.map(a => a.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    scheduleApi.reorderActivities(schedule.id, ids);
    setSchedule(prev => prev ? {
      ...prev,
      activities: ids.map((id, i) => {
        const a = prev.activities.find(a => a.id === id)!;
        return { ...a, order_index: i };
      }),
    } : null);
  };

  // ── Background picker ──
  const handleChooseBackground = async (type: 'image' | 'video') => {
    try {
      const paths = await mediaApi.openMediaFileDialog(type);
      if (paths && paths.length > 0) {
        const path = paths[0];
        setForm(prev => ({ ...prev, background_path: path, background_type: type }));
        if (type === 'image') {
          mediaApi.getLocalImageUrl(path).then(setBgPreviewUrl).catch(() => setBgPreviewUrl(''));
        } else {
          setBgPreviewUrl(mediaApi.getAssetUrl(path));
        }
      }
    } catch {}
  };

  // ── Playback ──
  const loadActivityToPresentation = async (activity: ScheduleActivity) => {
    const bgPath = activity.background_path && activity.background_type !== 'none' ? activity.background_path : null;
    const content = activity.content;
    if (activity.content_type === 'bible' && content.includes('|')) {
      const parts = content.split('|');
      if (parts.length >= 4) {
        await presentationApi.addBibleSlide(parts[0], parseInt(parts[1]), parts[2], parts.slice(3).join('|'), bgPath);
        return;
      }
    }
    if (content.trim()) {
      await presentationApi.addTextSlide(activity.name, content, bgPath);
    } else {
      await presentationApi.addTextSlide(activity.name, '', bgPath);
    }
  };

  const advanceTo = async (idx: number) => {
    if (!schedule) return;
    const activity = schedule.activities[idx];
    if (!activity) return;
    try {
      await loadActivityToPresentation(activity);
      await timerApi.startNext();
      setPlayIdx(idx);
      setTimerInfo(await timerApi.getState());
    } catch (err) {
      setError(`Failed to load: ${activity.name}`);
    }
  };

  const startPlayback = async () => {
    if (!schedule || schedule.activities.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      // Open output window on the projector/live monitor
      await invoke('open_presentation_window');
      // Clear any existing slides for a clean start
      await presentationApi.clearPresentation();
      // Start the live presentation
      await presentationApi.startPresentation();
      // Load activities into the timer
      await timerApi.loadService('schedule_' + schedule.id);
      // Load the first activity with its background into the presentation
      const first = schedule.activities[0];
      await loadActivityToPresentation(first);
      setPlayIdx(0);
      setMode('play');
      const info = await timerApi.startNext();
      setTimerInfo(info);
      setPlayState('playing');
    } catch (err) {
      setError('Failed to start playback');
    } finally {
      setLoading(false);
    }
  };

  const pausePlayback = async () => {
    try { setTimerInfo(await timerApi.pause()); setPlayState('paused'); } catch {}
  };
  const resumePlayback = async () => {
    try { setTimerInfo(await timerApi.resume()); setPlayState('playing'); } catch {}
  };
  const stopPlayback = useCallback(async () => {
    try { await timerApi.stop(); await timerApi.clear(); } catch {}
    setPlayState('idle');
    setPlayIdx(-1);
    setTimerInfo(null);
    setMode('view');
  }, []);

  const skipNext = async () => {
    if (!schedule || advancingRef.current) return;
    const next = playIdx + 1;
    if (next >= schedule.activities.length) return;
    try {
      await timerApi.stop();
      advancingRef.current = true;
      await advanceTo(next);
      advancingRef.current = false;
    } catch { advancingRef.current = false; }
  };

  // ── Derived ──
  const currentActivity = schedule && playIdx >= 0 && playIdx < schedule.activities.length
    ? schedule.activities[playIdx] : null;
  const currentTimer = timerInfo?.current_timer;
  const timerSeconds = currentTimer
    ? Math.max(0, currentTimer.duration_seconds - currentTimer.elapsed_seconds) : 0;
  const timerPercent = currentTimer && currentTimer.duration_seconds > 0
    ? (currentTimer.elapsed_seconds / currentTimer.duration_seconds) * 100 : 0;

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const activityStatus = (idx: number) => {
    if (mode !== 'play' || playIdx < 0) return '';
    if (idx < playIdx) return 'completed';
    if (idx === playIdx) return 'active';
    return 'upcoming';
  };

  // ── Render ──
  return (
    <div className="schedule-manager">
      {/* ── Top Bar ── */}
      <header className="schedule-topbar">
        <div className="schedule-topbar-left">
          <MdSchedule size={24} />
          <h1>Daily Schedule</h1>
        </div>
        <div className="schedule-topbar-center">
          <MdCalendarToday size={18} />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="schedule-date-input"
          />
          <input
            type="text"
            placeholder="Schedule title (e.g. Sunday Morning)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="schedule-title-input"
          />
          <button className="schedule-top-btn" onClick={handleSaveSchedule} title="Save schedule">
            <MdSave size={18} /> Save
          </button>
        </div>
        <div className="schedule-topbar-right">
          <button className="schedule-top-btn primary" onClick={openNewActivity} disabled={!schedule}>
            <MdAdd size={18} /> New Activity
          </button>
          <button
            className="schedule-top-btn play"
            onClick={startPlayback}
            disabled={!schedule || schedule.activities.length === 0 || loading}
          >
            <MdPlayArrow size={18} /> {loading ? 'Loading...' : 'Start'}
          </button>
        </div>
      </header>

      {error && (
        <div className="schedule-error" onClick={() => setError(null)}>
          <MdWarning size={18} /> {error}
        </div>
      )}

      <div className="schedule-body">
        {/* ── Left Panel: Activity List ── */}
        <aside className="schedule-activity-list">
          <h2>Activities ({schedule?.activities.length || 0})</h2>
          {!schedule ? (
            <div className="schedule-empty-state">
              <p>Select a date and save to begin.</p>
            </div>
          ) : schedule.activities.length === 0 ? (
            <div className="schedule-empty-state">
              <p>No activities yet. Click "New Activity" to add one.</p>
            </div>
          ) : (
            <div className="schedule-activities">
              {schedule.activities.map((act, idx) => {
                const status = activityStatus(idx);
                return (
                  <div key={act.id} className={`schedule-activity-item ${status}`}>
                    <div className="activity-marker">
                      {status === 'completed' ? <MdCheckCircle size={18} /> :
                       status === 'active' ? <MdRadioButtonChecked size={18} className="pulse-dot" /> :
                       <span className="activity-idx">{idx + 1}</span>}
                    </div>
                    <div className="activity-info">
                      <div className="activity-name">{act.name}</div>
                      <div className="activity-meta">{act.duration_minutes} min</div>
                    </div>
                    <div className="activity-actions">
                      <button onClick={() => moveActivity(idx, -1)} disabled={idx === 0} title="Move up"><MdArrowUpward size={14} /></button>
                      <button onClick={() => moveActivity(idx, 1)} disabled={idx >= schedule.activities.length - 1} title="Move down"><MdArrowDownward size={14} /></button>
                      <button onClick={() => openEditActivity(act)} title="Edit"><MdEdit size={14} /></button>
                      <button onClick={() => handleDeleteActivity(act.id)} title="Delete"><MdDelete size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* ── Right Panel ── */}
        <main className="schedule-main">
          {showEditor ? (
            /* ── Activity Editor ── */
            <div className="activity-editor">
              <div className="editor-header">
                <h2>{editActivity ? 'Edit Activity' : 'New Activity'}</h2>
                <button className="editor-close" onClick={() => { setShowEditor(false); setEditActivity(null); }}>
                  <MdClose size={20} />
                </button>
              </div>

              <div className="editor-form">
                <div className="editor-row">
                  <div className="editor-field">
                    <label>Activity Name</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Opening Prayer" />
                  </div>
                  <div className="editor-field" style={{ maxWidth: 140 }}>
                    <label>Duration (min)</label>
                    <input type="number" min={1} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>

                <div className="editor-field">
                  <label>Content (text shown on screen)</label>
                  <textarea
                    rows={4}
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Enter the text to display, or use bible_ref format: Book|Chapter|Verses|Text"
                  />
                </div>

                <div className="editor-section-title">Background</div>
                <div className="editor-row">
                  <button className="editor-bg-btn" onClick={() => handleChooseBackground('image')}>
                    <MdImage size={16} /> Choose Image
                  </button>
                  <button className="editor-bg-btn" onClick={() => handleChooseBackground('video')}>
                    <MdMovie size={16} /> Choose Video
                  </button>
                  {form.background_path && (
                    <button className="editor-bg-btn clear" onClick={() => { setForm({ ...form, background_path: null, background_type: 'none' }); setBgPreviewUrl(''); }}>
                      <MdClose size={16} /> Clear
                    </button>
                  )}
                </div>
                {bgPreviewUrl && form.background_type === 'image' && (
                  <img src={bgPreviewUrl} alt="bg preview" className="editor-bg-preview" />
                )}
                {bgPreviewUrl && form.background_type === 'video' && (
                  <video src={bgPreviewUrl} muted autoPlay loop playsInline className="editor-bg-preview" />
                )}

                <div className="editor-section-title">Text Style</div>
                <div className="editor-row">
                  <div className="editor-field">
                    <label>Font</label>
                    <select value={form.font_family} onChange={e => setForm({ ...form, font_family: e.target.value })}>
                      {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="editor-field" style={{ maxWidth: 100 }}>
                    <label>Size</label>
                    <input type="number" min={12} max={200} value={form.font_size} onChange={e => setForm({ ...form, font_size: parseInt(e.target.value) || 48 })} />
                  </div>
                  <div className="editor-field" style={{ maxWidth: 80 }}>
                    <label>Color</label>
                    <input type="color" value={form.font_color} onChange={e => setForm({ ...form, font_color: e.target.value })} className="editor-color" />
                  </div>
                </div>

                <div className="editor-row">
                  <button
                    className={`editor-style-btn ${form.font_weight === 'bold' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, font_weight: form.font_weight === 'bold' ? 'normal' : 'bold' })}
                  >
                    <MdFormatBold size={16} /> Bold
                  </button>
                  <button
                    className={`editor-style-btn ${form.text_align === 'left' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, text_align: 'left' })}
                  ><MdFormatAlignLeft size={16} /></button>
                  <button
                    className={`editor-style-btn ${form.text_align === 'center' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, text_align: 'center' })}
                  ><MdFormatAlignCenter size={16} /></button>
                  <button
                    className={`editor-style-btn ${form.text_align === 'right' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, text_align: 'right' })}
                  ><MdFormatAlignRight size={16} /></button>
                </div>

                <div className="editor-preview" style={{
                  fontFamily: form.font_family,
                  fontSize: Math.min(form.font_size, 48),
                  color: form.font_color,
                  fontWeight: form.font_weight,
                  textAlign: form.text_align,
                  backgroundColor: form.background_type !== 'none' ? 'transparent' : '#1a1a2e',
                }}>
                  {form.content || 'Preview text appears here'}
                </div>

                <button className="editor-save-btn" onClick={handleSaveActivity} disabled={!form.name.trim()}>
                  <MdSave size={18} /> {editActivity ? 'Update Activity' : 'Add Activity'}
                </button>
              </div>
            </div>
          ) : mode === 'play' && currentActivity ? (
            /* ── Player ── */
            <div className="activity-player">
              {/* Background layer */}
              {currentActivity.background_path && currentActivity.background_type !== 'none' && (
                <div className="player-bg">
                  {currentActivity.background_type === 'video' ? (
                    <video src={mediaApi.getAssetUrl(currentActivity.background_path)} muted autoPlay loop playsInline className="player-bg-media" />
                  ) : (
                    <img src={mediaApi.getAssetUrl(currentActivity.background_path)} alt="" className="player-bg-media" />
                  )}
                </div>
              )}

              {/* Content */}
              <div
                className="player-content"
                style={{
                  fontFamily: currentActivity.font_family,
                  fontSize: currentActivity.font_size,
                  color: currentActivity.font_color,
                  fontWeight: currentActivity.font_weight,
                  textAlign: currentActivity.text_align,
                }}
              >
                {currentActivity.content || currentActivity.name}
              </div>

              {/* Timer overlay */}
              <div className="player-timer-overlay">
                <div className={`player-timer ${timerPercent > 90 ? 'danger' : timerPercent > 75 ? 'warning' : ''}`}>
                  {currentTimer?.is_overrun ? (
                    <span className="overrun">+{fmtTime(Math.abs(timerSeconds))}</span>
                  ) : (
                    fmtTime(timerSeconds)
                  )}
                </div>
                <div className="player-progress">
                  <div className="player-progress-fill" style={{ width: `${Math.min(timerPercent, 100)}%` }} />
                </div>
                <div className="player-activity-name">{currentActivity.name}</div>
              </div>

              {/* Controls */}
              <div className="player-controls">
                {playState === 'playing' ? (
                  <button className="player-btn" onClick={pausePlayback}><MdPause size={22} /> Pause</button>
                ) : (
                  <button className="player-btn primary" onClick={resumePlayback}><MdPlayArrow size={22} /> Resume</button>
                )}
                <button className="player-btn" onClick={skipNext} disabled={playIdx >= schedule!.activities.length - 1}>
                  <MdSkipNext size={22} /> Next
                </button>
                <button className="player-btn danger" onClick={stopPlayback}><MdStop size={22} /> Stop</button>
              </div>
            </div>
          ) : (
            /* ── Empty State ── */
            <div className="schedule-main-empty">
              {schedule ? (
                <>
                  <MdTimer size={64} style={{ opacity: 0.15 }} />
                  <h2>{schedule.title || 'Untitled Schedule'}</h2>
                  <p>{schedule.activities.length} activit{schedule.activities.length === 1 ? 'y' : 'ies'}</p>
                  {schedule.activities.length > 0 && (
                    <p>Press <strong>Start</strong> to begin auto-play, or <strong>New Activity</strong> to add more.</p>
                  )}
                </>
              ) : (
                <>
                  <MdSchedule size={64} style={{ opacity: 0.15 }} />
                  <h2>No schedule for this date</h2>
                  <p>Enter a title above and click <strong>Save</strong> to create one.</p>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Bottom player bar (when playing) ── */}
      {mode === 'play' && (
        <footer className="schedule-player-bar">
          <div className="bar-timeline">
            {schedule?.activities.map((act, idx) => (
              <div key={act.id} className={`bar-segment ${activityStatus(idx)}`} style={{ flex: act.duration_minutes }}>
                <div className="bar-segment-label">{act.name}</div>
              </div>
            ))}
          </div>
          <div className="bar-controls">
            {playState === 'playing' ? (
              <button onClick={pausePlayback}><MdPause size={20} /></button>
            ) : (
              <button onClick={resumePlayback}><MdPlayArrow size={20} /></button>
            )}
            <button onClick={skipNext} disabled={!schedule || playIdx >= schedule.activities.length - 1}>
              <MdSkipNext size={20} />
            </button>
            <button onClick={stopPlayback}><MdStop size={20} /></button>
            <span className="bar-time">{fmtTime(timerSeconds)}</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ScheduleManager;
