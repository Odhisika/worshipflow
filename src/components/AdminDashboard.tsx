import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MdDashboard, MdPeople, MdEvent, MdAttachMoney,
    MdSettings, MdLogout, MdGroup, MdCampaign,
    MdPieChart, MdEmail, MdCheckCircle, MdAssignmentInd, MdFactCheck
} from 'react-icons/md';
import './AdminDashboard.css';

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

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/admin/login');
    };

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
                    <div className="logo-icon-small"></div>
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
                                className={activeTab === 'comms' ? 'active' : ''}
                                onClick={() => setActiveTab('comms')}
                            >
                                <MdCampaign className="nav-icon" /> Communications
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

                    <div className="nav-section-title">System</div>
                    <ul>
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
                    <div className="header-search">
                        <input type="text" placeholder="Search members, groups, or events..." />
                    </div>
                    <div className="header-actions">
                        <button className="icon-action-btn"><MdEmail size={20} /></button>
                        <div className="admin-avatar">A</div>
                    </div>
                </header>

                <div className="admin-scroll-content">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
