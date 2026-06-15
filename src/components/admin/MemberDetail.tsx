import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
    MdArrowBack, MdEdit, MdPhotoCamera, MdEmail, MdPhone,
    MdCalendarToday, MdPerson, MdLocationOn,
    MdChurch, MdStars, MdCheckCircle
} from 'react-icons/md';
import { Member } from '../../api/members';
import { memberApi } from '../../api/members';
import { mediaApi } from '../../api/media';
import { useDataRefresh } from '../../context/DataRefreshContext';

interface MemberDetailProps {
    member: Member;
    onBack: () => void;
    onEdit: (member: Member) => void;
}

const MemberDetail: React.FC<MemberDetailProps> = ({ member, onBack, onEdit }) => {
    const { triggerRefresh } = useDataRefresh();
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [imgError, setImgError] = useState(false);

    React.useEffect(() => {
        if (member.photo) {
            setImgError(false);
            try {
                const url = mediaApi.getAssetUrl(member.photo);
                setPhotoUrl(url);
            } catch {
                setPhotoUrl(null);
            }
        } else {
            setPhotoUrl(null);
        }
    }, [member.photo]);

    const handleUploadPhoto = async () => {
        try {
            const result = await mediaApi.openMediaFileDialog('image');
            if (!result || result.length === 0) return;
            const filePath = result[0];
            setUploading(true);
            await memberApi.updateMember(member.id, { photo: filePath });
            setPhotoUrl(mediaApi.getAssetUrl(filePath));
            setImgError(false);
            toast.success('Profile photo updated.');
            triggerRefresh();
        } catch (error) {
            console.error('Photo upload failed:', error);
            toast.error('Failed to upload photo.');
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePhoto = async () => {
        try {
            setUploading(true);
            await memberApi.updateMember(member.id, { photo: '' });
            setPhotoUrl(null);
            toast.success('Profile photo removed.');
            triggerRefresh();
        } catch {
            toast.error('Failed to remove photo.');
        } finally {
            setUploading(false);
        }
    };

    const styles = {
        container: {
            animation: 'fadeIn 0.3s ease-out',
        },
        topBar: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
        },
        topBarLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
        },
        backBtn: {
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '1.2rem',
        },
        memberName: {
            fontSize: '1.8rem',
            fontWeight: '700',
            color: '#ffffff',
            letterSpacing: '-0.02em',
        },
        badge: (bg: string, color: string) => ({
            fontSize: '0.75rem',
            fontWeight: '700',
            padding: '0.25rem 0.75rem',
            borderRadius: '6px',
            background: bg,
            color,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
        }),
        photoSection: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
        },
        photoWrapper: {
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'rgba(26,115,232,0.15)',
            border: '3px dashed rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative' as const,
            cursor: 'pointer',
            transition: 'all 0.2s',
        },
        photoImg: {
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
            borderRadius: '50%',
        },
        photoPlaceholder: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: '0.25rem',
            color: '#94a3b8',
            fontSize: '2.5rem',
        },
        photoPlaceholderText: {
            fontSize: '0.75rem',
            color: '#94a3b8',
        },
        photoActions: {
            display: 'flex',
            gap: '0.75rem',
        },
        photoBtn: {
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginTop: '1rem',
        },
        card: {
            background: '#1e1e2e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '1.5rem',
        },
        cardTitle: {
            fontSize: '0.75rem',
            fontWeight: '700',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: '#94a3b8',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
        },
        fieldRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0.6rem 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
        },
        fieldLabel: {
            fontSize: '0.85rem',
            color: '#94a3b8',
            fontWeight: '500',
        },
        fieldValue: {
            fontSize: '0.9rem',
            color: '#ffffff',
            fontWeight: '500',
            textAlign: 'right' as const,
        },
        sectionHeader: {
            gridColumn: '1 / -1',
            fontSize: '0.75rem',
            fontWeight: '700',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: '#94a3b8',
            marginTop: '0.5rem',
            marginBottom: '0.5rem',
        },
    };

    const field = (label: string, value: string | undefined | null, icon?: React.ReactNode) => (
        <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>{icon} {label}</span>
            <span style={styles.fieldValue}>{value || '—'}</span>
        </div>
    );

    const roleColor = member.role === 'member' ? '#94a3b8' : '#1a73e8';
    const statusColor = member.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)';
    const statusTextColor = member.status === 'active' ? '#10b981' : '#f59e0b';

    return (
        <div style={styles.container} className="animate-fade-in">
            {/* Top Bar */}
            <div style={styles.topBar}>
                <div style={styles.topBarLeft}>
                    <button
                        style={styles.backBtn}
                        onClick={onBack}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                    >
                        <MdArrowBack />
                    </button>
                    <div>
                        <span style={styles.memberName}>{member.first_name} {member.last_name}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <span style={styles.badge(`rgba(26,115,232,0.12)`, roleColor)}>
                                {member.role.replace('_', ' ')}
                            </span>
                            <span style={styles.badge(statusColor, statusTextColor)}>
                                {member.status}
                            </span>
                        </div>
                    </div>
                </div>
                <button className="btn-primary" onClick={() => onEdit(member)} style={{ gap: '0.5rem' }}>
                    <MdEdit size={18} /> Edit Profile
                </button>
            </div>

            {/* Photo Section */}
            <div style={styles.photoSection}>
                <div
                    style={styles.photoWrapper}
                    onClick={handleUploadPhoto}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#1a73e8';
                        e.currentTarget.style.background = 'rgba(26,115,232,0.25)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                        e.currentTarget.style.background = 'rgba(26,115,232,0.15)';
                    }}
                >
                    {photoUrl && !imgError ? (
                        <img
                            src={photoUrl}
                            alt={`${member.first_name} ${member.last_name}`}
                            style={styles.photoImg}
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div style={styles.photoPlaceholder}>
                            <MdPhotoCamera />
                            <div style={styles.photoPlaceholderText}>
                                {member.first_name[0]}{member.last_name[0]}
                            </div>
                        </div>
                    )}
                </div>
                <div style={styles.photoActions}>
                    <button style={styles.photoBtn} onClick={handleUploadPhoto} disabled={uploading}>
                        <MdPhotoCamera size={16} /> {uploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    {member.photo && (
                        <button style={{ ...styles.photoBtn, color: '#ef4444' }} onClick={handleRemovePhoto} disabled={uploading}>
                            Remove
                        </button>
                    )}
                </div>
            </div>

            {/* Details Grid */}
            <div style={styles.grid}>
                {/* Personal Information */}
                <div style={styles.card}>
                    <div style={styles.cardTitle}><MdPerson size={16} /> Personal Information</div>
                    {field('Full Name', `${member.first_name} ${member.last_name}`)}
                    {field('Date of Birth', member.dob ? new Date(member.dob).toLocaleDateString() : null)}
                    {field('Gender', member.gender)}
                    {field('Hometown', member.hometown)}
                    {field('Occupation', member.occupation)}
                    {field('Marital Status', member.marital_status)}
                </div>

                {/* Contact Information */}
                <div style={styles.card}>
                    <div style={styles.cardTitle}><MdEmail size={16} /> Contact Information</div>
                    {field('Email', member.email, <MdEmail size={14} />)}
                    {field('Phone', member.phone, <MdPhone size={14} />)}
                    {field('Address', member.address, <MdLocationOn size={14} />)}
                    {field('Emergency Contact', member.emergency_contact)}
                </div>

                {/* Church Information */}
                <div style={styles.card}>
                    <div style={styles.cardTitle}><MdChurch size={16} /> Church Information</div>
                    {field('Role', member.role.replace('_', ' '))}
                    {field('Ministry', member.ministry || '—', <MdStars size={14} />)}
                    {field('Membership Status', member.membership_status || '—')}
                    {field('Joined Date', member.joined_at ? new Date(member.joined_at).toLocaleDateString() : null, <MdCalendarToday size={14} />)}
                    {field('Status', member.status)}
                </div>

                {/* Sacraments */}
                <div style={styles.card}>
                    <div style={styles.cardTitle}><MdCheckCircle size={16} /> Sacraments</div>
                    {field('Baptized', member.is_baptized ? 'Yes' : 'No')}
                    {member.is_baptized && field('Baptism Date', member.baptism_date ? new Date(member.baptism_date).toLocaleDateString() : null)}
                    {field('Confirmation Date', member.confirmation_date ? new Date(member.confirmation_date).toLocaleDateString() : null)}
                    {field('Wedding Date', member.wedding_date ? new Date(member.wedding_date).toLocaleDateString() : null)}
                </div>
            </div>
        </div>
    );
};

export default MemberDetail;
