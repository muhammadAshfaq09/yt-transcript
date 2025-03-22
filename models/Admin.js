const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['super-admin', 'admin', 'moderator', 'editor'],
        default: 'admin'
    },
    permissions: {
        manageUsers: {
            type: Boolean,
            default: true
        },
        manageContacts: {
            type: Boolean,
            default: true
        },
        manageContent: {
            type: Boolean,
            default: true
        },
        viewAnalytics: {
            type: Boolean,
            default: true
        },
        manageSettings: {
            type: Boolean,
            default: false
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: {
        type: String,
        default: ''
    }
});

// Add index for more efficient queries
AdminSchema.index({ userId: 1 });

module.exports = mongoose.model('Admin', AdminSchema); 