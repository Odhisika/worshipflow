import React, { useState, useEffect } from 'react';
import AppDatePicker from '../../components/AppDatePicker';
import { MdAdd, MdCalendarMonth, MdLocationOn, MdAccessTime, MdCategory, MdEdit, MdDelete, MdSearch } from 'react-icons/md';
import { eventsApi, Event, CreateEventRequest } from '../../api/events';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

const AdminEvents: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [formData, setFormData] = useState<CreateEventRequest>({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        location: '',
        category: 'General'
    });

    useEffect(() => {
        loadEvents();
    }, [refreshSignal]);

    const loadEvents = async () => {
        try {
            const data = await eventsApi.getAllEvents();
            setEvents(data);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editingEvent) {
                await eventsApi.updateEvent(editingEvent.id, formData);
            } else {
                await eventsApi.createEvent(formData);
            }
            setShowModal(false);
            resetForm();
            triggerRefresh();
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            await eventsApi.deleteEvent(id);
            triggerRefresh();
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    };

    const openEditModal = (event: Event) => {
        setEditingEvent(event);
        setFormData({
            title: event.title,
            description: event.description || '',
            date: event.date,
            time: event.time || '',
            location: event.location || '',
            category: event.category || 'General'
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingEvent(null);
        setFormData({
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            time: '',
            location: '',
            category: 'General'
        });
    };

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return <div className="admin-loading">Loading Event Schedule...</div>;
    }

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Event Planning & Registration</h1>
                    <p>Schedule services, manage church calendars, and handle event registrations.</p>
                </div>
                <div className="admin-controls">
                    <div className="search-bar">
                        <MdSearch size={20} />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <MdAdd size={20} /> Create Event
                    </button>
                </div>
            </div>

            {filteredEvents.length === 0 ? (
                <div className="admin-empty-state" style={{ background: 'var(--bg-card)', padding: '4rem 2rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <div className="table-avatar" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', background: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary-blue)' }}>
                        <MdCalendarMonth size={40} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>No Events Scheduled</h3>
                    <p style={{ maxWidth: '440px', margin: '0 auto 2.5rem', color: 'var(--text-secondary)' }}>
                        Start by creating your first event to manage registrations and calendars.
                    </p>
                    <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        Get Started
                    </button>
                </div>
            ) : (
                <div className="members-grid">
                    {filteredEvents.map(event => (
                        <div key={event.id} className="member-card">
                            <div className="member-card-body">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                    <div className="table-avatar" style={{ background: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary-blue)' }}>
                                        <MdCalendarMonth size={24} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn-outline-small" style={{ padding: '0.3rem' }} onClick={() => openEditModal(event)}>
                                            <MdEdit size={16} />
                                        </button>
                                        <button className="btn-outline-small" style={{ padding: '0.3rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => handleDelete(event.id)}>
                                            <MdDelete size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{event.title}</h3>
                                {event.description && (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {event.description}
                                    </p>
                                )}

                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <MdCalendarMonth size={16} style={{ color: 'var(--primary-blue)' }} />
                                        {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                    {event.time && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <MdAccessTime size={16} style={{ color: 'var(--accent-green)' }} />
                                            {event.time}
                                        </div>
                                    )}
                                    {event.location && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <MdLocationOn size={16} style={{ color: 'var(--accent-orange)' }} />
                                            {event.location}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <MdCategory size={16} style={{ color: 'var(--primary-blue)' }} />
                                        <span className="status-badge status-info" style={{ fontSize: '0.75rem' }}>{event.category || 'General'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{editingEvent ? 'Edit Event' : 'Schedule New Event'}</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Define the details for your upcoming church gathering.</p>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label>Event Title</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Annual Youth Convention"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label>Description (Optional)</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Give details about the event..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div className="form-group">
                                <label>Date</label>
                                <AppDatePicker value={formData.date}
                                    onChange={(d) => setFormData({ ...formData, date: d })}
                                    required className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>Time (Optional)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. 6:00 PM"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Main Auditorium"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    className="form-control"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="General">General</option>
                                    <option value="Worship">Worship</option>
                                    <option value="Youth">Youth</option>
                                    <option value="Outreach">Outreach</option>
                                    <option value="Special">Special</option>
                                    <option value="Conference">Conference</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                            <button className="btn-outline-small" onClick={() => setShowModal(false)}>Cancel</button>
                            <button
                                className="btn-primary"
                                disabled={!formData.title || !formData.date}
                                onClick={handleSave}
                            >
                                {editingEvent ? 'Update Event' : 'Create Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminEvents;
