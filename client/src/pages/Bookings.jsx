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

    // Timetables Management state
    const [insertedTimetables, setInsertedTimetables] = useState([]);
    const [showManageTimetablesModal, setShowManageTimetablesModal] = useState(false);
    const [deletingTimetable, setDeletingTimetable] = useState(false);

    // Bookings View Category ('ALL', 'MANUAL', 'TIMETABLE')
    const [bookingCategoryFilter, setBookingCategoryFilter] = useState('ALL');
    const [timetableSemesterFilter, setTimetableSemesterFilter] = useState('ALL');
    const [viewTimetableSemester, setViewTimetableSemester] = useState('ALL');

    // Section Accordions state (expanded by default)
    const [showManualBookings, setShowManualBookings] = useState(true);
    const [showAutoBookings, setShowAutoBookings] = useState(true);

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

    const fetchTimetables = async () => {
        try {
            const res = await api.get('/admin/timetables');
            setInsertedTimetables(res.data.timetables || []);
        } catch (err) {
            console.error("Error fetching timetables", err);
        }
    };

    useEffect(() => {
        fetchBookings();
        fetchTimetables();

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

    // Admin Status Update (Approve / Reject)
    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/bookings/${id}/status`, { status });
            alert(`Booking ${status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : status} successfully!`);
            fetchBookings();
        } catch (err) {
            console.error('Status update failed:', err);
            alert(err.response?.data?.error || 'Action failed');
        }
    };

    // Timetable Upload Handlers
    const handleDownloadSample = (format = 'xlsx') => {
        const fileName = format === 'xlsx' ? 'Sample_MCA_Timetable.xlsx' : 'Sample_MCA_Timetable.csv';
        const link = document.createElement('a');
        link.setAttribute('href', `/${fileName}`);
        link.setAttribute('download', fileName);
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
            fetchTimetables();
        } catch (err) {
            setUploadError(err.response?.data?.error || 'Failed to upload timetable');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteTimetableSemester = async (semName, count) => {
        if (!confirm(`Are you sure you want to delete the timetable for '${semName}'?\n\nThis will permanently delete all weekly schedule slots for this semester AND remove all ${count ? count + ' ' : ''}auto-generated calendar bookings.`)) {
            return;
        }

        setDeletingTimetable(true);
        try {
            const res = await api.delete(`/admin/timetable/semester/${encodeURIComponent(semName)}`);
            alert(res.data.message || `Timetable for ${semName} deleted.`);
            await fetchTimetables();
            await fetchBookings();
        } catch (err) {
            console.error('Failed to delete timetable', err);
            alert(err.response?.data?.error || 'Failed to delete timetable');
        } finally {
            setDeletingTimetable(false);
        }
    };

    const handleDeleteAllTimetables = async () => {
        if (!confirm('DANGER: Are you sure you want to delete ALL inserted timetables?\n\nThis will permanently wipe all uploaded semester timetables and remove ALL auto-generated class bookings.')) {
            return;
        }

        setDeletingTimetable(true);
        try {
            const res = await api.delete('/admin/timetable/all');
            alert(res.data.message || 'All timetables deleted.');
            await fetchTimetables();
            await fetchBookings();
        } catch (err) {
            console.error('Failed to delete all timetables', err);
            alert(err.response?.data?.error || 'Failed to delete all timetables');
        } finally {
            setDeletingTimetable(false);
        }
    };

    const handleDeleteBooking = async (id, name) => {
        if (!confirm(`Are you sure you want to delete/cancel this booking for ${name || 'room'}?`)) return;
        try {
            await api.delete(`/bookings/${id}`);
            alert('Booking deleted/cancelled.');
            fetchBookings();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete booking.');
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

    // Requirement 1: Partition bookings into Manual Entries vs Automatic Timetable Bookings
    const manualBookings = bookings.filter(b => b.status !== 'TIMETABLE');
    const autoTimetableBookings = bookings.filter(b => b.status === 'TIMETABLE');

    const manualBookingsFiltered = filterBookingList(manualBookings);
    const autoTimetableBookingsFiltered = filterBookingList(
        autoTimetableBookings.filter(b => timetableSemesterFilter === 'ALL' || b.semester === timetableSemesterFilter)
    );

    const pendingManualCount = manualBookings.filter(b => b.status === 'PENDING').length;

    const availableSemesters = Array.from(new Set([
        ...insertedTimetables.map(t => t.semester),
        ...autoTimetableBookings.map(b => b.semester).filter(Boolean)
    ]));

    const nextEmptyNote = getNextEmptyNote();
    const isAdmin = user?.role === 'admin';

    // Derive deduplicated weekly timetable from TIMETABLE bookings
    const timetableBookings = bookings.filter(b => b.status === 'TIMETABLE');
    const hasTimetable = timetableBookings.length > 0 || insertedTimetables.length > 0;

    const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const getTimetableEntries = (semFilter = 'ALL') => {
        const seen = new Set();
        const entries = [];
        const sourceBookings = semFilter === 'ALL'
            ? timetableBookings
            : timetableBookings.filter(b => b.semester === semFilter);

        sourceBookings.forEach(b => {
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

    const timetableEntries = getTimetableEntries(viewTimetableSemester);
    // Group by day for display
    const timetableByDay = DAYS_ORDER.reduce((acc, day) => {
        const dayEntries = timetableEntries.filter(e => e.day === day);
        if (dayEntries.length > 0) acc[day] = dayEntries;
        return acc;
    }, {});

    return (
        <>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2>Room Bookings</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage manual room reservations, semester timetables, and automated classroom bookings</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                        <>
                            <button 
                                className="cta-btn" 
                                onClick={handleOpenUploadModal}
                                style={{ background: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <span className="material-icons" style={{ fontSize: '18px' }}>upload_file</span> Upload Timetable
                            </button>
                            <button 
                                className="filter-btn" 
                                onClick={() => setShowManageTimetablesModal(true)}
                                style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                            >
                                <span className="material-icons" style={{ fontSize: '18px' }}>delete_sweep</span> Delete / Manage Timetables ({insertedTimetables.length})
                            </button>
                        </>
                    )}
                    <button className="cta-btn" onClick={handleOpenModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>add</span> New Booking
                    </button>
                </div>
            </header>

            {/* Search & Category Filter Bar */}
            <div className="controls-bar" style={{ marginTop: '20px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                    <div className="search-box" style={{ flex: '1', minWidth: '280px' }}>
                        <span className="material-icons">search</span>
                        <input 
                            type="text" 
                            placeholder="Filter bookings by room, subject, timing, teacher, or user..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* View Category Tabs */}
                    <div className="filter-group">
                        {[
                            { id: 'ALL', label: `All Bookings (${bookings.length})` },
                            { id: 'MANUAL', label: `📝 Manual Bookings (${manualBookings.length})`, badge: pendingManualCount > 0 ? pendingManualCount : null },
                            { id: 'TIMETABLE', label: `🗓️ Auto Timetable (${autoTimetableBookings.length})` }
                        ].map(btn => (
                            <button 
                                key={btn.id}
                                className={`filter-btn ${bookingCategoryFilter === btn.id ? 'active' : ''}`}
                                onClick={() => setBookingCategoryFilter(btn.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                {btn.label}
                                {btn.badge && (
                                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                                        {btn.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status Filter Tabs (applicable to manual and all) */}
                {bookingCategoryFilter !== 'TIMETABLE' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Status:</span>
                        {['ALL', 'PENDING', 'APPROVED', 'CANCEL_REQUESTED'].map(type => (
                            <button 
                                key={type}
                                className={`filter-btn ${statusFilter === type ? 'active' : ''}`}
                                onClick={() => setStatusFilter(type)}
                                style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                            >
                                {type === 'ALL' ? 'All Statuses' : type === 'PENDING' ? 'New Requests' : type === 'CANCEL_REQUESTED' ? 'Cancel Requests' : type}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 1: MANUAL ROOM BOOKINGS & RESERVATIONS */}
            {(bookingCategoryFilter === 'ALL' || bookingCategoryFilter === 'MANUAL') && (
                <div className="card" style={{ marginBottom: '25px' }}>
                    <div 
                        onClick={() => setShowManualBookings(!showManualBookings)} 
                        style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span className="material-icons" style={{ color: 'var(--primary)', fontSize: '24px' }}>edit_calendar</span>
                            <h3 style={{ margin: 0 }}>1. Manual Room Bookings & Reservations</h3>
                            <span style={{ 
                                background: 'var(--primary)', 
                                color: '#fff', 
                                borderRadius: '12px', 
                                padding: '2px 10px', 
                                fontSize: '0.8rem', 
                                fontWeight: 600 
                            }}>
                                {manualBookingsFiltered.length} entries
                            </span>
                            {pendingManualCount > 0 && (
                                <span style={{ 
                                    background: '#ef4444', 
                                    color: '#fff', 
                                    borderRadius: '12px', 
                                    padding: '2px 10px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600 
                                }}>
                                    {pendingManualCount} Pending Approval
                                </span>
                            )}
                        </div>
                        <button className="filter-btn" style={{ padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {showManualBookings ? 'Hide List' : 'Show List'}
                        </button>
                    </div>

                    {showManualBookings && (
                        <div style={{ marginTop: '15px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                Individual room reservations created manually by faculty, students, or administrators.
                            </p>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Resource</th>
                                        <th>Requester</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Purpose / Event</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {manualBookingsFiltered.map(b => {
                                        const canCancel = (b.status === 'PENDING' || b.status === 'APPROVED');
                                        const ongoing = isOngoing(b);

                                        return (
                                            <tr key={b.id}>
                                                <td>
                                                    <strong>{b.resource_name}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.resource_type}</div>
                                                </td>
                                                <td>
                                                    <span>{b.requester}</span>
                                                    {b.is_mine && (
                                                        <span style={{ marginLeft: '6px', background: 'rgba(0,102,255,0.1)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                            You
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.start_time)}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.end_time)}</td>
                                                <td>
                                                    <div>{b.purpose || b.subject}</div>
                                                    {b.cancel_reason && (
                                                        <small style={{ color: '#dc2626', display: 'block', marginTop: '2px' }}>Reason: "{b.cancel_reason}"</small>
                                                    )}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{getStatusBadge(b)}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {ongoing ? (
                                                        <button 
                                                            className="cta-btn" 
                                                            style={{ padding: '5px 12px', fontSize: '0.8rem', background: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                                            onClick={() => handleFinishEarly(b.id)}
                                                        >
                                                            <span className="material-icons" style={{ fontSize: '16px' }}>check_circle</span> Finish Early
                                                        </button>
                                                    ) : (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                            {isAdmin && b.status === 'PENDING' && (
                                                                <>
                                                                    <button 
                                                                        className="cta-btn" 
                                                                        style={{ padding: '5px 12px', fontSize: '0.8rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                                                        onClick={() => handleStatusUpdate(b.id, 'APPROVED')}
                                                                    >
                                                                        <span className="material-icons" style={{ fontSize: '16px' }}>check</span> Approve
                                                                    </button>
                                                                    <button 
                                                                        className="cancel-btn" 
                                                                        style={{ padding: '5px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                                                                        onClick={() => handleStatusUpdate(b.id, 'REJECTED')}
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}

                                                            {isAdmin && b.status === 'CANCEL_REQUESTED' && (
                                                                <>
                                                                    <button 
                                                                        className="cta-btn" 
                                                                        style={{ padding: '5px 12px', fontSize: '0.8rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                                                        onClick={() => handleStatusUpdate(b.id, 'CANCEL_APPROVED')}
                                                                    >
                                                                        Approve Cancel
                                                                    </button>
                                                                    <button 
                                                                        className="filter-btn" 
                                                                        style={{ padding: '5px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                                                                        onClick={() => handleStatusUpdate(b.id, 'CANCEL_REJECTED')}
                                                                    >
                                                                        Keep Booking
                                                                    </button>
                                                                </>
                                                            )}

                                                            {canCancel && (
                                                                <button 
                                                                    className="cancel-btn" 
                                                                    style={{ 
                                                                        padding: '5px 12px', 
                                                                        fontSize: '0.8rem',
                                                                        background: (isAdmin && b.status === 'PENDING') ? '#f3f4f6' : undefined,
                                                                        color: (isAdmin && b.status === 'PENDING') ? '#4b5563' : undefined,
                                                                        border: (isAdmin && b.status === 'PENDING') ? '1px solid #d1d5db' : undefined
                                                                    }}
                                                                    onClick={() => handleInitiateCancel(b)}
                                                                >
                                                                    Cancel Request
                                                                </button>
                                                            )}

                                                            {isAdmin && b.status === 'APPROVED' && (
                                                                <button 
                                                                    className="cancel-btn" 
                                                                    style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                                                                    onClick={() => handleDeleteBooking(b.id, b.resource_name)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}

                                                            {!ongoing && !canCancel && (!isAdmin || (b.status !== 'PENDING' && b.status !== 'CANCEL_REQUESTED')) && (
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {manualBookingsFiltered.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                                                No manual room bookings found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 2: AUTOMATIC TIMETABLE BOOKINGS */}
            {(bookingCategoryFilter === 'ALL' || bookingCategoryFilter === 'TIMETABLE') && (
                <div className="card" style={{ marginBottom: '25px' }}>
                    <div 
                        onClick={() => setShowAutoBookings(!showAutoBookings)} 
                        style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span className="material-icons" style={{ color: '#4f46e5', fontSize: '24px' }}>auto_stories</span>
                            <h3 style={{ margin: 0 }}>2. Automatic Timetable Bookings (Semester Classes)</h3>
                            <span style={{ 
                                background: '#4f46e5', 
                                color: '#fff', 
                                borderRadius: '12px', 
                                padding: '2px 10px', 
                                fontSize: '0.8rem', 
                                fontWeight: 600 
                            }}>
                                {autoTimetableBookingsFiltered.length} class sessions
                            </span>
                            {insertedTimetables.length > 0 && (
                                <span style={{ 
                                    background: 'rgba(99, 102, 241, 0.1)', 
                                    color: '#4f46e5', 
                                    borderRadius: '12px', 
                                    padding: '2px 10px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    border: '1px solid rgba(99, 102, 241, 0.2)' 
                                }}>
                                    {insertedTimetables.length} Timetable{insertedTimetables.length > 1 ? 's' : ''} Inserted
                                </span>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                            {availableSemesters.length > 1 && (
                                <select 
                                    value={timetableSemesterFilter} 
                                    onChange={e => setTimetableSemesterFilter(e.target.value)}
                                    style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff' }}
                                >
                                    <option value="ALL">All Semesters ({autoTimetableBookings.length})</option>
                                    {availableSemesters.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            )}

                            {isAdmin && (
                                <button 
                                    className="filter-btn" 
                                    onClick={() => setShowManageTimetablesModal(true)}
                                    style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                >
                                    <span className="material-icons" style={{ fontSize: '16px' }}>delete_sweep</span> Delete / Manage Timetables
                                </button>
                            )}

                            <button 
                                className="filter-btn" 
                                onClick={() => setShowAutoBookings(!showAutoBookings)}
                                style={{ padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                                {showAutoBookings ? 'Hide List' : 'Show List'}
                            </button>
                        </div>
                    </div>

                    {showAutoBookings && (
                        <div style={{ marginTop: '15px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                Classroom reservations automatically generated from uploaded timetable spreadsheets. To delete or replace them, use <strong>Delete / Manage Timetables</strong>.
                            </p>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Resource</th>
                                        <th>Semester</th>
                                        <th>Subject</th>
                                        <th>Faculty / Instructor</th>
                                        <th>Class Session Time</th>
                                        <th>Status</th>
                                        {isAdmin && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {autoTimetableBookingsFiltered.map(b => {
                                        const ongoing = isOngoing(b);
                                        return (
                                            <tr key={b.id}>
                                                <td>
                                                    <strong>{b.resource_name}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.resource_type}</div>
                                                </td>
                                                <td>
                                                    <span style={{ 
                                                        background: 'rgba(99, 102, 241, 0.1)', 
                                                        color: '#4f46e5', 
                                                        padding: '2px 8px', 
                                                        borderRadius: '6px', 
                                                        fontSize: '0.8rem', 
                                                        fontWeight: 600 
                                                    }}>
                                                        {b.semester || 'General'}
                                                    </span>
                                                </td>
                                                <td><strong>{b.subject || b.purpose}</strong></td>
                                                <td>{b.teacher || '—'}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {formatDate(b.start_time)} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' }}>
                                                        Timetable Class
                                                    </span>
                                                </td>
                                                {isAdmin && (
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        {ongoing ? (
                                                            <button 
                                                                className="cta-btn" 
                                                                style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                onClick={() => handleFinishEarly(b.id)}
                                                            >
                                                                <span className="material-icons" style={{ fontSize: '16px' }}>check_circle</span> Finish Early
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className="cancel-btn" 
                                                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                                                                onClick={() => handleDeleteBooking(b.id, `${b.resource_name} (${b.subject})`)}
                                                            >
                                                                Delete Session
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {autoTimetableBookingsFiltered.length === 0 && (
                                        <tr>
                                            <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                                                No automatic timetable class sessions found matching your filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

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

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '15px' }}>
                            <button 
                                type="button" 
                                className="filter-btn" 
                                onClick={() => handleDownloadSample('xlsx')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderColor: '#10b981', fontWeight: 600 }}
                            >
                                <span className="material-icons" style={{ fontSize: '18px' }}>description</span> Download Sample Excel (.xlsx)
                            </button>
                            <button 
                                type="button" 
                                className="filter-btn" 
                                onClick={() => handleDownloadSample('csv')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                                <span className="material-icons" style={{ fontSize: '18px' }}>download</span> Download CSV
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
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '85vh', overflow: 'auto' }}>
                        <span className="close-modal" onClick={() => setShowTimetableView(false)}>&times;</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <span className="material-icons" style={{ color: '#0891b2' }}>calendar_month</span>
                                Weekly Timetable Matrix
                            </h3>
                            {isAdmin && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {viewTimetableSemester !== 'ALL' && (
                                        <button 
                                            className="filter-btn"
                                            onClick={() => handleDeleteTimetableSemester(viewTimetableSemester)}
                                            disabled={deletingTimetable}
                                            style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                                        >
                                            <span className="material-icons" style={{ fontSize: '16px' }}>delete</span>
                                            Delete '{viewTimetableSemester}'
                                        </button>
                                    )}
                                    <button 
                                        className="filter-btn"
                                        onClick={() => { setShowTimetableView(false); setShowManageTimetablesModal(true); }}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                                    >
                                        <span className="material-icons" style={{ fontSize: '16px' }}>settings</span>
                                        Manage Timetables
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Semester Switcher Tabs if more than 1 semester */}
                        {availableSemesters.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', flexWrap: 'wrap', padding: '8px 12px', background: 'var(--bg-app)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Select Semester:</span>
                                {availableSemesters.length > 1 && (
                                    <button 
                                        className={`filter-btn ${viewTimetableSemester === 'ALL' ? 'active' : ''}`}
                                        onClick={() => setViewTimetableSemester('ALL')}
                                        style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                                    >
                                        All Semesters
                                    </button>
                                )}
                                {availableSemesters.map(sem => (
                                    <button 
                                        key={sem}
                                        className={`filter-btn ${viewTimetableSemester === sem ? 'active' : ''}`}
                                        onClick={() => setViewTimetableSemester(sem)}
                                        style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                                    >
                                        {sem}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>
                            {timetableEntries.length} unique class slots across {Object.keys(timetableByDay).length} days
                            {viewTimetableSemester !== 'ALL' ? (
                                <> &bull; Showing semester: <strong>{viewTimetableSemester}</strong></>
                            ) : availableSemesters.length === 1 ? (
                                <> &bull; Semester: <strong>{availableSemesters[0]}</strong></>
                            ) : null}
                        </p>

                        {Object.keys(timetableByDay).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                <span className="material-icons" style={{ fontSize: '48px', opacity: 0.4 }}>event_busy</span>
                                <p>No timetable classes found {viewTimetableSemester !== 'ALL' ? `for ${viewTimetableSemester}` : ''}.</p>
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
                                                {availableSemesters.length > 1 && <th>Semester</th>}
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
                                                    {availableSemesters.length > 1 && (
                                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{e.semester}</td>
                                                    )}
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

            {/* Manage & Delete Timetables Modal */}
            {showManageTimetablesModal && (
                <div className="modal-overlay" onClick={() => setShowManageTimetablesModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px', maxHeight: '85vh', overflow: 'auto' }}>
                        <span className="close-modal" onClick={() => setShowManageTimetablesModal(false)}>&times;</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <span className="material-icons" style={{ color: '#dc2626' }}>auto_delete</span>
                                Inserted Timetables Management
                            </h3>
                            {insertedTimetables.length > 0 && (
                                <button
                                    className="filter-btn"
                                    onClick={handleDeleteAllTimetables}
                                    disabled={deletingTimetable}
                                    style={{
                                        background: '#dc2626',
                                        color: '#ffffff',
                                        borderColor: '#b91c1c',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span className="material-icons" style={{ fontSize: '18px' }}>delete_forever</span>
                                    {deletingTimetable ? 'Deleting...' : 'Delete All Timetables'}
                                </button>
                            )}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>
                            Manage all uploaded semester timetables. Deleting a timetable permanently wipes its weekly slots and removes all auto-generated calendar bookings for that semester.
                        </p>

                        {insertedTimetables.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-app)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                                <span className="material-icons" style={{ fontSize: '48px', color: 'var(--text-muted)', opacity: 0.5 }}>calendar_today</span>
                                <h4 style={{ margin: '10px 0 5px 0' }}>No Timetables Currently Inserted</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
                                    Upload an Excel/CSV timetable to automatically schedule classroom periods.
                                </p>
                                <button 
                                    className="cta-btn" 
                                    onClick={() => { setShowManageTimetablesModal(false); handleOpenUploadModal(); }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <span className="material-icons" style={{ fontSize: '18px' }}>upload_file</span>
                                    Upload New Timetable
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    padding: '10px 14px', 
                                    background: 'rgba(99, 102, 241, 0.08)', 
                                    borderRadius: '8px', 
                                    border: '1px solid rgba(99, 102, 241, 0.2)' 
                                }}>
                                    <span style={{ fontSize: '0.9rem', color: '#4338ca', fontWeight: 600 }}>
                                        Found {insertedTimetables.length} Active Timetable{insertedTimetables.length > 1 ? 's' : ''} in System
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Total Auto-Bookings: {insertedTimetables.reduce((acc, t) => acc + (t.bookingsCount || 0), 0)}
                                    </span>
                                </div>

                                {insertedTimetables.map((t, idx) => (
                                    <div key={t.semester || idx} style={{
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '10px',
                                        padding: '16px',
                                        background: 'var(--bg-card)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                                                        {t.semester}
                                                    </h4>
                                                    <span style={{ 
                                                        background: 'rgba(99, 102, 241, 0.12)', 
                                                        color: '#4f46e5', 
                                                        borderRadius: '6px', 
                                                        padding: '2px 8px', 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: 600 
                                                    }}>
                                                        {t.slotsCount} Weekly Slots
                                                    </span>
                                                    <span style={{ 
                                                        background: 'rgba(16, 185, 129, 0.12)', 
                                                        color: '#059669', 
                                                        borderRadius: '6px', 
                                                        padding: '2px 8px', 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: 600 
                                                    }}>
                                                        {t.bookingsCount} Calendar Bookings
                                                    </span>
                                                </div>
                                                <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    First uploaded: {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <button
                                                    className="filter-btn"
                                                    onClick={() => {
                                                        setViewTimetableSemester(t.semester);
                                                        setShowManageTimetablesModal(false);
                                                        setShowTimetableView(true);
                                                    }}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                                                >
                                                    <span className="material-icons" style={{ fontSize: '16px', color: '#0891b2' }}>visibility</span>
                                                    View Weekly Matrix
                                                </button>
                                                <button
                                                    className="filter-btn"
                                                    onClick={() => handleDeleteTimetableSemester(t.semester, t.bookingsCount)}
                                                    disabled={deletingTimetable}
                                                    style={{
                                                        background: '#fee2e2',
                                                        color: '#b91c1c',
                                                        borderColor: '#fca5a5',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <span className="material-icons" style={{ fontSize: '16px' }}>delete</span>
                                                    Delete Timetable
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem', background: 'var(--bg-app)', padding: '10px 12px', borderRadius: '8px' }}>
                                            <div>
                                                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Rooms / Labs:</strong>
                                                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                    {t.resourceNames && t.resourceNames.length > 0 ? t.resourceNames.join(', ') : 'None specified'}
                                                </span>
                                            </div>
                                            <div>
                                                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Subjects:</strong>
                                                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                    {t.subjects && t.subjects.length > 0 ? t.subjects.slice(0, 5).join(', ') + (t.subjects.length > 5 ? ` +${t.subjects.length - 5} more` : '') : 'None'}
                                                </span>
                                            </div>
                                            <div>
                                                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Faculty / Teachers:</strong>
                                                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                    {t.teachers && t.teachers.length > 0 ? t.teachers.slice(0, 4).join(', ') + (t.teachers.length > 4 ? ` +${t.teachers.length - 4} more` : '') : 'None'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="filter-btn" onClick={() => setShowManageTimetablesModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Bookings;
