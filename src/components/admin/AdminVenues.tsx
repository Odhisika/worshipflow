import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdEdit, MdMeetingRoom, MdBookOnline } from 'react-icons/md';
import AppDatePicker from '../../components/AppDatePicker';
import { venueApi, Venue, VenueBooking } from '../../api/venues';
import { useDataRefresh } from '../../context/DataRefreshContext';
import ConfirmModal from './ConfirmModal';
import './AdminViews.css';

type TabType = 'venues' | 'bookings';

const AdminVenues: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('venues');

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Venue & Room Booking</h1><p>Manage church facilities and schedule bookings.</p></div>
            </div>
            <div className="tab-bar">
                <button className={activeTab === 'venues' ? 'tab-active' : ''} onClick={() => setActiveTab('venues')}><MdMeetingRoom /> Venues</button>
                <button className={activeTab === 'bookings' ? 'tab-active' : ''} onClick={() => setActiveTab('bookings')}><MdBookOnline /> Bookings</button>
            </div>
            {activeTab === 'venues' ? <VenuesList /> : <BookingsList />}
        </div>
    );
};

const VenuesList: React.FC = () => {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Venue | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [form, setForm] = useState({ name: '', capacity: 0, location: '', description: '', facilities: '' });

    const fetchData = async () => {
        setLoading(true);
        try { setVenues(await venueApi.getVenues(false)); } catch { toast.error('Failed to load venues.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await venueApi.updateVenue(editing.id, form);
                toast.success('Venue updated.');
            } else {
                await venueApi.createVenue({ ...form, capacity: form.capacity || undefined });
                toast.success('Venue created.');
            }
            setShowModal(false); setEditing(null);
            setForm({ name: '', capacity: 0, location: '', description: '', facilities: '' });
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    return (
        <div>
            <div className="admin-controls" style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Add Venue</button>
            </div>
            <div className="members-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {loading ? <p>Loading...</p> : venues.length === 0 ? <p>No venues. Add one!</p> :
                venues.map(v => (
                    <div key={v.id} className="member-card" style={{ opacity: v.is_active ? 1 : 0.5 }}>
                        <div className="member-card-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <h3><MdMeetingRoom /> {v.name}</h3>
                                <div>
                                    <button className="btn-text" onClick={() => { setEditing(v); setForm({ name: v.name, capacity: v.capacity || 0, location: v.location || '', description: v.description || '', facilities: v.facilities || '' }); setShowModal(true); }}><MdEdit /></button>
                                    <button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(v.id)}><MdDelete /></button>
                                </div>
                            </div>
                            {v.location && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{v.location}</p>}
                            {v.capacity && <p style={{ fontWeight: 600 }}>Capacity: {v.capacity}</p>}
                            {v.facilities && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Facilities: {v.facilities}</p>}
                        </div>
                    </div>
                ))}
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setEditing(null); }}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>{editing ? 'Edit Venue' : 'Add Venue'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label>Name *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Capacity</label><input type="number" min={0} value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value) || 0})} /></div>
                                <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
                            </div>
                            <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                            <div className="form-group"><label>Facilities (comma separated)</label><input value={form.facilities} onChange={e => setForm({...form, facilities: e.target.value})} placeholder="e.g. Projector, Sound system, AC" /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button><button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Delete Venue" message="Remove this venue?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { venueApi.deleteVenue(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

const BookingsList: React.FC = () => {
    const [bookings, setBookings] = useState<VenueBooking[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [filterDate, setFilterDate] = useState('');
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [form, setForm] = useState({ venue_id: '', booking_date: '', start_time: '', end_time: '', booked_by: '', purpose: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            setBookings(await venueApi.getVenueBookings(undefined, filterDate || undefined));
            setVenues(await venueApi.getVenues(true));
        } catch { toast.error('Failed to load bookings.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await venueApi.createVenueBooking(form);
            toast.success('Booking created.');
            setShowModal(false);
            setForm({ venue_id: '', booking_date: '', start_time: '', end_time: '', booked_by: '', purpose: '' });
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    return (
        <div>
            <div className="admin-controls" style={{ marginBottom: '1rem' }}>
                <AppDatePicker value={filterDate} onChange={setFilterDate} placeholderText="Filter by date" className="form-input" style={{ width: '150px' }} />
                <button className="btn-outline-small" onClick={fetchData}>Filter</button>
                <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> New Booking</button>
            </div>
            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Venue</th><th>Date</th><th>Time</th><th>Booked By</th><th>Purpose</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={7} className="empty-table">Loading...</td></tr> :
                        bookings.length === 0 ? <tr><td colSpan={7} className="empty-table">No bookings.</td></tr> :
                        bookings.map(b => (
                            <tr key={b.id}>
                                <td style={{ fontWeight: 600 }}>{b.venue_name}</td>
                                <td>{new Date(b.booking_date).toLocaleDateString()}</td>
                                <td>{b.start_time} - {b.end_time}</td>
                                <td>{b.booked_by || '-'}</td>
                                <td>{b.purpose || b.event_title || '-'}</td>
                                <td><span className={`status-badge ${b.status === 'confirmed' ? 'status-active' : b.status === 'cancelled' ? '' : 'status-warning'}`}>{b.status}</span></td>
                                <td><button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(b.id)}><MdDelete /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>New Booking</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label>Venue *</label><select required value={form.venue_id} onChange={e => setForm({...form, venue_id: e.target.value})}><option value="">Select venue</option>{venues.map(v => <option key={v.id} value={v.id}>{v.name} {v.capacity ? `(${v.capacity} pax)` : ''}</option>)}</select></div>
                            <div className="form-group"><label>Date *</label><AppDatePicker value={form.booking_date} onChange={d => setForm({...form, booking_date: d})} placeholderText="Select date" className="form-input" /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Start Time *</label><input type="time" required value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} /></div>
                                <div className="form-group"><label>End Time *</label><input type="time" required value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Booked By</label><input value={form.booked_by} onChange={e => setForm({...form, booked_by: e.target.value})} placeholder="Person/ministry" /></div>
                                <div className="form-group"><label>Purpose</label><input value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} /></div>
                            </div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Book</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Cancel Booking" message="Remove this booking?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { venueApi.deleteVenueBooking(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

export default AdminVenues;
