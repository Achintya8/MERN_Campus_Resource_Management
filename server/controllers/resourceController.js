const Resource = require('../models/Resource');
const Booking = require('../models/Booking');

const getResources = async (req, res) => {
    try {
        const resources = await Resource.find().sort({ name: 1 });
        const now = new Date();

        // Find any active bookings right now
        const activeBookings = await Booking.find({
            status: { $in: ['APPROVED', 'BLOCKED', 'TIMETABLE'] },
            start_time: { $lte: now },
            end_time: { $gt: now }
        });

        const activeMap = new Map();
        for (const b of activeBookings) {
            activeMap.set(b.resource.toString(), b);
        }

        const formatted = resources.map(r => {
            const rId = r._id.toString();
            const active = activeMap.get(rId);

            return {
                id: rId,
                _id: rId,
                name: r.name,
                type: r.type,
                capacity: r.capacity,
                features: r.features,
                created_at: r.created_at,
                occupied: Boolean(active),
                current_purpose: active ? active.purpose : null,
                current_semester: active ? active.semester : null,
                current_subject: active ? active.subject : null,
                current_status: active ? active.status : null,
                occupied_until: active ? active.end_time : null
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error('getResources error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getAvailability = async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const resources = await Resource.find().sort({ name: 1 });

        const bookings = await Booking.find({
            start_time: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['APPROVED', 'BLOCKED', 'TIMETABLE'] }
        })
        .populate('user', 'username')
        .sort({ start_time: 1 });

        const bookingMap = new Map();
        for (const b of bookings) {
            const resId = b.resource.toString();
            if (!bookingMap.has(resId)) {
                bookingMap.set(resId, []);
            }
            bookingMap.get(resId).push({
                id: b._id.toString(),
                start_time: b.start_time,
                end_time: b.end_time,
                semester: b.semester,
                subject: b.subject,
                status: b.status,
                username: b.user ? b.user.username : 'Unknown'
            });
        }

        const result = resources.map(r => ({
            id: r._id.toString(),
            name: r.name,
            type: r.type,
            bookings: bookingMap.get(r._id.toString()) || []
        }));

        res.json(result);
    } catch (err) {
        console.error('getAvailability error:', err);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
};

module.exports = { getResources, getAvailability };
