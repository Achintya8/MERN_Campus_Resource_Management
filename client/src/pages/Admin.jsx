import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Admin = () => {
    const [bookings, setBookings] = useState([]);

    // Accordions state: closed by default on page open
    const [showPendingRequests, setShowPendingRequests] = useState(false);
    const [showActiveBookings, setShowActiveBookings] = useState(false);
    const [showUsers, setShowUsers] = useState(false);
    const [users, setUsers] = useState([]);

    // Search & Filter state for Admin page
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL', 'PENDING', 'CANCEL_REQUESTED', 'CONFIRMED'

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings');
            setBookings(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchBookings();
        fetchUsers();
    }, []);

    const handleDeleteUser = async (id, username) => {
        if (!confirm(`Are you sure you want to delete user ${username}?`)) return;
        try {
            await api.delete(`/admin/users/${id}`);
            alert(`User ${username} deleted.`);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete user.');
        }
    };


    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/bookings/${id}/status`, { status });
            alert(`Action: ${status} performed.`);
            fetchBookings();
        } catch (err) {
            alert("Action failed");
        }
    };

    const handleDeleteBooking = async (id, resourceName) => {
        if (!confirm(`Are you sure you want to delete/cancel the booking for ${resourceName}?`)) return;
        try {
            await api.delete(`/bookings/${id}`);
            alert('Booking deleted/cancelled by admin.');
            fetchBookings();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete booking.');
        }
    };

    const formatDate = (dateStr) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
        }).format(new Date(dateStr));
    };

    // Filter Logic for Admin Tables
    const filterBookingList = (list) => {
        return list.filter(b => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term || 
                (b.resource_name && b.resource_name.toLowerCase().includes(term)) ||
                (b.purpose && b.purpose.toLowerCase().includes(term)) ||
                (b.subject && b.subject.toLowerCase().includes(term)) ||
                (b.teacher && b.teacher.toLowerCase().includes(term)) ||
                (b.requester && b.requester.toLowerCase().includes(term)) ||
                (b.cancel_reason && b.cancel_reason.toLowerCase().includes(term)) ||
                (b.status && b.status.toLowerCase().includes(term)) ||
                formatDate(b.start_time).toLowerCase().includes(term);

            const matchesType = typeFilter === 'ALL' || 
                (typeFilter === 'PENDING' && b.status === 'PENDING') ||
                (typeFilter === 'CANCEL_REQUESTED' && b.status === 'CANCEL_REQUESTED') ||
                (typeFilter === 'CONFIRMED' && (b.status === 'APPROVED' || b.status === 'TIMETABLE'));

            return matchesSearch && matchesType;
        });
    };

    const pendingRequests = filterBookingList(bookings.filter(b => b.status === 'PENDING' || b.status === 'CANCEL_REQUESTED'));
    const activeConfirmedBookings = filterBookingList(bookings.filter(b => (b.status === 'APPROVED' || b.status === 'TIMETABLE' || b.status === 'BLOCKED') && new Date() < new Date(b.end_time)));

    return (
        <>
            <header>
                <h2>Admin Management & Approvals</h2>
                <p style={{ color: 'var(--text-muted)' }}>Approve booking requests, approve cancellations, and delete/override active reservations</p>
            </header>

            {/* Search & Filter Bar for Admin */}
            <div className="controls-bar" style={{ marginTop: '20px', marginBottom: '25px' }}>
                <div className="search-box">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        placeholder="Search approvals by room, requester, purpose, subject, or reason..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    {[
                        { id: 'ALL', label: 'All Requests' },
                        { id: 'PENDING', label: 'New Requests' },
                        { id: 'CANCEL_REQUESTED', label: 'Cancellations' },
                        { id: 'CONFIRMED', label: 'Confirmed' }
                    ].map(btn => (
                        <button 
                            key={btn.id}
                            className={`filter-btn ${typeFilter === btn.id ? 'active' : ''}`}
                            onClick={() => setTypeFilter(btn.id)}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Collapsible Accordion 1: Pending Requests Section (Closed by default) */}
            <div className="card" style={{ marginBottom: '25px' }}>
                <div 
                    onClick={() => setShowPendingRequests(!showPendingRequests)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>Pending Approval & Cancellation Requests</h3>
                        <span style={{ 
                            background: pendingRequests.length > 0 ? '#ef4444' : 'var(--text-muted)', 
                            color: '#fff', 
                            borderRadius: '12px', 
                            padding: '2px 10px', 
                            fontSize: '0.8rem', 
                            fontWeight: 600 
                        }}>
                            {pendingRequests.length}
                        </span>
                    </div>
                    <button className="filter-btn" style={{ padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {showPendingRequests ? 'Hide List' : 'Show List'}
                    </button>
                </div>

                {showPendingRequests && (
                    <div style={{ marginTop: '15px' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Resource</th>
                                    <th>Requester</th>
                                    <th>Time Slot</th>
                                    <th>Purpose / Reason</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map(b => (
                                    <tr key={b.id}>
                                        <td>
                                            <span className={`status-badge ${b.status === 'PENDING' ? 'status-pending' : 'status-cancel'}`}>
                                                {b.status === 'PENDING' ? 'New Request' : 'Cancellation'}
                                            </span>
                                        </td>
                                        <td>{b.resource_name}</td>
                                        <td>{b.requester}</td>
                                        <td>{formatDate(b.start_time)} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>
                                            <div>{b.purpose || b.subject}</div>
                                            {b.cancel_reason && (
                                                <small style={{ color: '#dc2626', display: 'block', marginTop: '2px' }}>
                                                    Reason: "{b.cancel_reason}"
                                                </small>
                                            )}
                                        </td>
                                        <td>
                                            {b.status === 'PENDING' ? (
                                                <>
                                                    <button className="cta-btn" style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', marginRight: '5px' }} onClick={() => handleStatusUpdate(b.id, 'APPROVED')}>Approve</button>
                                                    <button className="cancel-btn" style={{ padding: '4px 10px' }} onClick={() => handleStatusUpdate(b.id, 'REJECTED')}>Reject</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button className="cta-btn" style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', marginRight: '5px' }} onClick={() => handleStatusUpdate(b.id, 'CANCEL_APPROVED')}>Approve Cancel</button>
                                                    <button className="cancel-btn" style={{ padding: '4px 10px' }} onClick={() => handleStatusUpdate(b.id, 'CANCEL_REJECTED')}>Keep Booking</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {pendingRequests.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No matching pending requests</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Collapsible Accordion 2: Admin Override / Delete Confirmed Bookings (Closed by default) */}
            <div className="card">
                <div 
                    onClick={() => setShowActiveBookings(!showActiveBookings)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>Active & Confirmed Bookings (Admin Delete / Override)</h3>
                        <span style={{ 
                            background: 'var(--primary)', 
                            color: '#fff', 
                            borderRadius: '12px', 
                            padding: '2px 10px', 
                            fontSize: '0.8rem', 
                            fontWeight: 600 
                        }}>
                            {activeConfirmedBookings.length}
                        </span>
                    </div>
                    <button className="filter-btn" style={{ padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {showActiveBookings ? 'Hide List' : 'Show List'}
                    </button>
                </div>

                {showActiveBookings && (
                    <div style={{ marginTop: '15px' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                            As an Admin, you can delete or override any confirmed room booking even after approval.
                        </p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Resource</th>
                                    <th>User / Faculty</th>
                                    <th>Time Slot</th>
                                    <th>Purpose</th>
                                    <th>Status</th>
                                    <th>Admin Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeConfirmedBookings.map(b => (
                                    <tr key={b.id}>
                                        <td>{b.resource_name}</td>
                                        <td>{b.requester || b.teacher || 'Timetable'}</td>
                                        <td>{formatDate(b.start_time)} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{b.purpose || b.subject}</td>
                                        <td>
                                            <span className="status-badge" style={{ background: b.status === 'TIMETABLE' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(14, 165, 233, 0.1)', color: b.status === 'TIMETABLE' ? '#4f46e5' : 'var(--primary)' }}>
                                                {b.status === 'TIMETABLE' ? 'Timetable Class' : 'Confirmed'}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                className="cancel-btn" 
                                                style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }} 
                                                onClick={() => handleDeleteBooking(b.id, b.resource_name)}
                                            >
                                                Delete Booking
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {activeConfirmedBookings.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No matching active bookings</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Collapsible Accordion 3: Registered Users (MongoDB Database View) */}
            <div className="card" style={{ marginTop: '25px' }}>
                <div 
                    onClick={() => setShowUsers(!showUsers)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>Registered Users (MongoDB Database)</h3>
                        <span style={{ 
                            background: '#10b981', 
                            color: '#fff', 
                            borderRadius: '12px', 
                            padding: '2px 10px', 
                            fontSize: '0.8rem', 
                            fontWeight: 600 
                        }}>
                            {users.length}
                        </span>
                    </div>
                    <button className="filter-btn" style={{ padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {showUsers ? 'Hide List' : 'Show Users'}
                    </button>
                </div>

                {showUsers && (
                    <div style={{ marginTop: '15px' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                            Live records directly fetched from your MongoDB <code>users</code> collection.
                        </p>
                        <table>
                            <thead>
                                <tr>
                                    <th>MongoDB ID</th>
                                    <th>Username</th>
                                    <th>Full Name</th>
                                    <th>Role</th>
                                    <th>Created At</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td><code style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{u.id}</code></td>
                                        <td><strong>{u.username}</strong></td>
                                        <td>{u.full_name || '—'}</td>
                                        <td>
                                            <span className="status-badge" style={{ 
                                                background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                                                color: u.role === 'admin' ? '#dc2626' : '#059669' 
                                            }}>
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>{u.created_at ? formatDate(u.created_at) : '—'}</td>
                                        <td>
                                            {u.role !== 'admin' && (
                                                <button 
                                                    className="cancel-btn" 
                                                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                                >
                                                    Delete User
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default Admin;

