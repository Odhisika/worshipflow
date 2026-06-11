import React, { useState, useEffect } from 'react';
import {
    MdAdd,
    MdDelete, MdEdit, MdPersonAdd, MdRemoveCircle,
    MdAccessTime, MdCalendarToday, MdGroups
} from 'react-icons/md';
import { groupApi, Group, GroupMember } from '../../api/groups';
import { memberApi, Member } from '../../api/members';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

const AdminGroups: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [activeTab, setActiveTab] = useState<'list' | 'members'>('list');
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]);

    // Modals
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [groupFormData, setGroupFormData] = useState({
        name: '',
        description: '',
        meeting_day: '',
        meeting_time: ''
    });

    const [memberFormData, setMemberFormData] = useState({
        member_id: '',
        role: 'Member'
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [groupsData, membersData] = await Promise.all([
                groupApi.getGroups(),
                memberApi.getMembers()
            ]);
            setGroups(groupsData);
            setAllMembers(membersData);
        } catch (error) {
            console.error('Failed to fetch group data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [refreshSignal]);

    const fetchGroupMembers = async (groupId: string) => {
        try {
            const members = await groupApi.getGroupMembers(groupId);
            setGroupMembers(members);
        } catch (error) {
            console.error('Failed to fetch group members:', error);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await groupApi.createGroup(groupFormData);
            setShowGroupModal(false);
            resetGroupForm();
            triggerRefresh();
        } catch (error) {
            console.error('Failed to create group:', error);
        }
    };

    const handleUpdateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup) return;
        try {
            await groupApi.updateGroup(selectedGroup.id, groupFormData);
            setShowGroupModal(false);
            resetGroupForm();
            triggerRefresh();
        } catch (error) {
            console.error('Failed to update group:', error);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this group? All memberships will also be removed.')) {
            try {
                await groupApi.deleteGroup(id);
                if (selectedGroup?.id === id) {
                    setSelectedGroup(null);
                    setActiveTab('list');
                }
                triggerRefresh();
            } catch (error) {
                console.error('Failed to delete group:', error);
            }
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup) return;
        try {
            await groupApi.addGroupMember({
                group_id: selectedGroup.id,
                member_id: memberFormData.member_id,
                role: memberFormData.role
            });
            setShowAddMemberModal(false);
            setMemberFormData({ member_id: '', role: 'Member' });
            triggerRefresh();
        } catch (error) {
            console.error('Failed to add member to group:', error);
        }
    };

    const handleRemoveMember = async (groupMemberId: string) => {
        if (window.confirm('Remove this member from the group?')) {
            try {
                await groupApi.removeGroupMember(groupMemberId);
                if (selectedGroup) fetchGroupMembers(selectedGroup.id);
            } catch (error) {
                console.error('Failed to remove member:', error);
            }
        }
    };

    const resetGroupForm = () => {
        setGroupFormData({
            name: '',
            description: '',
            meeting_day: '',
            meeting_time: ''
        });
        setIsEditing(false);
    };

    const openEditModal = (group: Group) => {
        setGroupFormData({
            name: group.name,
            description: group.description || '',
            meeting_day: group.meeting_day || '',
            meeting_time: group.meeting_time || ''
        });
        setSelectedGroup(group);
        setIsEditing(true);
        setShowGroupModal(true);
    };

    const viewGroupMembers = (group: Group) => {
        setSelectedGroup(group);
        fetchGroupMembers(group.id);
        setActiveTab('members');
    };

    return (
        <div className="admin-view-container">
            <div className="view-header animate-fade-in">
                <div>
                    <h1>Small Groups & Ministries</h1>
                    <p>Manage church groups, fellowship, and ministry teams.</p>
                </div>
                <button className="btn-primary" onClick={() => { resetGroupForm(); setShowGroupModal(true); }}>
                    <MdAdd size={20} /> Create Group
                </button>
            </div>

            {loading ? (
                <div className="loading-state">Loading groups...</div>
            ) : (
                <>
                    {activeTab === 'list' ? (
                        <div className="members-grid animate-slide-up">
                            {groups.map(group => (
                                <div key={group.id} className="member-card">
                                    <div className="member-card-header">
                                        <div className="member-avatar">{group.name.charAt(0)}</div>
                                        <div className="member-actions">
                                            <button className="action-dot-btn" onClick={() => openEditModal(group)} title="Edit Group">
                                                <MdEdit size={18} />
                                            </button>
                                            <button
                                                className="action-dot-btn delete"
                                                onClick={() => handleDeleteGroup(group.id)}
                                                title="Delete Group"
                                            >
                                                <MdDelete size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="member-card-body">
                                        <h3>{group.name}</h3>
                                        <p className="member-role">{group.description || 'No description provided.'}</p>
                                        <div className="member-contact">
                                            <span><MdCalendarToday size={14} /> {group.meeting_day || 'Not set'}</span>
                                            <span><MdAccessTime size={14} /> {group.meeting_time || 'Not set'}</span>
                                        </div>
                                    </div>
                                    <div className="member-card-footer">
                                        <button className="btn-outline-small" onClick={() => viewGroupMembers(group)}>
                                            <MdGroups size={18} /> Manage Members
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="members-table-container animate-slide-up">
                            <div className="table-header-row">
                                <button className="btn-text" onClick={() => setActiveTab('list')}>
                                    &larr; Back to Groups
                                </button>
                                <h2>{selectedGroup?.name} Members</h2>
                                <button className="btn-primary-small" onClick={() => setShowAddMemberModal(true)}>
                                    <MdPersonAdd size={18} /> Add Member
                                </button>
                            </div>
                            <table className="members-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupMembers.map(m => (
                                        <tr key={m.id}>
                                            <td className="member-info-cell">
                                                <div className="table-avatar">{m.member_name?.charAt(0)}</div>
                                                <span>{m.member_name}</span>
                                            </td>
                                            <td><span className={`role-badge ${m.role.toLowerCase()}`}>{m.role}</span></td>
                                            <td>{new Date(m.joined_at).toLocaleDateString()}</td>
                                            <td>
                                                <button className="action-dot-btn delete" onClick={() => handleRemoveMember(m.id)} title="Remove Member">
                                                    <MdRemoveCircle size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {groupMembers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="empty-table">No members assigned to this group yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Create/Edit Group Modal */}
            {showGroupModal && (
                <div className="modal-overlay animate-fade-in">
                    <div className="modal-content animate-slide-up">
                        <h2>{isEditing ? 'Edit Group' : 'Create New Group'}</h2>
                        <form onSubmit={isEditing ? handleUpdateGroup : handleCreateGroup}>
                            <div className="form-group">
                                <label>Group Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Youth Ministry"
                                    value={groupFormData.name}
                                    onChange={e => setGroupFormData({ ...groupFormData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    placeholder="What is this group about?"
                                    value={groupFormData.description}
                                    onChange={e => setGroupFormData({ ...groupFormData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Meeting Day</label>
                                    <select
                                        value={groupFormData.meeting_day}
                                        onChange={e => setGroupFormData({ ...groupFormData, meeting_day: e.target.value })}
                                    >
                                        <option value="">Select Day</option>
                                        <option value="Monday">Monday</option>
                                        <option value="Tuesday">Tuesday</option>
                                        <option value="Wednesday">Wednesday</option>
                                        <option value="Thursday">Thursday</option>
                                        <option value="Friday">Friday</option>
                                        <option value="Saturday">Saturday</option>
                                        <option value="Sunday">Sunday</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Meeting Time</label>
                                    <input
                                        type="time"
                                        value={groupFormData.meeting_time}
                                        onChange={e => setGroupFormData({ ...groupFormData, meeting_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-text" onClick={() => setShowGroupModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">{isEditing ? 'Update Group' : 'Create Group'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <div className="modal-overlay animate-fade-in">
                    <div className="modal-content animate-slide-up">
                        <h2>Add Member to {selectedGroup?.name}</h2>
                        <form onSubmit={handleAddMember}>
                            <div className="form-group">
                                <label>Select Member</label>
                                <select
                                    value={memberFormData.member_id}
                                    onChange={e => setMemberFormData({ ...memberFormData, member_id: e.target.value })}
                                    required
                                >
                                    <option value="">-- Choose Member --</option>
                                    {allMembers.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.first_name} {m.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Role in Group</label>
                                <select
                                    value={memberFormData.role}
                                    onChange={e => setMemberFormData({ ...memberFormData, role: e.target.value })}
                                >
                                    <option value="Member">Member</option>
                                    <option value="Leader">Leader</option>
                                    <option value="Coordinator">Coordinator</option>
                                    <option value="Secretary">Secretary</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-text" onClick={() => setShowAddMemberModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Add Member</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminGroups;
