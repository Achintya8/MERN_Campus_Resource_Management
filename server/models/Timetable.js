const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
        required: true
    },
    day_of_week: {
        type: Number,
        required: true,
        min: 0,
        max: 6 // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    },
    start_time: {
        type: String,
        required: true // Format: "HH:mm" or "HH:mm:ss"
    },
    end_time: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    teacher: {
        type: String,
        default: ''
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id.toString();
            if (ret.resource) {
                ret.resource_id = ret.resource._id ? ret.resource._id.toString() : ret.resource.toString();
            }
            delete ret.__v;
            return ret;
        }
    }
});

module.exports = mongoose.model('Timetable', TimetableSchema);
