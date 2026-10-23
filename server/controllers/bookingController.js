const Booking = require('../models/Booking');
const Resource = require('../models/Resource');

const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('resource', 'name type capacity features')
            .populate('user', 'username full_name')
            .sort({ start_time: -1 });

        const formatted = bookings.map(b => {
            const bObj = b.toJSON();
            const isMine = req.user && b.user && b.user._id.toString() === req.user.id;

            return {
                ...bObj,
                id: b._id.toString(),
                resource_name: b.resource ? b.resource.name : 'Unknown',
                resource_type: b.resource ? b.resource.type : 'Unknown',
                requester: b.user ? b.user.username : 'Unknown',
                is_mine: isMine
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error('getBookings error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const createBooking = async (req, res) => {
    const { resource_id, start_time, end_time, purpose, semester, subject } = req.body;

    if (!resource_id || !start_time || !end_time) {
        return res.status(400).json({ error: 'Missing required booking fields' });
    }

    try {
        const start = new Date(start_time);
        const end = new Date(end_time);
        const now = new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid date/time format' });
        }

        // Prevent booking for past date/time
        if (start < now) {
            return res.status(400).json({ error: 'Cannot book for a past date or time.' });
        }

        const startH = start.getHours() + start.getMinutes() / 60;
        const endH = end.getHours() + end.getMinutes() / 60;

        // Allowed Timings: 8:30 AM (8.5) to 6:00 PM (18.0)
        if (startH < 8.5 || endH > 18.001 || (startH >= endH)) {
            return res.status(400).json({ 
                error: 'Booking must be within allowed hours (8:30 AM to 6:00 PM), and end time must be after start time.' 
            });
        }

        // Check for conflicts: overlap exists if existing.start_time < new.end_time AND existing.end_time > new.start_time
        const conflict = await Booking.findOne({
            resource: resource_id,
            status: { $in: ['APPROVED', 'PENDING', 'BLOCKED', 'TIMETABLE'] },
            start_time: { $lt: end },
            end_time: { $gt: start }
        }).populate('user', 'username');

        if (conflict) {
            const cStart = new Date(conflict.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const cEnd = new Date(conflict.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const cName = conflict.purpose || conflict.subject || 'Class / Meeting';
            return res.status(409).json({ 
                error: `Cannot book room: It is already occupied from ${cStart} to ${cEnd} for '${cName}'. Please choose a time slot that does not overlap.` 
            });
        }

        const newBooking = await Booking.create({
            resource: resource_id,
            user: req.user.id,
            start_time: start,
            end_time: end,
            purpose: purpose || '',
            semester: semester || '',
            subject: subject || '',
            status: 'PENDING'
        });

        const populated = await Booking.findById(newBooking._id)
            .populate('resource', 'name type')
            .populate('user', 'username');

        const resultObj = populated.toJSON();
        resultObj.id = populated._id.toString();
        resultObj.resource_name = populated.resource ? populated.resource.name : '';
        resultObj.resource_type = populated.resource ? populated.resource.type : '';
        resultObj.requester = populated.user ? populated.user.username : '';

        res.status(201).json(resultObj);
    } catch (err) {
        console.error("Booking error details:", err);
        res.status(500).json({ error: err.message || 'Booking creation failed' });
    }
};

const cancelBooking = async (req, res) => {
    const { id } = req.params;
    const { reason, action } = req.body;
    try {
        const targetBooking = await Booking.findById(id);

        if (!targetBooking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (targetBooking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to cancel this booking' });
        }

        const now = new Date();
        const start = new Date(targetBooking.start_time);
        const end = new Date(targetBooking.end_time);

        // If action is "FINISH_EARLY" or meeting is currently ongoing (now >= start and now < end)
        if (action === 'FINISH_EARLY' || (now >= start && now < end)) {
            targetBooking.end_time = now;
            targetBooking.status = 'CANCELLED';
            targetBooking.cancel_reason = reason || 'Finished meeting early';
            await targetBooking.save();

            const resultObj = targetBooking.toJSON();
            resultObj.id = targetBooking._id.toString();
            return res.json({ message: 'Meeting finished early. Room is now available!', booking: resultObj });
        }

        // Standard Cancellation Request
        targetBooking.status = 'CANCEL_REQUESTED';
        targetBooking.cancel_reason = reason || '';
        await targetBooking.save();

        const resultObj = targetBooking.toJSON();
        resultObj.id = targetBooking._id.toString();
        res.json(resultObj);
    } catch (err) {
        console.error('cancelBooking error:', err);
        res.status(500).json({ error: 'Failed to process cancellation' });
    }
};

const deleteBooking = async (req, res) => {
    const { id } = req.params;
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin permission required to delete bookings.' });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        booking.status = 'CANCELLED';
        await booking.save();

        res.json({ message: 'Booking deleted/cancelled successfully by admin.' });
    } catch (err) {
        console.error('deleteBooking error:', err);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
};

const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['APPROVED', 'REJECTED', 'CANCEL_APPROVED', 'CANCEL_REJECTED'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (status === 'CANCEL_APPROVED') {
            booking.status = 'CANCELLED';
            await booking.save();
            const resObj = booking.toJSON();
            resObj.id = booking._id.toString();
            return res.json({ message: 'Booking cancelled successfully', cancelled: resObj });
        }

        const finalStatus = status === 'CANCEL_REJECTED' ? 'APPROVED' : status;
        booking.status = finalStatus;
        await booking.save();

        const resObj = booking.toJSON();
        resObj.id = booking._id.toString();
        res.json(resObj);
    } catch (err) {
        console.error('updateBookingStatus error:', err);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
};

module.exports = { getBookings, createBooking, cancelBooking, deleteBooking, updateBookingStatus };
