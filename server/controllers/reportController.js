const Booking = require('../models/Booking');
const Resource = require('../models/Resource');

const getUtilization = async (req, res) => {
    const { period } = req.query;

    if (!['week', 'month', 'year'].includes(period)) {
        return res.status(400).json({ error: 'Invalid period. Use week, month, or year.' });
    }

    try {
        const now = new Date();
        let startDate = new Date();

        if (period === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        } else if (period === 'year') {
            startDate.setFullYear(now.getFullYear() - 1);
        }

        const resources = await Resource.find().sort({ name: 1 });

        const bookings = await Booking.find({
            status: 'APPROVED',
            start_time: { $gte: startDate }
        });

        const reportMap = new Map();
        for (const r of resources) {
            reportMap.set(r._id.toString(), {
                name: r.name,
                type: r.type,
                booking_count: 0,
                total_hours: 0
            });
        }

        for (const b of bookings) {
            const resId = b.resource.toString();
            if (reportMap.has(resId)) {
                const entry = reportMap.get(resId);
                entry.booking_count += 1;
                const hours = Math.max(0, (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / (1000 * 3600));
                entry.total_hours += hours;
            }
        }

        const result = Array.from(reportMap.values())
            .map(item => ({
                name: item.name,
                type: item.type,
                booking_count: item.booking_count,
                total_hours: Number(item.total_hours.toFixed(2))
            }))
            .sort((a, b) => b.total_hours - a.total_hours);

        res.json(result);
    } catch (err) {
        console.error('getUtilization error:', err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

module.exports = { getUtilization };
