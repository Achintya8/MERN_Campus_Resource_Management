import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TIME_SLOTS = [
    { start: '09:00', end: '10:00', label: '09:00 AM - 10:00 AM' },
    { start: '10:00', end: '11:00', label: '10:00 AM - 11:00 AM' },
    { start: '11:00', end: '12:00', label: '11:00 AM - 12:00 PM' },
    { start: '12:00', end: '13:00', label: '12:00 PM - 01:00 PM' },
    { start: '13:00', end: '14:00', label: '01:00 PM - 02:00 PM' },
    { start: '14:00', end: '15:00', label: '02:00 PM - 03:00 PM' },
    { start: '15:00', end: '16:00', label: '03:00 PM - 04:00 PM' },
    { start: '16:00', end: '16:30', label: '04:00 PM - 04:30 PM' },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const Resources = () => {
    const [resources, setResources] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('ALL');

    // Teams Calendar Modal state
    const [selectedResource, setSelectedResource] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [viewMode, setViewMode] = useState('DAY'); // 'DAY' or 'WEEK'
    const [quickBookingModal, setQuickBookingModal] = useState(null);
    const [bookingPurpose, setBookingPurpose] = useState('');
    const [bookingMsg, setBookingMsg] = useState('');

    const getTodayStr = () => {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const fetchResources = async () => {
        try {
            const res = await api.get('/resources');
            setResources(res.data);
        } catch (err) {
            console.error("Error fetching resources", err);
        }
    };

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings');
            setBookings(res.data);
        } catch (err) {
            console.error("Error fetching bookings", err);
        }
    };

    useEffect(() => {
        fetchResources();
        fetchBookings();
        setSelectedDate(getTodayStr());
    }, []);

    const handleCardClick = (resource) => {
        setSelectedResource(resource);
        if (!selectedDate) setSelectedDate(getTodayStr());
    };

    // Filter bookings for the selected resource
    const resourceBookings = selectedResource ? bookings.filter(b => 
        String(b.resource_id) === String(selectedResource.id) &&
        b.status !== 'CANCELLED' && 
        b.status !== 'REJECTED'
    ) : [];

    // Check booking for a specific date and time slot
    const getBookingForSlot = (dateStr, slotStart, slotEnd) => {
        if (!dateStr) return null;
        const slotStartTime = new Date(`${dateStr}T${slotStart}:00`).getTime();
        const slotEndTime = new Date(`${dateStr}T${slotEnd}:00`).getTime();

        return resourceBookings.find(b => {
            const bStart = new Date(b.start_time).getTime();
            const bEnd = new Date(b.end_time).getTime();
            return slotStartTime < bEnd && slotEndTime > bStart;
        });
    };

    // Quick Book submission from Teams Calendar view
    const handleQuickBook = async (e) => {
        e.preventDefault();
        if (!quickBookingModal) return;
        setBookingMsg('');

        const startISO = `${quickBookingModal.date}T${quickBookingModal.slot.start}:00`;
        const endISO = `${quickBookingModal.date}T${quickBookingModal.slot.end}:00`;

        try {
            await api.post('/bookings', {
                resource_id: selectedResource.id,
                start_time: startISO,
                end_time: endISO,
                purpose: bookingPurpose
            });
            alert('Quick reservation requested successfully!');
            setQuickBookingModal(null);
            setBookingPurpose('');
            fetchBookings();
        } catch (err) {
            setBookingMsg(err.response?.data?.error || 'Booking failed');
        }
    };

    const filteredResources = resources.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (r.features && r.features.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filter === 'ALL' || r.type === filter;
        return matchesSearch && matchesFilter;
    });

    const formatDisplayDate = (dStr) => {
        if (!dStr) return '';
        const d = new Date(dStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <>
            <header>
                <h2>Campus Resources</h2>
                <p style={{ color: 'var(--text-muted)' }}>Click on any resource card to open its MS Teams-style interactive schedule calendar</p>
            </header>

            <div className="controls-bar">
                <div className="search-box">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        placeholder="Search by room name or features..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    {['ALL', 'HALL', 'CLASSROOM', 'LAB'].map(type => (
                        <button 
                            key={type}
                            className={`filter-btn ${filter === type ? 'active' : ''}`}
                            onClick={() => setFilter(type)}
                        >
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Resources Cards Grid */}
            <div className="resources-grid">
                {filteredResources.map(r => (
                    <div 
                        className="resource-card" 
                        key={r.id} 
                        onClick={() => handleCardClick(r)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
                        title="Click to view MS Teams Calendar view for this room"
                    >
                        <div className="rc-header">
                            <div>
                                <div className="rc-title">{r.name}</div>
                                <div className="rc-type">{r.type}</div>
                            </div>
                            <span className={`status-badge ${r.occupied ? 'status-occupied' : 'status-empty'}`}>
                                {r.occupied ? 'Occupied' : 'Available'}
                                {!!r.occupied && !!r.occupied_until && (
                                    <>
                                        <br/>
                                        <small>Until: {new Date(r.occupied_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                    </>
                                )}
                            </span>
                        </div>
                        <div className="rc-details">
                            <div><span className="material-icons" style={{ fontSize: '16px' }}>people</span> Capacity: {r.capacity}</div>
                            {r.current_purpose && <div><span className="material-icons" style={{ fontSize: '16px' }}>event</span> {r.current_purpose}</div>}
                            {r.current_semester && <div><span className="material-icons" style={{ fontSize: '16px' }}>groups</span> {r.current_semester}</div>}
                            {r.current_subject && <div><span className="material-icons" style={{ fontSize: '16px' }}>book</span> {r.current_subject}</div>}
                        </div>
                        <div className="rc-features">
                            {r.features || 'No specific features listed'}
                        </div>
                        <div style={{
                            marginTop: '12px',
                            paddingTop: '8px',
                            borderTop: '1px dashed var(--border-color)',
                            fontSize: '0.8rem',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <span className="material-icons" style={{ fontSize: '15px' }}>date_range</span> View Schedule Calendar
                        </div>
                    </div>
                ))}
            </div>

            {/* MS Teams-Style Interactive Calendar Drawer / Modal */}
            {selectedResource && (
                <div className="modal-overlay" onClick={() => setSelectedResource(null)}>
                    <div 
                        className="modal-content" 
                        onClick={e => e.stopPropagation()} 
                        style={{ maxWidth: '900px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <span className="close-modal" onClick={() => setSelectedResource(null)}>&times;</span>

                        {/* Teams Calendar Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedResource.name} Schedule Calendar</h3>
                                    <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
                                        {selectedResource.type}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Capacity: {selectedResource.capacity} seats | Features: {selectedResource.features || 'Standard Classroom'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                    type="date" 
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                        </div>

                        {/* Current Selected Date Banner */}
                        <div style={{
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(14, 165, 233, 0.06)',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid rgba(14, 165, 233, 0.15)'
                        }}>
                            <div>
                                <strong>Date:</strong> {formatDisplayDate(selectedDate)}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4f46e5', marginRight: '4px' }}></span>Timetable Class</span>
                                <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7', marginRight: '4px' }}></span>User Booking</span>
                                <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706', marginRight: '4px' }}></span>Pending</span>
                                <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', marginRight: '4px' }}></span>Available Slot</span>
                            </div>
                        </div>

                        {/* Teams Time-Slot Grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {TIME_SLOTS.map(slot => {
                                const booking = getBookingForSlot(selectedDate, slot.start, slot.end);
                                const isBooked = !!booking;

                                return (
                                    <div 
                                        key={slot.start}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '160px 1fr',
                                            alignItems: 'center',
                                            gap: '15px',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            background: isBooked 
                                                ? (booking.status === 'TIMETABLE' 
                                                    ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.02) 100%)' 
                                                    : booking.status === 'PENDING'
                                                        ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)'
                                                        : 'linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.02) 100%)')
                                                : 'rgba(16, 185, 129, 0.03)',
                                            border: `1px solid ${
                                                isBooked 
                                                    ? (booking.status === 'TIMETABLE' ? '#c7d2fe' : booking.status === 'PENDING' ? '#fde68a' : '#bae6fd')
                                                    : '#a7f3d0'
                                            }`,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {/* Time Label */}
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-color)' }}>
                                            {slot.label}
                                        </div>

                                        {/* Slot Content */}
                                        {isBooked ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: booking.status === 'TIMETABLE' ? '#3730a3' : '#0369a1' }}>
                                                        {booking.status === 'TIMETABLE' ? 'Timetable Class' : 'Reservation'}: {booking.purpose || booking.subject}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {booking.teacher && <span>Faculty: <strong>{booking.teacher}</strong> | </span>}
                                                        {booking.semester && <span>Semester: <strong>{booking.semester}</strong> | </span>}
                                                        {booking.requester && <span>Requested by: <strong>{booking.requester}</strong></span>}
                                                    </div>
                                                </div>
                                                <span className="status-badge" style={{
                                                    background: booking.status === 'TIMETABLE' ? '#e0e7ff' : booking.status === 'PENDING' ? '#fef3c7' : '#e0f2fe',
                                                    color: booking.status === 'TIMETABLE' ? '#3730a3' : booking.status === 'PENDING' ? '#92400e' : '#0369a1'
                                                }}>
                                                    {booking.status === 'TIMETABLE' ? 'Class Scheduled' : booking.status === 'PENDING' ? 'Pending Approval' : 'Confirmed'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 500 }}>
                                                    Available Slot
                                                </span>
                                                <button 
                                                    className="cta-btn" 
                                                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                                    onClick={() => setQuickBookingModal({ date: selectedDate, slot })}
                                                >
                                                    + Reserve This Slot
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Booking Modal */}
            {quickBookingModal && (
                <div className="modal-overlay" onClick={() => setQuickBookingModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <span className="close-modal" onClick={() => setQuickBookingModal(null)}>&times;</span>
                        <h3>Reserve Slot: {selectedResource?.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '15px' }}>
                            Date: <strong>{formatDisplayDate(quickBookingModal.date)}</strong> | Time: <strong>{quickBookingModal.slot.label}</strong>
                        </p>

                        {bookingMsg && (
                            <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '0.85rem', marginBottom: '12px' }}>
                                {bookingMsg}
                            </div>
                        )}

                        <form onSubmit={handleQuickBook}>
                            <div className="form-group">
                                <label>Purpose / Event</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., Guest Lecture, Department Meeting"
                                    value={bookingPurpose}
                                    onChange={e => setBookingPurpose(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="cta-btn" style={{ width: '100%', justifyContent: 'center' }}>
                                Confirm Quick Reservation
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Resources;
