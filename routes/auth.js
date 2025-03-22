// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate email and password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update login history
        try {
            if (!user.loginHistory) {
                user.loginHistory = [];
            }
            
            // Get IP address and user agent
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];
            
            // Push new login record
            user.loginHistory.push({
                timestamp: new Date(),
                ip,
                userAgent
            });
            
            // Limit history to last 10 entries
            if (user.loginHistory.length > 10) {
                user.loginHistory = user.loginHistory.slice(-10);
            }
            
            // Update login count and last login
            user.loginCount = (user.loginCount || 0) + 1;
            user.lastLogin = new Date();
            
            // Special check for admin user
            if (email === 'ashfaqvishu@gmail.com') {
                user.isAdmin = true;
            }
            
            await user.save();
        } catch (err) {
            console.error('Error updating login history:', err);
            // Continue login process even if updating history fails
        }

        // Create and sign JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // Set cookie with token
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });

        // Send success response
        return res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || email === 'ashfaqvishu@gmail.com'
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