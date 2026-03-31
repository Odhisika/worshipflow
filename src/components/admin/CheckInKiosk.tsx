import React, { useState } from 'react';
import { MdSearch, MdCheckCircle, MdPrint, MdClose, MdPerson } from 'react-icons/md';
import { memberApi, Member } from '../../api/members';
import { checkInApi, CheckIn } from '../../api/checkin';
import '../admin/AdminViews.css';

interface CheckInKioskProps {
    onClose: () => void;
}

const CheckInKiosk: React.FC<CheckInKioskProps> = ({ onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [checkInResult, setCheckInResult] = useState<CheckIn | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const allMembers = await memberApi.getMembers();
            const filtered = allMembers.filter(m =>
                m.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.phone?.includes(searchQuery)
            );
            setSearchResults(filtered);
        } catch (err) {
            setError('Failed to search members');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (member: Member) => {
        setLoading(true);
        setError(null);
        try {
            const result = await checkInApi.checkInChild({
                member_id: member.id,
                location: 'Main Lobby Kiosk'
            });
            setCheckInResult(result);
            setSelectedMember(member);
        } catch (err) {
            setError('Check-in failed');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedMember(null);
        setCheckInResult(null);
        setError(null);
    };

    return (
        <div className="modal-overlay" style={{ background: 'var(--bg-darker)' }}>
            <div className="modal-content animate-slide-up" style={{ maxWidth: '800px', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome to WorshipFlow Check-In</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Search by name or phone number to begin</p>
                    </div>
                    <button className="btn-text" onClick={onClose}><MdClose size={32} /></button>
                </div>

                {!checkInResult ? (
                    <>
                        <div className="search-bar" style={{ padding: '0.75rem 1.5rem', marginBottom: '2.5rem' }}>
                            <MdSearch size={24} />
                            <input
                                type="text"
                                placeholder="Enter name or phone number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                style={{ fontSize: '1.2rem' }}
                                autoFocus
                            />
                            <button className="btn-primary" onClick={handleSearch}>Search</button>
                        </div>

                        {loading && <p>Searching...</p>}
                        {error && <p style={{ color: 'var(--accent-red)' }}>{error}</p>}

                        <div className="members-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                            {searchResults.map(member => (
                                <div
                                    key={member.id}
                                    className="member-card"
                                    style={{ cursor: 'pointer', textAlign: 'center' }}
                                    onClick={() => handleCheckIn(member)}
                                >
                                    <div className="member-avatar" style={{ margin: '0 auto 1rem' }}>
                                        {member.first_name[0]}{member.last_name[0]}
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem' }}>{member.first_name} {member.last_name}</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{member.phone || 'No phone'}</p>
                                    <button className="btn-primary-small" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                                        Check In
                                    </button>
                                </div>
                            ))}
                        </div>

                        {searchResults.length === 0 && searchQuery && !loading && (
                            <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--border-light)', borderRadius: '12px' }}>
                                <MdPerson size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                                <p>No members found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ color: 'var(--accent-green)', marginBottom: '1.5rem' }}>
                            <MdCheckCircle size={80} />
                        </div>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Check-In Successful!</h2>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{selectedMember?.first_name} {selectedMember?.last_name}</h3>

                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '2rem', borderRadius: '16px', margin: '2rem 0', border: '1px solid #f59e0b' }}>
                            <p style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Security Claim Code</p>
                            <span style={{ fontSize: '4rem', fontWeight: '900', color: '#f59e0b', letterSpacing: '0.5rem' }}>{checkInResult.security_code}</span>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Please keep this code safe. You will need it for check-out.</p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn-outline-small" onClick={() => window.print()}>
                                <MdPrint size={20} /> Print Security Tags
                            </button>
                            <button className="btn-primary" onClick={reset}>
                                Next Check-In
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckInKiosk;
