const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

// Define the login history schema
const LoginHistorySchema = new Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String,
        default: 'unknown'
    },
    userAgent: {
        type: String,
        default: 'unknown'
    }
});

// Define the transcript history schema
const TranscriptHistorySchema = new Schema({
    videoId: {
        type: String,
        required: true
    },
    videoTitle: {
        type: String,
        default: 'Untitled video'
    },
    convertedAt: {
        type: Date,
        default: Date.now
    }
});

// Define the User schema
const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginCount: {
        type: Number,
        default: 0
    },
    loginHistory: [LoginHistorySchema],
    transcriptHistory: [TranscriptHistorySchema],
    isAdmin: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumSince: {
        type: Date,
        default: null
    },
    premiumExpires: {
        type: Date,
        default: null
    }
});

// Create a virtual property for the user's full name (not stored in DB)
UserSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Don't return the password when converting to JSON
UserSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model('User', UserSchema); 