import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MdDashboard, MdPeople, MdEvent, MdAttachMoney,
    MdSettings, MdLogout, MdGroup, MdCampaign,
    MdPieChart, MdCheckCircle, MdAssignmentInd, MdFactCheck,
    MdSearch, MdClose, MdKeyboardArrowRight,
    MdFavorite, MdPeopleOutline, MdAccountBalance,
    MdCampaign as MdAnnouncement, MdMeetingRoom,
    MdHistory, MdNotifications, MdReceipt, MdBackup,
    MdAdminPanelSettings
} from 'react-icons/md';
import './AdminDashboard.css';
import { memberApi, Member } from '../api/members';
import { groupApi, Group } from '../api/groups';
import { eventsApi, Event } from '../api/events';
import { settingsApi } from '../api/settings';
import { mediaApi } from '../api/media';
import { DataRefreshProvider } from '../context/DataRefreshContext';

// Sub-components
import AdminOverview from './admin/AdminOverview';
import AdminMembers from './admin/AdminMembers';
import AdminFinance from './admin/AdminFinance';
import AdminAttendance from './admin/AdminAttendance';
import AdminGroups from './admin/AdminGroups';
import AdminComms from './admin/AdminComms';
import AdminEvents from './admin/AdminEvents';
import AdminVolunteers from './admin/AdminVolunteers';
import AdminCheckIn from './admin/AdminCheckIn';
import AdminReports from './admin/AdminReports';
import AdminSettings from './admin/AdminSettings';
import AdminPastoralCare from './admin/AdminPastoralCare';
import AdminVisitors from './admin/AdminVisitors';
import AdminBudget from './admin/AdminBudget';
import AdminAnnouncements from './admin/AdminAnnouncements';
import AdminVenues from './admin/AdminVenues';
import AdminAudit from './admin/AdminAudit';
import AdminReminders from './admin/AdminReminders';
import AdminReceipts from './admin/AdminReceipts';
import AdminBackup from './admin/AdminBackup';
import AdminRoles from './admin/AdminRoles';

interface AdminDashboardProps {
    userEmail?: string;
}

interface SearchResults {
    members: Member[];
    groups: Group[];
    events: Event[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userEmail }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResults>({ members: [], groups: [], events: [] });
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const navigate = useNavigate();
    const searchRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const [churchLogo, setChurchLogo] = useState('');

    useEffect(() => {
        settingsApi.getAppConfig().then(async (config) => {
            if (config.church_logo) {
                const url = await mediaApi.getLocalImageUrl(config.church_logo);
                setChurchLogo(url);
            }
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ members: [], groups: [], events: [] });
            setShowSearchDropdown(false);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const [members, groups, events] = await Promise.all([
                    memberApi.getMembers(),
                    groupApi.getGroups(),
                    eventsApi.getAllEvents(),
                ]);
                const q = searchQuery.toLowerCase();
                setSearchResults({
                    members: members.filter(m =>
                        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
                        m.email?.toLowerCase().includes(q)
                    ),
                    groups: groups.filter(g =>
                        g.name.toLowerCase().includes(q) ||
                        g.description?.toLowerCase().includes(q)
                    ),
                    events: events.filter(e =>
                        e.title.toLowerCase().includes(q) ||
                        e.description?.toLowerCase().includes(q)
                    ),
                });
                setShowSearchDropdown(true);
            } catch {
                setSearchResults({ members: [], groups: [], events: [] });
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearchResultClick = (tab: string) => {
        setActiveTab(tab);
        setSearchQuery('');
        setSearchResults({ members: [], groups: [], events: [] });
        setShowSearchDropdown(false);
    };

    const handleLogout = () => {
        navigate('/admin/login');
    };

    const avatarLetter = userEmail ? userEmail[0].toUpperCase() : 'A';
    const totalResults = searchResults.members.length + searchResults.groups.length + searchResults.events.length;

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <AdminOverview />;
            case 'members':
                return <AdminMembers />;
            case 'groups':
                return <AdminGroups />;
            case 'attendance':
                return <AdminAttendance />;
            case 'events':
                return <AdminEvents />;
            case 'finance':
                return <AdminFinance />;
            case 'comms':
                return <AdminComms />;
            case 'volunteers':
                return <AdminVolunteers />;
            case 'checkin':
                return <AdminCheckIn />;
            case 'reports':
                return <AdminReports />;
            case 'pastoral':
                return <AdminPastoralCare />;
            case 'visitors':
                return <AdminVisitors />;
            case 'budget':
                return <AdminBudget />;
            case 'announcements':
                return <AdminAnnouncements />;
            case 'venues':
                return <AdminVenues />;
            case 'audit':
                return <AdminAudit />;
            case 'reminders':
                return <AdminReminders />;
            case 'receipts':
                return <AdminReceipts />;
            case 'backup':
                return <AdminBackup />;
            case 'adminroles':
                return <AdminRoles />;
            case 'settings':
                return <AdminSettings />;
            default:
                return <AdminOverview />;
        }
    };

    return (
        <div className="admin-dashboard-app animate-fade-in">
            {/* Admin Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    {churchLogo ? (
                        <img src={churchLogo} alt="Church" className="sidebar-logo-img" />
                    ) : (
                        <div className="logo-icon-small"></div>
                    )}
                    <div>
                        <h2>Church Admin</h2>
                        <p className="admin-role">System Administrator</p>
                    </div>
                </div>

                <nav className="admin-nav">
                    <div className="nav-section-title">Main Menu</div>
                    <ul>
                        <li>
                            <button
                                className={activeTab === 'overview' ? 'active' : ''}
                                onClick={() => setActiveTab('overview')}
                            >
                                <MdDashboard className="nav-icon" /> Overview
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'members' ? 'active' : ''}
                                onClick={() => setActiveTab('members')}
                            >
                                <MdPeople className="nav-icon" /> Member Directory
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'groups' ? 'active' : ''}
                                onClick={() => setActiveTab('groups')}
                            >
                                <MdGroup className="nav-icon" /> Small Groups
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'attendance' ? 'active' : ''}
                                onClick={() => setActiveTab('attendance')}
                            >
                                <MdFactCheck className="nav-icon" /> Attendance
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'events' ? 'active' : ''}
                                onClick={() => setActiveTab('events')}
                            >
                                <MdEvent className="nav-icon" /> Event Planning
                            </button>
                        </li>
                    </ul>

                    <div className="nav-section-title">Care & Growth</div>
                    <ul>
                        <li>
                            <button
                                className={activeTab === 'pastoral' ? 'active' : ''}
                                onClick={() => setActiveTab('pastoral')}
                            >
                                <MdFavorite className="nav-icon" /> Pastoral Care
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'visitors' ? 'active' : ''}
                                onClick={() => setActiveTab('visitors')}
                            >
                                <MdPeopleOutline className="nav-icon" /> Visitors
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'groups' ? 'active' : ''}
                                onClick={() => setActiveTab('groups')}
                            >
                                <MdGroup className="nav-icon" /> Small Groups
                            </button>
                        </li>
                    </ul>

                    <div className="nav-section-title">Operations</div>
                    <ul>
                        <li>
                            <button
                                className={activeTab === 'finance' ? 'active' : ''}
                                onClick={() => setActiveTab('finance')}
                            >
                                <MdAttachMoney className="nav-icon" /> Finance & Giving
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'budget' ? 'active' : ''}
                                onClick={() => setActiveTab('budget')}
                            >
                                <MdAccountBalance className="nav-icon" /> Budget
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'receipts' ? 'active' : ''}
                                onClick={() => setActiveTab('receipts')}
                            >
                                <MdReceipt className="nav-icon" /> Receipts
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'comms' ? 'active' : ''}
                                onClick={() => setActiveTab('comms')}
                            >
                                <MdCampaign className="nav-icon" /> Communications
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'announcements' ? 'active' : ''}
                                onClick={() => setActiveTab('announcements')}
                            >
                                <MdAnnouncement className="nav-icon" /> Announcements
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'venues' ? 'active' : ''}
                                onClick={() => setActiveTab('venues')}
                            >
                                <MdMeetingRoom className="nav-icon" /> Venues
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'volunteers' ? 'active' : ''}
                                onClick={() => setActiveTab('volunteers')}
                            >
                                <MdAssignmentInd className="nav-icon" /> Volunteers
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'checkin' ? 'active' : ''}
                                onClick={() => setActiveTab('checkin')}
                            >
                                <MdCheckCircle className="nav-icon" /> Child Check-In
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'reports' ? 'active' : ''}
                                onClick={() => setActiveTab('reports')}
                            >
                                <MdPieChart className="nav-icon" /> Reports
                            </button>
                        </li>
                    </ul>

                    <div className="nav-section-title">Tools</div>
                    <ul>
                        <li>
                            <button
                                className={activeTab === 'reminders' ? 'active' : ''}
                                onClick={() => setActiveTab('reminders')}
                            >
                                <MdNotifications className="nav-icon" /> Reminders
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'audit' ? 'active' : ''}
                                onClick={() => setActiveTab('audit')}
                            >
                                <MdHistory className="nav-icon" /> Audit Log
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'backup' ? 'active' : ''}
                                onClick={() => setActiveTab('backup')}
                            >
                                <MdBackup className="nav-icon" /> Backup
                            </button>
                        </li>
                    </ul>

                    <div className="nav-section-title">System</div>
                    <ul>
                        <li>
                            <button
                                className={activeTab === 'adminroles' ? 'active' : ''}
                                onClick={() => setActiveTab('adminroles')}
                            >
                                <MdAdminPanelSettings className="nav-icon" /> Admin Roles
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'settings' ? 'active' : ''}
                                onClick={() => setActiveTab('settings')}
                            >
                                <MdSettings className="nav-icon" /> Settings
                            </button>
                        </li>
                    </ul>
                </nav>

                <div className="admin-sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <MdLogout /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="admin-content-area">
                <header className="admin-header">
                    {churchLogo && (
                        <img src={churchLogo} alt="Church" className="header-logo-img" />
                    )}
                    <div className="header-search" ref={searchRef}>
                        <MdSearch className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search members, groups, or events..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onFocus={() => { if (totalResults > 0) setShowSearchDropdown(true); }}
                        />
                        {searchQuery && (
                            <button className="search-clear" onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}>
                                <MdClose size={16} />
                            </button>
                        )}
                        {showSearchDropdown && (
                            <div className="search-dropdown">
                                {searchLoading ? (
                                    <div className="search-loading">Searching...</div>
                                ) : totalResults === 0 ? (
                                    <div className="search-no-results">No results found</div>
                                ) : (
                                    <>
                                        {searchResults.members.length > 0 && (
                                            <div className="search-category">
                                                <div className="search-category-label">Members ({searchResults.members.length})</div>
                                                {searchResults.members.map(m => (
                                                    <button key={m.id} className="search-result-item" onClick={() => handleSearchResultClick('members')}>
                                                        <MdPeople size={16} />
                                                        <span>{m.first_name} {m.last_name}</span>
                                                        <MdKeyboardArrowRight size={16} className="search-result-arrow" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.groups.length > 0 && (
                                            <div className="search-category">
                                                <div className="search-category-label">Groups ({searchResults.groups.length})</div>
                                                {searchResults.groups.map(g => (
                                                    <button key={g.id} className="search-result-item" onClick={() => handleSearchResultClick('groups')}>
                                                        <MdGroup size={16} />
                                                        <span>{g.name}</span>
                                                        <MdKeyboardArrowRight size={16} className="search-result-arrow" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.events.length > 0 && (
                                            <div className="search-category">
                                                <div className="search-category-label">Events ({searchResults.events.length})</div>
                                                {searchResults.events.map(e => (
                                                    <button key={e.id} className="search-result-item" onClick={() => handleSearchResultClick('events')}>
                                                        <MdEvent size={16} />
                                                        <span>{e.title}</span>
                                                        <MdKeyboardArrowRight size={16} className="search-result-arrow" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="header-actions" ref={profileRef}>
                        <div className="admin-avatar" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                            {avatarLetter}
                        </div>
                        {showProfileDropdown && (
                            <div className="profile-dropdown">
                                <div className="profile-dropdown-header">
                                    <div className="profile-dropdown-avatar">{avatarLetter}</div>
                                    <div className="profile-dropdown-info">
                                        <div className="profile-dropdown-email">{userEmail || 'Admin'}</div>
                                        <div className="profile-dropdown-role">Administrator</div>
                                    </div>
                                </div>
                                <div className="profile-dropdown-divider" />
                                <button className="profile-dropdown-item" onClick={() => { setActiveTab('settings'); setShowProfileDropdown(false); }}>
                                    <MdSettings size={16} />
                                    <span>Settings</span>
                                </button>
                                <button className="profile-dropdown-item logout" onClick={handleLogout}>
                                    <MdLogout size={16} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="admin-scroll-content">
                    <DataRefreshProvider>
                        {renderContent()}
                    </DataRefreshProvider>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
