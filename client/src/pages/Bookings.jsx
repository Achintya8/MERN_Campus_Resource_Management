import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Helper time slots generator for college hours (9:00 AM to 4:30 PM)
const START_TIME_SLOTS = [
    { value: '09:00', label: '09:00 AM' },
    { value: '09:30', label: '09:30 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '10:30', label: '10:30 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '11:30', label: '11:30 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '12:30', label: '12:30 PM' },
    { value: '13:00', label: '01:00 PM' },
    { value: '13:30', label: '01:30 PM' },
    { value: '14:00', label: '02:00 PM' },
    { value: '14:30', label: '02:30 PM' },
    { value: '15:00', label: '03:00 PM' },
    { value: '15:30', label: '03:30 PM' },
    { value: '16:00', label: '04:00 PM' },
];

const END_TIME_SLOTS = [
    { value: '09:30', label: '09:30 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '10:30', label: '10:30 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '11:30', label: '11:30 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '12:30', label: '12:30 PM' },
    { value: '13:00', label: '01:00 PM' },
    { value: '13:30', label: '01:30 PM' },
    { value: '14:00', label: '02:00 PM' },
    { value: '14:30', label: '02:30 PM' },
    { value: '15:00', label: '03:00 PM' },
    { value: '15:30', label: '03:30 PM' },
    { value: '16:00', label: '04:00 PM' },
    { value: '16:30', label: '04:30 PM' },
];

const Bookings = () => {
    const [bookings, setBookings] = useState([]);
    const [resources, setResources] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const { user } = useAuth();
    
    // Search & Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Accordion Dropdowns state - ALL CLOSED BY DEFAULT
    const [showMyBookings, setShowMyBookings] = useState(false);
    const [showOtherBookings, setShowOtherBookings] = useState(false);

    // Cancel Request Modal state
    const [cancelModalBooking, setCancelModalBooking] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    // Form state
    const [resourceId, setResourceId] = useState('');
    const [bookingDate, setBookingDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [isCustomTime, setIsCustomTime] = useState(false);
    const [purpose, setPurpose] = useState('');
    const [bookingError, setBookingError] = useState('');

    // Timetable Upload state (moved from Admin)
    const [semester, setSemester] = useState('Sem 5');
    const [semStartDate, setSemStartDate] = useState('');
    const [semEndDate, setSemEndDate] = useState('');
    const [ttFile, setTtFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showTimetableView, setShowTimetableView] = useState(false);

    // Minimum date (today's date YYYY-MM-DD)
    const getMinDate = () => {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    };

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings');
            setBookings(res.data);
        } catch (err) {
            console.error("Error fetching bookings", err);
        }
    };

    const fetchResources = async () => {
        try {
            const res = await api.get('/resources');
            setResources(res.data);
            if (res.data.length > 0 && !resourceId) {
                setResourceId(res.data[0].id);
            }
        } catch (err) {
            console.error("Error fetching resources", err);
        }
    };

    useEffect(() => {
        fetchBookings();

        // Default semester dates
        const today = new Date();
        const pad = n => String(n).padStart(2, '0');
        const startStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 4);
        const endStr = `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-${pad(nextMonth.getDate())}`;
        setSemStartDate(startStr);
        setSemEndDate(endStr);
    }, []);

    const handleOpenModal = () => {
        setBookingError('');
        fetchResources();
        setBookingDate(getMinDate());
        setStartTime('09:00');
        setEndTime('10:00');
        setIsCustomTime(false);
        setPurpose('');
        setShowModal(true);
    };

    const handleOpenUploadModal = () => {
        setUploadError('');
        setUploadResult(null);
        setTtFile(null);
        setShowUploadModal(true);
    };

    // Helper to format date object to YYYY-MM-DD local string
    const getLocalDateString = (dInput) => {
        if (!dInput) return '';
        const d = new Date(dInput);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper to convert dateStr (YYYY-MM-DD) and timeStr (HH:MM) to timestamp ms
    const getSlotTimestamp = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return 0;
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, 0).getTime();
    };

    // Calculate existing active bookings for selected resource on selected date
    const getBookingsForSelectedDate = () => {
        if (!bookingDate || !resourceId) return [];
        return bookings.filter(b => {
            if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
            if (String(b.resource_id) !== String(resourceId)) return false;
            const bDate = getLocalDateString(b.start_time);
            return bDate === bookingDate;
        });
    };

    // Check if a specific time slot is already booked
    const isSlotBooked = (timeVal) => {
        if (!bookingDate) return false;
        const slotTime = getSlotTimestamp(bookingDate, timeVal);
        const activeBookings = getBookingsForSelectedDate();
        return activeBookings.some(b => {
            const bStart = new Date(b.start_time).getTime();
            const bEnd = new Date(b.end_time).getTime();
            return slotTime >= bStart && slotTime < bEnd;
        });
    };

    // Available start time slots (excluding booked slots)
    const availableStartSlots = START_TIME_SLOTS.filter(s => !isSlotBooked(s.value));

    // Available end time slots (must be after selected start time and not overlap booked slot)
    const availableEndSlots = END_TIME_SLOTS.filter(s => {
        if (s.value <= startTime) return false;
        if (!bookingDate) return true;
        const selStart = getSlotTimestamp(bookingDate, startTime);
        const selEnd = getSlotTimestamp(bookingDate, s.value);
        const activeBookings = getBookingsForSelectedDate();
        return !activeBookings.some(b => {
            const bStart = new Date(b.start_time).getTime();
            const bEnd = new Date(b.end_time).getTime();
            return selStart < bEnd && selEnd > bStart;
        });
    });

    // Automatically sync start and end times to valid available options (only in standard mode)
    useEffect(() => {
        if (!showModal || isCustomTime) return;
        if (availableStartSlots.length > 0) {
            const isStartValid = availableStartSlots.some(s => s.value === startTime);
            if (!isStartValid) {
                setStartTime(availableStartSlots[0].value);
            }
        }
    }, [bookingDate, resourceId, showModal, isCustomTime]);

    useEffect(() => {
        if (!showModal || isCustomTime) return;
        if (availableEndSlots.length > 0) {
            const isEndValid = availableEndSlots.some(s => s.value === endTime);
            if (!isEndValid) {
                setEndTime(availableEndSlots[0].value);
            }
        } else {
            setEndTime('');
        }
    }, [startTime, bookingDate, resourceId, showModal, isCustomTime]);

    // Compute "When is room next empty/available" note
    const getNextEmptyNote = () => {
        const activeBookings = getBookingsForSelectedDate();
        if (activeBookings.length === 0) {
            return { type: 'success', text: 'Room is fully available all day!' };
        }
        
        let maxEndTime = 0;
        let lastBooking = null;
        activeBookings.forEach(b => {
            const bEnd = new Date(b.end_time).getTime();
            if (bEnd > maxEndTime) {
                maxEndTime = bEnd;
                lastBooking = b;
            }
        });

        if (maxEndTime > 0) {
            const nextEmptyDate = new Date(maxEndTime);
            const timeStr = nextEmptyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return {
                type: 'info',
                text: `Room Next Empty: ${timeStr} (Occupied for: ${lastBooking?.purpose || lastBooking?.subject || 'Class'})`
            };
        }

        return { type: 'success', text: 'Room is available for booking.' };
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        setBookingError('');

        if (!bookingDate) {
            const msg = 'Please select a date.';
            setBookingError(msg);
            alert(msg);
            return;
        }

        const startISO = `${bookingDate}T${startTime}:00`;
        const endISO = `${bookingDate}T${endTime}:00`;

        const start = new Date(startISO);
        const end = new Date(endISO);
        const now = new Date();

        if (start < now) {
            const msg = 'Cannot book for a past date or time.';
            setBookingError(msg);
            alert(msg);
            return;
        }

        const startH = start.getHours() + start.getMinutes() / 60;
        const endH = end.getHours() + end.getMinutes() / 60;

        if (start >= end) {
            const msg = 'End time must be strictly after start time.';
            setBookingError(msg);
            alert(msg);
            return;
        }

        if (isCustomTime) {
            if (startH < 8.5 || endH > 18.001) {
                const msg = 'Custom time bookings must be between 8:30 AM and 6:00 PM, and end time must be after start time.';
                setBookingError(msg);
                alert(msg);
                return;
            }
        } else {
            if (startH < 9.0 || endH > 16.5) {
                const msg = 'Regular bookings must be within college hours (9:00 AM to 4:30 PM), and end time must be after start time.';
                setBookingError(msg);
                alert(msg);
                return;
            }
        }

        // Pre-check for overlapping bookings on this resource
        const activeBookings = getBookingsForSelectedDate();
        const selStartMs = start.getTime();
        const selEndMs = end.getTime();
        const conflicting = activeBookings.find(b => {
            const bStartMs = new Date(b.start_time).getTime();
            const bEndMs = new Date(b.end_time).getTime();
            return selStartMs < bEndMs && selEndMs > bStartMs;
        });

        if (conflicting) {
            const cStart = new Date(conflicting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const cEnd = new Date(conflicting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const cName = conflicting.purpose || conflicting.subject || 'Class / Meeting';
            const msg = `Cannot book room: It is already occupied from ${cStart} to ${cEnd} for '${cName}'. Please choose a time slot that does not overlap.`;
            setBookingError(msg);
            alert(msg);
            return;
        }

        try {
            const bookingData = {
                resource_id: resourceId,
                start_time: startISO,
                end_time: endISO,
                purpose
            };
            await api.post('/bookings', bookingData);
            alert('Booking created successfully!');
            setShowModal(false);
            fetchBookings();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Booking creation failed';
            setBookingError(errorMsg);
            alert(errorMsg);
        }
    };

    const handleFinishEarly = async (id) => {
        if (!confirm('Finish this active meeting early? The room will immediately become available for others.')) return;
        try {
            await api.post(`/bookings/${id}/cancel`, { action: 'FINISH_EARLY' });
            alert('Meeting finished early! The room is now available.');
            fetchBookings();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to finish meeting early.');
        }
    };

    const handleInitiateCancel = (b) => {
        setCancelModalBooking(b);
        setCancelReason('');
    };

    const handleConfirmCancelRequest = async (e) => {
        e.preventDefault();
        if (!cancelModalBooking) return;
        try {
            await api.post(`/bookings/${cancelModalBooking.id}/cancel`, {
                reason: cancelReason,
                action: 'CANCEL'
            });
            alert('Cancellation request sent to admin.');
            setCancelModalBooking(null);
            setCancelReason('');
            fetchBookings();
        } catch (err) {
            alert('Failed to send cancellation request.');
        }
    };

    // Timetable Upload Handlers
    const handleDownloadSample = () => {
        const sampleCSV = `Day,Timings,Room,Subject,Teacher,Semester
Monday,09:00 AM - 10:00 AM,MC005,Operating Systems,Prof. Sharma,Sem 5
Monday,10:00 AM - 11:00 AM,MC213,Database Management,Prof. Priya,Sem 5
Tuesday,11:00 AM - 12:00 PM,LAB1,Web Technology Lab,Dr. Roy,Sem 5
Wednesday,01:30 PM - 02:30 PM,MC005,Computer Networks,Prof. Ankit,Sem 5
Thursday,09:00 AM - 10:00 AM,MC005,Software Engineering,Prof. Verma,Sem 5
Friday,02:00 PM - 03:00 PM,LAB2,Python Programming Lab,Dr. Kapoor,Sem 5`;

        const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Sample_Semester_Timetable.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        setUploadError('');
        setUploadResult(null);

        if (!ttFile) {
            setUploadError('Please select an Excel or CSV file to upload.');
            return;
        }

        if (!semStartDate || !semEndDate) {
            setUploadError('Please select both Semester Start Date and End Date.');
            return;
        }

        const formData = new FormData();
        formData.append('file', ttFile);
        formData.append('semester', semester);
        formData.append('startDate', semStartDate);
        formData.append('endDate', semEndDate);

        setUploading(true);

        try {
            const res = await api.post('/admin/timetable/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadResult(res.data);
            alert(res.data.message || 'Timetable uploaded and automatic bookings generated!');
            fetchBookings();
        } catch (err) {
            setUploadError(err.response?.data?.error || 'Failed to upload timetable');
        } finally {
            setUploading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        }).format(new Date(dateStr));
    };

    const isOngoing = (b) => {
        const now = new Date();
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        return now >= start && now < end && (b.status === 'APPROVED' || b.status === 'TIMETABLE');
    };

    const getStatusBadge = (b) => {
        const now = new Date();
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);

        if (b.status === 'TIMETABLE') return <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' }}>Timetable Class</span>;
        if (b.status === 'PENDING') return <span className="status-badge status-pending">Requested</span>;
        if (b.status === 'CANCEL_REQUESTED') return <span className="status-badge status-cancel">Cancellation Pending</span>;
        if (b.status === 'CANCELLED') return <span className="status-badge" style={{ background: 'rgba(0,0,0,0.1)', color: '#999' }}>Cancelled</span>;
        if (b.status === 'REJECTED') return <span className="status-badge status-rejected">Rejected</span>;
        
        if (now >= start && now < end) return <span className="status-badge status-occupied">Active</span>;
        if (now >= end) return <span className="status-badge" style={{ background: 'rgba(0,0,0,0.05)', color: '#666' }}>Completed</span>;
        return <span className="status-badge" style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)' }}>Confirmed</span>;
    };

    // Filter Logic for Bookings
    const filterBookingList = (list) => {
        return list.filter(b => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term || 
                (b.resource_name && b.resource_name.toLowerCase().includes(term)) ||
                (b.purpose && b.purpose.toLowerCase().includes(term)) ||
                (b.subject && b.subject.toLowerCase().includes(term)) ||
                (b.teacher && b.teacher.toLowerCase().includes(term)) ||
                (b.requester && b.requester.toLowerCase().includes(term)) ||
                (b.status && b.status.toLowerCase().includes(term)) ||
                formatDate(b.start_time).toLowerCase().includes(term);

            const matchesStatus = statusFilter === 'ALL' || 
                (statusFilter === 'TIMETABLE' && b.status === 'TIMETABLE') ||
                (statusFilter === 'PENDING' && b.status === 'PENDING') ||
                (statusFilter === 'APPROVED' && (b.status === 'APPROVED' || b.status === 'TIMETABLE'));

            return matchesSearch && matchesStatus;
        });
    };

    const myBookingsFiltered = filterBookingList(bookings.filter(b => b.is_mine));
    const otherBookingsFiltered = filterBookingList(bookings.filter(b => !b.is_mine && b.status !== 'CANCELLED' && b.status !== 'REJECTED' && new Date() < new Date(b.end_time)));

    const nextEmptyNote = getNextEmptyNote();
    const isAdmin = user?.role === 'admin';

    // Derive deduplicated weekly timetable from TIMETABLE bookings
    const timetableBookings = bookings.filter(b => b.status === 'TIMETABLE');
    const hasTimetable = timetableBookings.length > 0;

    const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const getTimetableEntries = () => {
        const seen = new Set();
        const entries = [];
        timetableBookings.forEach(b => {
            const start = new Date(b.start_time);
            const dayName = start.toLocaleDateString('en-US', { weekday: 'long' });
            const startTimeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const key = `${dayName}-${startTimeStr}-${endTimeStr}-${b.resource_name}-${b.subject || b.purpose}`;
            if (!seen.has(key)) {
                seen.add(key);
                entries.push({
                    day: dayName,
                    time: `${startTimeStr} - ${endTimeStr}`,
                    room: b.resource_name,
                    subject: b.subject || b.purpose || '-',
                    teacher: b.teacher || '-',
                    semester: b.semester || '-'
                });
            }
        });
        // Sort by day order, then by time
        entries.sort((a, b) => {
            const dayDiff = DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return a.time.localeCompare(b.time);
        });
        return entries;
    };

    const timetableEntries = getTimetableEntries();
    // Group by day for display
    const timetableByDay = DAYS_ORDER.reduce((acc, day) => {
        const dayEntries = timetableEntries.filter(e => e.day === day);
        if (dayEntries.length > 0) acc[day] = dayEntries;
        return acc;
    }, {});

    return (
        <>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Room Bookings</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage reservations, upload timetables, and view complete schedules</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {hasTimetable && (
                        <button 
                            className="cta-btn" 
                            onClick={() => setShowTimetableView(true)}
                            style={{ background: '#0891b2', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <span className="material-icons" style={{ fontSize: '18px' }}>calendar_month</span> View Timetable
                        </button>
                    )}
                    {isAdmin && (
                        <button 
                            className="cta-btn" 
                            onClick={handleOpenUploadModal}
                            style={{ background: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <span className="material-icons" style={{ fontSize: '18px' }}>upload_file</span> Upload Timetable
                        </button>
                    )}
                    <button className="cta-btn" onClick={handleOpenModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>add</span> New Booking
                    </button>
                </div>
            </header>

            {/* Search & Filter Bar */}
            <div className="controls-bar" style={{ marginTop: '20px', marginBottom: '25px' }}>
                <div className="search-box">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        placeholder="Filter bookings by room, subject, timing, teacher, or user..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    {['ALL', 'TIMETABLE', 'PENDING', 'APPROVED'].map(type => (
                        <button 
                            key={type}
                            className={`filter-btn ${statusFilter === type ? 'active' : ''}`}
                            onClick={() => setStatusFilter(type)}
                        >
                            {type === 'ALL' ? 'All Bookings' : type === 'TIMETABLE' ? 'Timetable Classes' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Collapsible Accordion 1: My Current Bookings (CLOSED by default) */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div 
                    onClick={() => setShowMyBookings(!showMyBookings)} 
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>My Current Bookings</h3>
                        <span style={{ 
                            background: 'var(--primary)', 
                            color: '#fff', 
                            borderRadius: '12px', 
                            padding: '2px 10px', 
                            fontSize: '0.8rem', 
                            fontWeight: 600 
                        }}>
                            {myBookingsFiltered.length}
                        </span>
                    </div>
                    <button className="filter-btn" style={{ padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {showMyBookings ? 'Hide List' : 'Show List'}
                    </button>
                </div>

                {showMyBookings && (
                    <div style={{ marginTop: '15px' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Resource</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Purpose / Details</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myBookingsFiltered.map(b => {
                                    const canCancel = (b.status === 'PENDING' || b.status === 'APPROVED');
                                    const ongoing = isOngoing(b);

                                    return (
                                        <tr key={b.id}>
                                            <td>{b.resource_name}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.start_time)}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.end_time)}</td>
                                            <td>
                                                <div>{b.purpose || b.subject}</div>
                                                {b.cancel_reason && (
                                                    <small style={{ color: '#dc2626', display: 'block' }}>Reason: "{b.cancel_reason}"</small>
                                                )}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{getStatusBadge(b)}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {ongoing ? (
                                                    <button 
                                                        className="cta-btn" 
                                                        style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#10b981' }} 
                                                        onClick={() => handleFinishEarly(b.id)}
                                                    >
                                                        Finish Early
                                                    </button>
                                                ) : canCancel ? (
                                                    <button className="cancel-btn" onClick={() => handleInitiateCancel(b)}>
                                                        Cancel Request
                                                    </button>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {myBookingsFiltered.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No matching bookings found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Collapsible Accordion 2: Other Resource Schedules (CLOSED by default) */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div 
                    onClick={() => setShowOtherBookings(!showOtherBookings)} 
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>Other Resource Schedules & Timetables</h3>
                        <span style={{ 
                            background: 'var(--text-muted)', 
                            color: '#fff', 
                            borderRadius: '12px', 
                            padding: '2px 10px', 
                            fontSize: '0.8rem', 
                            fontWeight: 600 
                        }}>
                            {otherBookingsFiltered.length}
                        </span>
                    </div>
                    <button className="filter-btn" style={{ padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {showOtherBookings ? 'Hide List' : 'Show List'}
                    </button>
                </div>

                {showOtherBookings && (
                    <div style={{ marginTop: '15px' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Resource</th>
                                    <th>User / Faculty</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Purpose / Subject</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {otherBookingsFiltered.map(b => (
                                    <tr key={b.id}>
                                        <td>{b.resource_name}</td>
                                        <td>{b.requester || b.teacher || 'Timetable'}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.start_time)}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.end_time)}</td>
                                        <td>{b.purpose || b.subject}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{getStatusBadge(b)}</td>
                                    </tr>
                                ))}
                                {otherBookingsFiltered.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No matching resource schedules found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Cancel Request Reason Modal */}
            {cancelModalBooking && (
                <div className="modal-overlay" onClick={() => setCancelModalBooking(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <span className="close-modal" onClick={() => setCancelModalBooking(null)}>&times;</span>
                        <h3>Request Booking Cancellation</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '15px' }}>
                            Resource: <strong>{cancelModalBooking.resource_name}</strong> | Time: <strong>{formatDate(cancelModalBooking.start_time)}</strong>
                        </p>
                        <form onSubmit={handleConfirmCancelRequest}>
                            <div className="form-group">
                                <label>Reason for Cancellation (Optional)</label>
                                <textarea 
                                    rows="3"
                                    placeholder="e.g., Lecture postponed, class finished ahead of schedule..."
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: '0.9rem'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="filter-btn" onClick={() => setCancelModalBooking(null)}>
                                    Keep Booking
                                </button>
                                <button type="submit" className="cancel-btn">
                                    Send Cancellation Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Upload Timetable Modal (for header button fast access) */}
            {showUploadModal && isAdmin && (
                <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <span className="close-modal" onClick={() => setShowUploadModal(false)}>&times;</span>
                        <h3>Quick Upload Semester Timetable</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '15px' }}>
                            Upload an Excel sheet (.xlsx, .csv) to auto-book classrooms for the entire semester.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                            <button 
                                type="button" className="filter-btn" onClick={handleDownloadSample}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                                <span className="material-icons" style={{ fontSize: '18px' }}>download</span> Download Sample Template
                            </button>
                        </div>

                        {uploadError && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem',
                                backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5'
                            }}>
                                {uploadError}
                            </div>
                        )}

                        {uploadResult && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem',
                                backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0'
                            }}>
                                <strong>{uploadResult.message}</strong>
                                <ul style={{ marginTop: '8px', marginLeft: '20px', fontSize: '0.85rem' }}>
                                    <li>Timetable Entries Parsed: {uploadResult.timetableEntriesParsed}</li>
                                    <li>Automatic Classroom Bookings Created: {uploadResult.bookingsCreated}</li>
                                    {uploadResult.conflictsSkipped > 0 && <li>Conflicts Skipped: {uploadResult.conflictsSkipped}</li>}
                                </ul>
                            </div>
                        )}

                        <form onSubmit={(e) => { handleUploadSubmit(e); }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Semester Name</label>
                                    <input type="text" placeholder="e.g. Sem 5" value={semester} onChange={e => setSemester(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input type="date" value={semStartDate} onChange={e => setSemStartDate(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input type="date" value={semEndDate} onChange={e => setSemEndDate(e.target.value)} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Select Timetable File (.xlsx, .xls, .csv)</label>
                                <input 
                                    type="file" accept=".xlsx, .xls, .csv" onChange={e => setTtFile(e.target.files[0])} required
                                    style={{ padding: '10px', border: '2px dashed var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                            <button type="submit" className="cta-btn" disabled={uploading} style={{ width: '100%', justifyContent: 'center' }}>
                                {uploading ? 'Processing Timetable...' : 'Upload & Auto-Book Classrooms'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Reserve Resource Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
                        <h3>Reserve Resource</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '15px' }}>
                            <strong>Regular Hours:</strong> 09:00 AM - 04:30 PM | <strong>Custom Hours:</strong> 08:30 AM - 06:00 PM
                        </p>

                        {bookingError && (
                            <div style={{
                                padding: '10px 14px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem',
                                backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5'
                            }}>
                                {bookingError}
                            </div>
                        )}

                        <form onSubmit={handleBookingSubmit}>
                            <div className="form-group">
                                <label>Select Resource</label>
                                <select value={resourceId} onChange={e => setResourceId(e.target.value)} required>
                                    {resources.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Booking Date</label>
                                <input type="date" min={getMinDate()} value={bookingDate} onChange={e => setBookingDate(e.target.value)} required />
                            </div>

                            {bookingDate && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem',
                                    backgroundColor: nextEmptyNote.type === 'success' ? '#ecfdf5' : '#eff6ff',
                                    color: nextEmptyNote.type === 'success' ? '#065f46' : '#1e40af',
                                    border: `1px solid ${nextEmptyNote.type === 'success' ? '#a7f3d0' : '#bfdbfe'}`
                                }}>
                                    {nextEmptyNote.text}
                                </div>
                            )}

                            {/* Timing Mode Selection */}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                marginBottom: '14px',
                                padding: '10px 14px',
                                backgroundColor: 'var(--bg-app)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                    Timing Mode:
                                </span>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isCustomTime} 
                                        onChange={e => setIsCustomTime(e.target.checked)} 
                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                    Customized Time (After College Hours)
                                </label>
                            </div>

                            {isCustomTime ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>Custom Start Time</label>
                                        <input 
                                            type="time" 
                                            value={startTime} 
                                            onChange={e => setStartTime(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Custom End Time</label>
                                        <input 
                                            type="time" 
                                            value={endTime} 
                                            onChange={e => setEndTime(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>Available Start Time</label>
                                        <select value={startTime} onChange={e => setStartTime(e.target.value)} required>
                                            {availableStartSlots.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                            {availableStartSlots.length === 0 && (
                                                <option value="" disabled>No available start slots on this date</option>
                                            )}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Available End Time</label>
                                        <select value={endTime} onChange={e => setEndTime(e.target.value)} required>
                                            {availableEndSlots.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                            {availableEndSlots.length === 0 && (
                                                <option value="" disabled>No valid end slots available</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Purpose / Event</label>
                                <input type="text" placeholder="e.g., Guest Lecture, Club Meeting, Evening Workshop" value={purpose} onChange={e => setPurpose(e.target.value)} required />
                            </div>

                            <button type="submit" className="cta-btn" disabled={!isCustomTime && availableStartSlots.length === 0} style={{ width: '100%', justifyContent: 'center' }}>
                                Confirm Reservation
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Current Timetable Modal */}
            {showTimetableView && (
                <div className="modal-overlay" onClick={() => setShowTimetableView(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', maxHeight: '85vh', overflow: 'auto' }}>
                        <span className="close-modal" onClick={() => setShowTimetableView(false)}>&times;</span>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-icons" style={{ color: '#0891b2' }}>calendar_month</span>
                            Current Semester Timetable
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>
                            {timetableEntries.length} unique class slots across {Object.keys(timetableByDay).length} days
                            {timetableEntries[0]?.semester && timetableEntries[0].semester !== '-' && (
                                <> &bull; Semester: <strong>{timetableEntries[0].semester}</strong></>
                            )}
                        </p>

                        {Object.keys(timetableByDay).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                <span className="material-icons" style={{ fontSize: '48px', opacity: 0.4 }}>event_busy</span>
                                <p>No timetable has been uploaded yet.</p>
                            </div>
                        ) : (
                            Object.entries(timetableByDay).map(([day, entries]) => (
                                <div key={day} style={{ marginBottom: '20px' }}>
                                    <h4 style={{ 
                                        margin: '0 0 10px 0', 
                                        padding: '8px 14px', 
                                        background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.08), rgba(99, 102, 241, 0.08))',
                                        borderRadius: '8px',
                                        color: '#0891b2',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span className="material-icons" style={{ fontSize: '18px' }}>today</span>
                                        {day}
                                        <span style={{ 
                                            background: '#0891b2', color: '#fff', borderRadius: '10px', 
                                            padding: '1px 8px', fontSize: '0.75rem', fontWeight: 500 
                                        }}>
                                            {entries.length} {entries.length === 1 ? 'class' : 'classes'}
                                        </span>
                                    </h4>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Room</th>
                                                <th>Subject</th>
                                                <th>Teacher</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entries.map((e, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{e.time}</td>
                                                    <td>
                                                        <span style={{ 
                                                            background: 'rgba(99, 102, 241, 0.1)', 
                                                            color: '#4f46e5', 
                                                            padding: '2px 8px', 
                                                            borderRadius: '6px', 
                                                            fontSize: '0.85rem',
                                                            fontWeight: 500
                                                        }}>
                                                            {e.room}
                                                        </span>
                                                    </td>
                                                    <td>{e.subject}</td>
                                                    <td style={{ color: 'var(--text-muted)' }}>{e.teacher}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Bookings;
