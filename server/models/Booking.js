const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    start_time: {
        type: Date,
        required: true
    },
    end_time: {
        type: Date,
        required: true
    },
    purpose: {
        type: String,
        default: ''
    },
    semester: {
        type: String,
        default: ''
    },
    subject: {
        type: String,
        default: ''
    },
    teacher: {
        type: String,
        default: ''
    },
    cancel_reason: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCEL_REQUESTED', 'CANCELLED', 'BLOCKED', 'TIMETABLE'],
        default: 'PENDING'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id.toString();
            // Also expose resource_id and user_id for backward compatibility
            if (ret.resource) {
                ret.resource_id = ret.resource._id ? ret.resource._id.toString() : ret.resource.toString();
            }
            if (ret.user) {
                ret.user_id = ret.user._id ? ret.user._id.toString() : ret.user.toString();
            }
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for fast conflict checks and range queries
BookingSchema.index({ resource: 1, start_time: 1, end_time: 1, status: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
