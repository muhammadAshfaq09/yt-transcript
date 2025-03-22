require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { YoutubeTranscript } = require('youtube-transcript');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Contact = require('./models/Contact');
const Admin = require('./models/Admin');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Should be in env variables

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI , {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            req.user = null;
            return next();
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            req.user = null;
            return next();
        }
        
        // Special check for admin email - ensure admin status is set
        if (user.email === 'ashfaqvishu@gmail.com') {
            // If this specific user doesn't have admin flag set, update it
            if (!user.isAdmin) {
                user.isAdmin = true;
                await user.save();
                console.log('Updated admin status for ashfaqvishu@gmail.com');
            }
        }
        
        // If user is an admin, get their admin details
        if (user.isAdmin) {
            const adminDetails = await Admin.findOne({ userId: user._id });
            if (adminDetails) {
                user.adminDetails = adminDetails;
            } else if (user.email === 'ashfaqvishu@gmail.com') {
                // Create admin record if doesn't exist for this specific user
                const newAdmin = new Admin({
                    userId: user._id,
                    role: 'super-admin',
                    permissions: {
                        manageUsers: true,
                        manageContacts: true,
                        manageContent: true,
                        viewAnalytics: true,
                        manageSettings: true
                    },
                    createdAt: new Date(),
                    isActive: true
                });
                
                try {
                    await newAdmin.save();
                    user.adminDetails = newAdmin;
                    console.log('Created admin record for ashfaqvishu@gmail.com');
                } catch (err) {
                    console.error('Error creating admin record:', err);
                }
            }
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        req.user = null;
        next();
    }
};

// Apply authentication middleware
app.use(authenticateUser);

// Middleware to check if user is admin
const authenticateAdmin = async (req, res, next) => {
    try {
        // Ensure user is authenticated first
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        // Special check for specific admin user
        if (req.user.email === 'ashfaqvishu@gmail.com') {
            return next();
        }
        
        // Check if user has admin privileges
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false, 
                message: 'Admin privileges required'
            });
        }
        
        // User is admin, proceed
        next();
    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during admin authentication'
        });
    }
};

// User Registration Route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or username already exists' 
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });
        
        // Save user to database
        await newUser.save();
        
        // Create JWT token
        const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });
        
        // Set cookie with token
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });
        
        // Return user data (excluding password)
        return res.status(201).json({
            success: true,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message
        });
    }
});

// User Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Create JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        // Update login history
        const loginInfo = {
            timestamp: new Date(),
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
        };
        
        // Add login to history (initialize if it doesn't exist)
        if (!user.loginHistory) {
            user.loginHistory = [];
        }
        user.loginHistory.push(loginInfo);
        
        // Limit login history to last 50 entries
        if (user.loginHistory.length > 50) {
            user.loginHistory = user.loginHistory.slice(-50);
        }
        
        // Update login count and last login time
        if (!user.loginCount) {
            user.loginCount = 0;
        }
        user.loginCount += 1;
        user.lastLogin = new Date();
        
        // Save user updates
        await user.save();
        
        // Set cookie with token
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });
        
        // Return user data (excluding password)
        return res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
});

// User Logout Route
app.post('/api/auth/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    });
    
    return res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Get Current User Route - fix to include admin info
app.get('/api/auth/user', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }
    
    // Special check for admin email
    if (req.user.email === 'ashfaqvishu@gmail.com' && !req.user.isAdmin) {
        req.user.isAdmin = true;
        await User.updateOne({ _id: req.user._id }, { $set: { isAdmin: true } });
    }
    
    return res.json({
        success: true,
        user: {
            ...req.user._doc,
            isAdmin: req.user.isAdmin || req.user.email === 'ashfaqvishu@gmail.com'
        }
    });
});

// API endpoint to fetch YouTube transcript
app.get('/api/transcript/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        
        console.log(`Fetching transcript for video ID: ${videoId}`);
        
        // Fetch transcript using youtube-transcript-api
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        
        if (!transcript || transcript.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No transcript found for this video' 
            });
        }
        
        // Process the transcript to format it properly
        const formattedTranscript = formatTranscript(transcript);
        
        return res.json({ 
            success: true, 
            transcript: formattedTranscript,
            raw: transcript // Include raw data for debugging or advanced usage
        });
    } catch (error) {
        console.error('Error fetching transcript:', error);
        
        // Provide a user-friendly error message
        let errorMessage = 'Failed to retrieve transcript';
        if (error.message.includes('Could not find transcript')) {
            errorMessage = 'No captions available for this video';
        } else if (error.message.includes('Video unavailable')) {
            errorMessage = 'This video is unavailable or private';
        }
        
        return res.status(500).json({ 
            success: false, 
            message: errorMessage,
            error: error.message
        });
    }
});

// Helper function to format transcript data
function formatTranscript(transcriptData) {
    let formattedText = '';
    
    transcriptData.forEach(item => {
        // Convert duration to MM:SS format
        const minutes = Math.floor(item.offset / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((item.offset % 60000) / 1000).toString().padStart(2, '0');
        const timestamp = `[${minutes}:${seconds}]`;
        
        // Add the timestamped text
        formattedText += `${timestamp} ${item.text}\n\n`;
    });
    
    return formattedText.trim();
}

// Get video metadata from YouTube oEmbed API
app.get('/api/video-info/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch video metadata');
        }
        
        const data = await response.json();
        
        return res.json({
            success: true,
            title: data.title,
            author: data.author_name,
            thumbnail: data.thumbnail_url
        });
    } catch (error) {
        console.error('Error fetching video metadata:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch video metadata',
            error: error.message
        });
    }
});

// Legal pages routes
app.get('/terms-of-service', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms-of-service.html'));
});

app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/cookie-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cookie-policy.html'));
});

// User History Routes
app.post('/api/history/add', authenticateUser, async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'You must be logged in to save history'
            });
        }
        
        const { videoId, videoTitle } = req.body;
        
        // Add to user's transcript history
        const user = await User.findById(req.user._id);
        
        // Check if this video is already in history
        const existingEntry = user.transcriptHistory.find(
            entry => entry.videoId === videoId
        );
        
        if (existingEntry) {
            // Update existing entry
            existingEntry.convertedAt = new Date();
        } else {
            // Add new entry
            user.transcriptHistory.push({
                videoId,
                videoTitle,
                convertedAt: new Date()
            });
        }
        
        // Limit history to most recent 20 items
        if (user.transcriptHistory.length > 20) {
            user.transcriptHistory = user.transcriptHistory
                .sort((a, b) => b.convertedAt - a.convertedAt)
                .slice(0, 20);
        }
        
        await user.save();
        
        return res.json({
            success: true,
            message: 'Added to transcript history'
        });
    } catch (error) {
        console.error('Error adding to history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add to history',
            error: error.message
        });
    }
});

app.get('/api/history', authenticateUser, async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'You must be logged in to view history'
            });
        }
        
        // Get user's transcript history
        const user = await User.findById(req.user._id);
        
        // Sort by most recent
        const sortedHistory = user.transcriptHistory
            .sort((a, b) => new Date(b.convertedAt) - new Date(a.convertedAt));
        
        return res.json({
            success: true,
            history: sortedHistory
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch history',
            error: error.message
        });
    }
});

// Contact form submission endpoint
app.post('/api/contact', authenticateUser, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Validate input
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }
        
        // Create new contact submission
        const contactSubmission = new Contact({
            name,
            email,
            subject,
            message,
            // Associate with user if logged in
            userId: req.user ? req.user._id : null
        });
        
        // Save to database
        await contactSubmission.save();
        
        // In a production environment, you would also:
        // 1. Send an email notification to support team
        // 2. Send a confirmation email to the user
        // 3. Possibly create a support ticket in your ticketing system
        
        console.log('Contact form submission saved:', contactSubmission._id);
        
        return res.json({
            success: true,
            message: 'Your message has been received! We will get back to you soon.',
            referenceId: contactSubmission._id
        });
    } catch (error) {
        console.error('Error processing contact form:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while processing your message'
        });
    }
});

// Admin routes
app.get('/api/auth/admin-check', authenticateUser, (req, res) => {
    if (!req.user) {
        return res.json({
            success: false,
            isAdmin: false,
            message: 'Not authenticated'
        });
    }
    
    return res.json({
        success: true,
        isAdmin: Boolean(req.user.isAdmin),
        user: req.user
    });
});

// Admin dashboard data
app.get('/api/admin/dashboard', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        console.log('Admin dashboard data request received from:', req.user.email);
        
        // Get current date
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Calculate start of current and previous month
        const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
        
        console.log('Stats calculation started...');
        
        // Stats calculation
        // Total users
        const totalUsers = await User.countDocuments();
        console.log('Total users:', totalUsers);
        
        const newUsersCurrentMonth = await User.countDocuments({
            createdAt: { $gte: startOfCurrentMonth }
        });
        
        const newUsersPreviousMonth = await User.countDocuments({
            createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth }
        });
        
        // User growth percentage
        let userGrowth = 0;
        if (newUsersPreviousMonth === 0) {
            userGrowth = newUsersCurrentMonth > 0 ? 100 : 0;
        } else {
            userGrowth = Math.round((newUsersCurrentMonth - newUsersPreviousMonth) / newUsersPreviousMonth * 100);
        }
        
        console.log('User growth calculated:', userGrowth);
        
        // Contact messages - handle if Contact model doesn't exist
        let totalContacts = 0;
        let newContactsCurrentMonth = 0;
        let newContactsPreviousMonth = 0;
        let contactGrowth = 0;
        let recentContacts = [];
        
        try {
            totalContacts = await Contact.countDocuments();
            
            newContactsCurrentMonth = await Contact.countDocuments({
                createdAt: { $gte: startOfCurrentMonth }
            });
            
            newContactsPreviousMonth = await Contact.countDocuments({
                createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth }
            });
            
            // Contact growth percentage
            if (newContactsPreviousMonth === 0) {
                contactGrowth = newContactsCurrentMonth > 0 ? 100 : 0;
            } else {
                contactGrowth = Math.round((newContactsCurrentMonth - newContactsPreviousMonth) / newContactsPreviousMonth * 100);
            }
            
            // Recent contacts
            recentContacts = await Contact.find()
                .sort({ createdAt: -1 })
                .limit(5);
                
            console.log('Contacts data loaded:', totalContacts, 'total contacts');
        } catch (error) {
            console.error('Error fetching contacts data:', error);
            // Set defaults if Contact model has issues
            totalContacts = 0;
            contactGrowth = 0;
            recentContacts = [];
        }
        
        // Recent users
        let recentUsers = [];
        try {
            recentUsers = await User.find()
                .select('username email createdAt status')
                .sort({ createdAt: -1 })
                .limit(5);
                
            console.log('Recent users loaded:', recentUsers.length);
        } catch (error) {
            console.error('Error fetching recent users:', error);
            recentUsers = [];
        }
        
        // Placeholder values for transcript data and premium users
        // These can be implemented fully when those features are ready
        const totalConversions = 0;
        const conversionGrowth = 0;
        const premiumUsers = 0;
        const premiumGrowth = 0;
        
        // Generate mock activity data if actual data can't be calculated yet
        // In a production app, this would be replaced with real metrics
        const last30Days = [];
        const newUsersByDay = [];
        const loginsByDay = [];
        const transcriptsByDay = [];
        
        // Generate 30 days of data with current date as the last day
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const dateStr = date.toISOString().split('T')[0];
            last30Days.push(dateStr);
            
            // Add mock data (or real data if available)
            newUsersByDay.push(Math.floor(Math.random() * 5)); // 0-4 new users per day
            loginsByDay.push(Math.floor(Math.random() * 10)); // 0-9 logins per day
            transcriptsByDay.push(Math.floor(Math.random() * 8)); // 0-7 transcripts per day
        }
        
        // Compile all stats
        const stats = {
            totalUsers,
            userGrowth,
            totalContacts,
            contactGrowth,
            totalConversions,
            conversionGrowth,
            premiumUsers,
            premiumGrowth
        };
        
        const userActivity = {
            dates: last30Days,
            newUsers: newUsersByDay,
            logins: loginsByDay,
            transcripts: transcriptsByDay
        };
        
        console.log('Admin dashboard data prepared successfully');
        
        return res.json({
            success: true,
            stats,
            recentContacts,
            recentUsers,
            userActivity
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching dashboard data',
            error: error.message
        });
    }
});

// Admin - Get all contacts with pagination, filtering and search
app.get('/api/admin/contacts', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const skip = (page - 1) * limit;
        
        // Build filter object
        const filter = {};
        
        if (req.query.status && req.query.status !== '') {
            filter.status = req.query.status;
        }
        
        if (req.query.subject && req.query.subject !== '') {
            filter.subject = req.query.subject;
        }
        
        if (req.query.search && req.query.search !== '') {
            // Search in name, email, and message
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { message: searchRegex }
            ];
        }
        
        // Get total count for pagination
        const totalCount = await Contact.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / limit);
        
        // Get contacts
        const contacts = await Contact.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        return res.json({
            success: true,
            contacts,
            currentPage: page,
            totalPages,
            totalCount
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching contacts'
        });
    }
});

// Admin - Get single contact by ID
app.get('/api/admin/contacts/:id', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }
        
        return res.json({
            success: true,
            contact
        });
    } catch (error) {
        console.error('Error fetching contact:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching contact'
        });
    }
});

// Admin - Update contact status
app.put('/api/admin/contacts/:id', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const { status, notes } = req.body;
        
        // Validate status
        if (status && !['new', 'in-progress', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }
        
        // Find and update the contact
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }
        
        // Update fields
        if (status) contact.status = status;
        if (notes !== undefined) contact.notes = notes;
        
        // Save changes
        await contact.save();
        
        return res.json({
            success: true,
            message: 'Contact updated successfully',
            contact
        });
    } catch (error) {
        console.error('Error updating contact:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating contact'
        });
    }
});

// Admin - Get user activity data
app.get('/api/admin/user-activity', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        
        // Ensure days is within a reasonable range
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                message: 'Invalid days parameter (must be between 1-365)'
            });
        }
        
        // Generate date range
        const dateRange = [];
        const newUsersByDay = [];
        const loginsByDay = [];
        const transcriptsByDay = [];
        
        // Populate arrays for the requested date range
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const dateStr = date.toISOString().split('T')[0];
            dateRange.push(dateStr);
            
            // Calculate end of day
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Count new users for this day
            const newUsersCount = await User.countDocuments({
                createdAt: { $gte: date, $lte: endOfDay }
            });
            newUsersByDay.push(newUsersCount);
            
            // Count logins for this day using the loginHistory field
            const loginCount = await User.aggregate([
                {
                    $match: {
                        'loginHistory.timestamp': { $gte: date, $lte: endOfDay }
                    }
                },
                {
                    $project: {
                        logins: {
                            $filter: {
                                input: '$loginHistory',
                                as: 'login',
                                cond: { 
                                    $and: [
                                        { $gte: ['$$login.timestamp', date] },
                                        { $lte: ['$$login.timestamp', endOfDay] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        loginCount: { $size: '$logins' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalLogins: { $sum: '$loginCount' }
                    }
                }
            ]);
            
            const dailyLogins = loginCount.length > 0 ? loginCount[0].totalLogins : 0;
            loginsByDay.push(dailyLogins);
            
            // Count transcripts for this day
            let dailyTranscripts = 0;
            const usersWithTranscriptsToday = await User.find({
                'transcriptHistory.convertedAt': { $gte: date, $lte: endOfDay }
            }).select('transcriptHistory');
            
            usersWithTranscriptsToday.forEach(user => {
                if (user.transcriptHistory && Array.isArray(user.transcriptHistory)) {
                    dailyTranscripts += user.transcriptHistory.filter(entry => 
                        new Date(entry.convertedAt) >= date && 
                        new Date(entry.convertedAt) <= endOfDay
                    ).length;
                }
            });
            
            transcriptsByDay.push(dailyTranscripts);
        }
        
        return res.json({
            success: true,
            activity: {
                dates: dateRange,
                newUsers: newUsersByDay,
                logins: loginsByDay,
                transcripts: transcriptsByDay
            }
        });
    } catch (error) {
        console.error('Error fetching user activity:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching user activity data'
        });
    }
});

// Admin Registration Route
app.post('/api/admin/register', authenticateUser, async (req, res) => {
    try {
        // Only existing super-admins can create new admins
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only super admins can register new admins'
            });
        }
        
        const { userId, role, permissions, notes } = req.body;
        
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if user is already an admin
        const existingAdmin = await Admin.findOne({ userId });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'User is already an admin'
            });
        }
        
        // Create new admin
        const newAdmin = new Admin({
            userId,
            role: role || 'admin',
            permissions: permissions || {},
            createdBy: req.user._id,
            notes
        });
        
        // Save admin to database
        await newAdmin.save();
        
        // Update user model as well
        user.isAdmin = true;
        await user.save();
        
        return res.status(201).json({
            success: true,
            message: 'Admin successfully registered',
            admin: newAdmin
        });
    } catch (error) {
        console.error('Admin registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during admin registration',
            error: error.message
        });
    }
});

// Get all admins
app.get('/api/admin/list', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().populate('userId', 'username email');
        
        return res.json({
            success: true,
            admins
        });
    } catch (error) {
        console.error('Error fetching admins:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching admins',
            error: error.message
        });
    }
});

// Make a user an admin (simplified route for the first admin or direct conversion)
app.post('/api/admin/make-admin', async (req, res) => {
    try {
        const { email, password, adminSecret } = req.body;
        
        // Verify admin secret (this should be an environment variable in production)
        const ADMIN_SECRET = process.env.ADMIN_SECRET || 'youtube-transcript-admin-secret';
        
        if (adminSecret !== ADMIN_SECRET) {
            return res.status(403).json({
                success: false,
                message: 'Invalid admin secret'
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check if user is already an admin
        let adminRecord = await Admin.findOne({ userId: user._id });
        
        if (!adminRecord) {
            // Create new admin record
            adminRecord = new Admin({
                userId: user._id,
                role: 'super-admin', // First admin is a super-admin
                permissions: {
                    manageUsers: true,
                    manageContacts: true,
                    manageContent: true,
                    viewAnalytics: true,
                    manageSettings: true
                }
            });
            
            await adminRecord.save();
        }
        
        // Update user model
        user.isAdmin = true;
        await user.save();
        
        // Create JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        // Set cookie with token
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });
        
        return res.json({
            success: true,
            message: 'Admin status granted successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: true
            }
        });
    } catch (error) {
        console.error('Error granting admin status:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while making user an admin',
            error: error.message
        });
    }
});

// Force update admin status for specific user
app.get('/api/admin/force-update', async (req, res) => {
    try {
        // Only update for specific user
        const email = 'ashfaqvishu@gmail.com';
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update user
        user.isAdmin = true;
        await user.save();
        
        // Check admin record
        let adminRecord = await Admin.findOne({ userId: user._id });
        
        if (!adminRecord) {
            // Create new admin record
            adminRecord = new Admin({
                userId: user._id,
                role: 'super-admin',
                permissions: {
                    manageUsers: true,
                    manageContacts: true,
                    manageContent: true,
                    viewAnalytics: true,
                    manageSettings: true
                },
                createdAt: new Date(),
                isActive: true
            });
            
            await adminRecord.save();
        }
        
        return res.json({
            success: true,
            message: 'Admin status updated successfully',
            user: {
                id: user._id,
                email: user.email,
                isAdmin: true
            }
        });
    } catch (error) {
        console.error('Error updating admin status:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating admin status',
            error: error.message
        });
    }
});

// Serve the static files for any other request
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
}); 