const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const xlsx = require('xlsx');

// Helper to parse time strings like "09:00 AM", "9:00", "14:30" to { hours, minutes }
const parseTimeString = (timeStr) => {
    if (!timeStr) return null;
    const str = String(timeStr).trim().toUpperCase();
    const isPM = str.includes('PM');
    const isAM = str.includes('AM');
    const cleanStr = str.replace(/(AM|PM)/g, '').trim();
    const parts = cleanStr.split(':');
    if (parts.length < 2) return null;
    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10) || 0;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return { hours, minutes };
};

// Helper to parse Day name to integer (Sunday = 0, Monday = 1, ... Saturday = 6)
const parseDayOfWeek = (dayStr) => {
    if (!dayStr) return null;
    const str = String(dayStr).trim().toLowerCase();
    if (str.includes('mon')) return 1;
    if (str.includes('tue')) return 2;
    if (str.includes('wed')) return 3;
    if (str.includes('thu')) return 4;
    if (str.includes('fri')) return 5;
    if (str.includes('sat')) return 6;
    if (str.includes('sun')) return 0;
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 0 && num <= 6) return num;
    return null;
};

const addTimetable = async (req, res) => {
    const { resource_id, day_of_week, start_time, end_time, semester, subject, teacher } = req.body;
    try {
        const newEntry = await Timetable.create({
            resource: resource_id,
            day_of_week,
            start_time,
            end_time,
            semester,
            subject,
            teacher: teacher || ''
        });

        const resObj = newEntry.toJSON();
        resObj.id = newEntry._id.toString();
        res.status(201).json(resObj);
    } catch (err) {
        console.error('addTimetable error:', err);
        res.status(500).json({ error: 'Failed to insert timetable entry' });
    }
};

const blockResource = async (req, res) => {
    const { resource_id, start_time, end_time, purpose } = req.body;
    try {
        const newBooking = await Booking.create({
            resource: resource_id,
            user: req.user.id,
            start_time,
            end_time,
            purpose: purpose || 'Maintenance/Blocked',
            status: 'BLOCKED'
        });

        const resObj = newBooking.toJSON();
        resObj.id = newBooking._id.toString();
        res.status(201).json(resObj);
    } catch (err) {
        console.error('blockResource error:', err);
        res.status(500).json({ error: 'Failed to block resource' });
    }
};

const syncTimetable = async (req, res) => {
    const { startDate, endDate } = req.body;
    try {
        const timetable = await Timetable.find();
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            const entries = timetable.filter(e => e.day_of_week === dayOfWeek);

            for (const entry of entries) {
                const bStart = new Date(d);
                const [sH, sM] = entry.start_time.split(':');
                bStart.setHours(parseInt(sH, 10), parseInt(sM, 10), 0, 0);

                const bEnd = new Date(d);
                const [eH, eM] = entry.end_time.split(':');
                bEnd.setHours(parseInt(eH, 10), parseInt(eM, 10), 0, 0);

                const conflict = await Booking.findOne({
                    resource: entry.resource,
                    status: { $ne: 'CANCELLED' },
                    start_time: { $lt: bEnd },
                    end_time: { $gt: bStart }
                });

                if (!conflict) {
                    await Booking.create({
                        resource: entry.resource,
                        user: req.user.id,
                        start_time: bStart,
                        end_time: bEnd,
                        purpose: `${entry.subject} (${entry.teacher || 'Class'})`,
                        semester: entry.semester,
                        subject: entry.subject,
                        teacher: entry.teacher || '',
                        status: 'TIMETABLE'
                    });
                    count++;
                }
            }
        }
        res.json({ message: `Successfully generated ${count} bookings from timetable.` });
    } catch (err) {
        console.error('syncTimetable error:', err);
        res.status(500).json({ error: 'Failed to sync timetable' });
    }
};

const uploadTimetableExcel = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Please select an Excel or CSV file to upload.' });
    }

    const { semester, startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please specify the Semester Start Date and End Date.' });
    }

    const startSemDate = new Date(startDate);
    const endSemDate = new Date(endDate);

    if (isNaN(startSemDate.getTime()) || isNaN(endSemDate.getTime()) || startSemDate > endSemDate) {
        return res.status(400).json({ error: 'Invalid Semester Duration Date Range.' });
    }

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        if (!rawRows || rawRows.length === 0) {
            return res.status(400).json({ error: 'Uploaded Excel file contains no data rows.' });
        }

        // Fetch existing resources to match room names
        const resources = await Resource.find();
        const resourcesMap = new Map();
        resources.forEach(r => {
            resourcesMap.set(r.name.trim().toLowerCase(), r._id);
            resourcesMap.set(r.name.trim().replace(/\s+/g, '').toLowerCase(), r._id);
        });

        const getRowVal = (row, ...aliases) => {
            const keys = Object.keys(row);
            for (const alias of aliases) {
                const foundKey = keys.find(k => k.trim().toLowerCase() === alias.toLowerCase() || k.trim().toLowerCase().includes(alias.toLowerCase()));
                if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                    return String(row[foundKey]).trim();
                }
            }
            return '';
        };

        const parsedTimetableEntries = [];
        const warnings = [];

        rawRows.forEach((row, idx) => {
            const rowNum = idx + 2;
            const dayStr = getRowVal(row, 'day', 'day of week');
            const roomStr = getRowVal(row, 'room', 'resource', 'classroom', 'hall', 'lab');
            const subject = getRowVal(row, 'subject', 'course');
            const teacher = getRowVal(row, 'teacher', 'subject teacher', 'instructor', 'faculty');
            const semStr = getRowVal(row, 'semester', 'sem') || semester || 'General';

            let startTimeStr = getRowVal(row, 'start time', 'starttime', 'start');
            let endTimeStr = getRowVal(row, 'end time', 'endtime', 'end');
            const timingsStr = getRowVal(row, 'timings', 'time', 'timing');

            if ((!startTimeStr || !endTimeStr) && timingsStr) {
                const parts = timingsStr.split(/[-to\u2013]/i);
                if (parts.length >= 2) {
                    startTimeStr = parts[0].trim();
                    endTimeStr = parts[1].trim();
                }
            }

            const dayOfWeek = parseDayOfWeek(dayStr);
            const resourceId = resourcesMap.get(roomStr.toLowerCase()) || resourcesMap.get(roomStr.replace(/\s+/g, '').toLowerCase());

            const startObj = parseTimeString(startTimeStr);
            const endObj = parseTimeString(endTimeStr);

            if (dayOfWeek === null) {
                warnings.push(`Row ${rowNum}: Could not parse Day "${dayStr}"`);
                return;
            }
            if (!resourceId) {
                warnings.push(`Row ${rowNum}: Room/Resource "${roomStr}" not found in database`);
                return;
            }
            if (!startObj || !endObj) {
                warnings.push(`Row ${rowNum}: Could not parse start/end time "${startTimeStr} - ${endTimeStr}"`);
                return;
            }

            const formattedStartTime = `${String(startObj.hours).padStart(2, '0')}:${String(startObj.minutes).padStart(2, '0')}:00`;
            const formattedEndTime = `${String(endObj.hours).padStart(2, '0')}:${String(endObj.minutes).padStart(2, '0')}:00`;

            parsedTimetableEntries.push({
                resource_id: resourceId,
                room_name: roomStr,
                day_of_week: dayOfWeek,
                start_obj: startObj,
                end_obj: endObj,
                start_time_str: formattedStartTime,
                end_time_str: formattedEndTime,
                semester: semStr,
                subject: subject || 'Class',
                teacher: teacher || ''
            });
        });

        if (parsedTimetableEntries.length === 0) {
            return res.status(400).json({
                error: 'Failed to parse any valid timetable rows from Excel.',
                warnings
            });
        }

        // Insert into Timetable collection
        for (const entry of parsedTimetableEntries) {
            await Timetable.create({
                resource: entry.resource_id,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time_str,
                end_time: entry.end_time_str,
                semester: entry.semester,
                subject: entry.subject,
                teacher: entry.teacher
            });
        }

        // Auto-generate bookings across semester date range
        let bookingsCreated = 0;
        let conflictCount = 0;

        for (let d = new Date(startSemDate); d <= endSemDate; d.setDate(d.getDate() + 1)) {
            const currentDayOfWeek = d.getDay();
            const dayEntries = parsedTimetableEntries.filter(e => e.day_of_week === currentDayOfWeek);

            for (const entry of dayEntries) {
                const bStart = new Date(d);
                bStart.setHours(entry.start_obj.hours, entry.start_obj.minutes, 0, 0);

                const bEnd = new Date(d);
                bEnd.setHours(entry.end_obj.hours, entry.end_obj.minutes, 0, 0);

                const conflictCheck = await Booking.findOne({
                    resource: entry.resource_id,
                    status: { $nin: ['CANCELLED', 'REJECTED'] },
                    start_time: { $lt: bEnd },
                    end_time: { $gt: bStart }
                });

                if (!conflictCheck) {
                    const purposeStr = entry.teacher ? `${entry.subject} - ${entry.teacher}` : entry.subject;
                    await Booking.create({
                        resource: entry.resource_id,
                        user: req.user.id,
                        start_time: bStart,
                        end_time: bEnd,
                        purpose: purposeStr,
                        semester: entry.semester,
                        subject: entry.subject,
                        teacher: entry.teacher,
                        status: 'TIMETABLE'
                    });
                    bookingsCreated++;
                } else {
                    conflictCount++;
                }
            }
        }

        res.json({
            message: `Successfully processed ${parsedTimetableEntries.length} timetable entries and created ${bookingsCreated} classroom bookings.`,
            timetableEntriesParsed: parsedTimetableEntries.length,
            bookingsCreated,
            conflictsSkipped: conflictCount,
            warnings
        });

    } catch (err) {
        console.error('Upload timetable excel error:', err);
        res.status(500).json({ error: err.message || 'Failed to process timetable Excel file' });
    }
};

const seedData = async (req, res) => {
    try {
        await Booking.deleteMany({});
        await Timetable.deleteMany({});
        res.json({ message: 'Database seeded and reset successfully' });
    } catch (err) {
        console.error('seedData error:', err);
        res.status(500).json({ error: 'Seed failed' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({}, { password_hash: 0 }).sort({ created_at: -1 });
        res.json(users);
    } catch (err) {
        console.error('getUsers error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own admin account.' });
        }
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('deleteUser error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

module.exports = { addTimetable, blockResource, syncTimetable, uploadTimetableExcel, seedData, getUsers, deleteUser };

