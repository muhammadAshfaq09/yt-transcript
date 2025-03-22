// Mobile menu toggle functionality
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const authButtons = document.querySelector('.auth-buttons');

// Authentication state
let currentUser = null;

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthStatus();
    setupAuthButtons();
    setupMobileMenu();
    setupTranscriptConverter();
    setupFaqAccordion();
    setupCookieConsent();
});

// Cookie Consent Functions
function setupCookieConsent() {
    const cookieConsent = document.getElementById('cookie-consent');
    const acceptCookies = document.getElementById('accept-cookies');
    const rejectCookies = document.getElementById('reject-cookies');
    
    // Check if user has already made a choice
    const consentStatus = localStorage.getItem('cookieConsent');
    
    if (!consentStatus) {
        // Show the consent banner if no choice has been made
        cookieConsent.style.display = 'flex';
    }
    
    // Accept cookies
    acceptCookies.addEventListener('click', function() {
        localStorage.setItem('cookieConsent', 'accepted');
        cookieConsent.style.display = 'none';
        setCookiePreferences(true);
    });
    
    // Reject cookies
    rejectCookies.addEventListener('click', function() {
        localStorage.setItem('cookieConsent', 'rejected');
        cookieConsent.style.display = 'none';
        setCookiePreferences(false);
    });
}

// Set cookie preferences based on user choice
function setCookiePreferences(accepted) {
    if (accepted) {
        // Enable all cookies
        // This is where you would enable analytics or other optional cookies
        console.log('All cookies accepted');
    } else {
        // Disable optional cookies, but keep essential ones
        console.log('Only essential cookies allowed');
        // Clear any non-essential cookies
        clearNonEssentialCookies();
    }
}

// Clear non-essential cookies
function clearNonEssentialCookies() {
    // Example: Clear any analytics cookies
    // This is a simplified example - in a real application, you would need to specifically identify and remove non-essential cookies
    document.cookie.split(';').forEach(function(cookie) {
        const cookieName = cookie.split('=')[0].trim();
        // Don't delete essential cookies like session or authentication
        if (cookieName !== 'token') {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
    });
}

// Setup authentication state and buttons
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/user', {
            method: 'GET',
            credentials: 'include', // Important for cookies
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.user) {
            currentUser = data.user;
            updateUIForLoggedInUser();
        } else {
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        currentUser = null;
        updateUIForLoggedOutUser();
    }
}

// Update UI based on authentication status
function updateUIForLoggedInUser() {
    // Clear existing buttons
    if (authButtons) {
        authButtons.innerHTML = '';
        
        // Create user menu button
        const userMenuBtn = document.createElement('div');
        userMenuBtn.className = 'user-menu-btn';
        userMenuBtn.innerHTML = `
            <span>Hello, ${currentUser.username}</span>
            <div class="user-dropdown">
                <a href="#" id="profile-link">My Profile</a>
                <a href="#" id="logout-btn">Logout</a>
            </div>
        `;
        authButtons.appendChild(userMenuBtn);
        
        // Add event listener for logout
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        
        // Also update any cloned buttons in mobile menu
        const mobileAuthButtons = document.querySelector('.nav-links .auth-buttons');
        if (mobileAuthButtons) {
            mobileAuthButtons.innerHTML = userMenuBtn.outerHTML;
            mobileAuthButtons.querySelector('#logout-btn').addEventListener('click', handleLogout);
        }
    }
}

function updateUIForLoggedOutUser() {
    // Clear existing buttons
    if (authButtons) {
        authButtons.innerHTML = '';
        
        // Create login button
        const loginBtn = document.createElement('button');
        loginBtn.className = 'login-btn';
        loginBtn.textContent = 'Login';
        loginBtn.id = 'login-btn';
        
        // Create signup button
        const signupBtn = document.createElement('button');
        signupBtn.className = 'signup-btn';
        signupBtn.textContent = 'Sign Up';
        signupBtn.id = 'signup-btn';
        
        // Add buttons to container
        authButtons.appendChild(loginBtn);
        authButtons.appendChild(signupBtn);
        
        // Add event listeners
        loginBtn.addEventListener('click', openLoginModal);
        signupBtn.addEventListener('click', openSignupModal);
    }
}

// Authentication event handlers
function setupAuthButtons() {
    // Login and signup buttons event listeners are added in updateUIForLoggedOutUser
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.auth-modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                closeAllModals();
            }
        });
    });
    
    // Close button in modals
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });
    
    // Form submission handlers
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

// Open login modal
function openLoginModal() {
    closeAllModals();
    
    const modalHTML = `
        <div class="auth-modal" id="login-modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Login to Your Account</h2>
                <form id="login-form">
                    <div class="form-group">
                        <label for="login-email">Email</label>
                        <input type="email" id="login-email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" name="password" required>
                    </div>
                    <div class="error-message" id="login-error"></div>
                    <button type="submit" class="auth-submit">Login</button>
                </form>
                <p class="auth-switch">Don't have an account? <a href="#" id="switch-to-signup">Sign up</a></p>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('switch-to-signup').addEventListener('click', function(e) {
        e.preventDefault();
        closeAllModals();
        openSignupModal();
    });
    
    document.querySelector('.close-modal').addEventListener('click', closeAllModals);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Show modal
    setTimeout(() => {
        document.getElementById('login-modal').classList.add('show');
    }, 10);
}

// Open signup modal
function openSignupModal() {
    closeAllModals();
    
    const modalHTML = `
        <div class="auth-modal" id="signup-modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Create an Account</h2>
                <form id="signup-form">
                    <div class="form-group">
                        <label for="signup-username">Username</label>
                        <input type="text" id="signup-username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-email">Email</label>
                        <input type="email" id="signup-email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-password">Password</label>
                        <input type="password" id="signup-password" name="password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label for="signup-confirm">Confirm Password</label>
                        <input type="password" id="signup-confirm" name="confirmPassword" required>
                    </div>
                    <div class="error-message" id="signup-error"></div>
                    <button type="submit" class="auth-submit">Sign Up</button>
                </form>
                <p class="auth-switch">Already have an account? <a href="#" id="switch-to-login">Login</a></p>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('switch-to-login').addEventListener('click', function(e) {
        e.preventDefault();
        closeAllModals();
        openLoginModal();
    });
    
    document.querySelector('.close-modal').addEventListener('click', closeAllModals);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    
    // Show modal
    setTimeout(() => {
        document.getElementById('signup-modal').classList.add('show');
    }, 10);
}

// Close all modals
function closeAllModals() {
    const modals = document.querySelectorAll('.auth-modal');
    modals.forEach(modal => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300); // Match transition time
    });
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    
    try {
        errorElement.textContent = '';
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update current user data
            currentUser = data.user;
            
            // Update UI for logged in user
            updateUIForLoggedInUser();
            
            // Close modal
            closeAllModals();
            
            // Show success message
            showNotification('Successfully logged in!', 'success');
        } else {
            errorElement.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = 'An error occurred during login';
    }
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const errorElement = document.getElementById('signup-error');
    
    // Validate password match
    if (password !== confirmPassword) {
        errorElement.textContent = 'Passwords do not match';
        return;
    }
    
    try {
        errorElement.textContent = '';
        
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update current user data
            currentUser = data.user;
            
            // Update UI for logged in user
            updateUIForLoggedInUser();
            
            // Close modal
            closeAllModals();
            
            // Show success message
            showNotification('Account created successfully!', 'success');
        } else {
            errorElement.textContent = data.message || 'Registration failed';
        }
    } catch (error) {
        console.error('Signup error:', error);
        errorElement.textContent = 'An error occurred during registration';
    }
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update current user data
            currentUser = null;
            
            // Update UI for logged out user
            updateUIForLoggedOutUser();
            
            // Show success message
            showNotification('Successfully logged out!', 'success');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('An error occurred during logout', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    notification.appendChild(closeBtn);
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Setup mobile menu
function setupMobileMenu() {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        // If we're opening the menu, move auth buttons into nav-links
        if (navLinks.classList.contains('active')) {
            const clonedButtons = authButtons.cloneNode(true);
            if (!document.querySelector('.nav-links .auth-buttons')) {
                navLinks.appendChild(clonedButtons);
                
                // Re-attach event listeners to cloned buttons
                const mobileLoginBtn = clonedButtons.querySelector('#login-btn');
                const mobileSignupBtn = clonedButtons.querySelector('#signup-btn');
                const mobileLogoutBtn = clonedButtons.querySelector('#logout-btn');
                
                if (mobileLoginBtn) mobileLoginBtn.addEventListener('click', openLoginModal);
                if (mobileSignupBtn) mobileSignupBtn.addEventListener('click', openSignupModal);
                if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
            }
        }
    });

    // Close mobile menu when a link is clicked
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navLinks.classList.remove('active');
        }
    });
}

// Setup YouTube Transcript Converter Functionality
function setupTranscriptConverter() {
    const youtubeUrlInput = document.getElementById('youtube-url');
    const convertBtn = document.getElementById('convert-btn');
    const loadingElement = document.getElementById('loading');
    const transcriptBox = document.getElementById('transcript-box');
    const transcriptContent = document.getElementById('transcript-content');
    const videoTitleElement = document.getElementById('video-title');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    // Hide results containers initially
    loadingElement.style.display = 'none';
    transcriptBox.style.display = 'none';
    
    convertBtn.addEventListener('click', handleConversion);
    youtubeUrlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleConversion();
        }
    });
    
    async function handleConversion() {
        const url = youtubeUrlInput.value.trim();
        if (!url) {
            showNotification('Please enter a YouTube URL', 'error');
            return;
        }
        
        const videoId = extractVideoId(url);
        if (!videoId) {
            showNotification('Invalid YouTube URL. Please check and try again.', 'error');
            return;
        }
        
        // Show loading, hide results
        loadingElement.style.display = 'flex';
        transcriptBox.style.display = 'none';
        
        // Add processing class to button
        convertBtn.classList.add('processing');
        convertBtn.disabled = true;
        convertBtn.textContent = 'Processing...';
        
        try {
            // Start at 0%
            updateLoadingStatus('Connecting to YouTube...');
            simulateProgress(10);
            
            // Get video metadata (title, etc)
            const metadata = await getVideoMetadata(videoId);
            
            updateLoadingStatus('Extracting transcript data...');
            simulateProgress(40);
            
            // Fetch the transcript
            const transcriptResult = await fetchTranscript(videoId);
            
            // Add to history if user is logged in
            if (currentUser) {
                try {
                    await fetch('/api/history/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            videoId,
                            videoTitle: metadata.title
                        })
                    });
                } catch (error) {
                    console.error('Failed to add to history:', error);
                }
            }
            
            // Format and display the transcript
            updateLoadingStatus('Formatting transcript...');
            simulateProgress(80);
            
            // Display the result
            videoTitleElement.textContent = metadata.title;
            transcriptContent.innerHTML = formatTranscriptForDisplay(transcriptResult.transcript);
            
            updateLoadingStatus('Complete!');
            simulateProgress(100);
            
            // Show results, hide loading
            setTimeout(() => {
                loadingElement.style.display = 'none';
                transcriptBox.style.display = 'block';
                convertBtn.classList.remove('processing');
                convertBtn.disabled = false;
                convertBtn.textContent = 'Convert to Text';
                
                // Scroll to results
                transcriptBox.scrollIntoView({ behavior: 'smooth' });
            }, 500);
            
        } catch (error) {
            loadingElement.style.display = 'none';
            convertBtn.classList.remove('processing');
            convertBtn.disabled = false;
            convertBtn.textContent = 'Convert to Text';
            
            let errorMessage = 'Failed to get transcript. Please try again.';
            
            if (error.message.includes('No captions')) {
                errorMessage = 'This video does not have captions available.';
            } else if (error.message.includes('video is unavailable')) {
                errorMessage = 'This video is unavailable or private.';
            }
            
            showNotification(errorMessage, 'error');
            console.error('Transcript Error:', error);
        }
    }
    
    function extractVideoId(url) {
        // Handle various YouTube URL formats
        let patterns = [
            // Standard YouTube watch URLs
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/i,
            // Short YouTube URLs
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?&]+)/i,
            // Embed URLs
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?&]+)/i,
            // Shortened URLs with feature parameter
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?feature=\w+&v=([^&]+)/i,
            // URLs with v parameter not first
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([^&]+)/i,
            // YouTube music URLs
            /(?:https?:\/\/)?(?:www\.)?music\.youtube\.com\/watch\?v=([^&]+)/i,
            // YouTube Shorts URLs
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?&]+)/i
        ];
        
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    // Function to get video metadata using backend API
    async function getVideoMetadata(videoId) {
        try {
            updateLoadingStatus('Retrieving video information...');
            const response = await fetch(`${API_URL}/video-info/${videoId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch video metadata');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch video metadata');
            }
            
            return {
                title: data.title,
                author: data.author,
                thumbnail: data.thumbnail
            };
        } catch (error) {
            console.error('Error fetching video metadata:', error);
            // Fallback to generic title if API fails
            return {
                title: 'YouTube Video',
                author: 'Unknown Creator',
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            };
        }
    }

    // Function to fetch transcript using our backend API
    async function fetchTranscript(videoId) {
        try {
            // Step 1: Start processing and report initial status
            updateLoadingStatus('Initializing transcript extraction...');
            await simulateProgress(10);

            // Step 2: Fetch video metadata in parallel
            const metadataPromise = getVideoMetadata(videoId);
            
            updateLoadingStatus('Connecting to YouTube servers...');
            await simulateProgress(15);
            
            // Step 3: Call our backend API to fetch the transcript
            updateLoadingStatus('Extracting captions from video...');
            
            // Real API call to our backend
            const response = await fetch(`${API_URL}/transcript/${videoId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch transcript');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch transcript');
            }
            
            updateLoadingStatus('Processing transcript data...');
            await simulateProgress(15);
            
            // Get metadata
            const metadata = await metadataPromise;
            
            return {
                title: metadata.title,
                author: metadata.author,
                videoId: videoId,
                transcript: data.transcript
            };
            
        } catch (error) {
            console.error('Error fetching transcript:', error);
            throw new Error('Could not retrieve transcript: ' + (error.message || 'Unknown error'));
        }
    }
    
    // Helper function to update loading status message
    function updateLoadingStatus(message) {
        const statusElement = loadingElement.querySelector('p');
        statusElement.textContent = message;
    }
    
    // Helper function to simulate processing progress for a more interactive experience
    function simulateProgress(percentage) {
        return new Promise(resolve => {
            // Calculate time based on percentage (faster for demos)
            const timeToWait = percentage * 20; // 20ms per percent
            setTimeout(resolve, timeToWait);
        });
    }

    // Copy transcript to clipboard
    copyBtn.addEventListener('click', function() {
        const text = transcriptContent.innerText;
        navigator.clipboard.writeText(text).then(function() {
            // Change button text temporarily to show success
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ Copied!';
            copyBtn.style.backgroundColor = '#4CAF50';
            copyBtn.style.borderColor = '#4CAF50';
            copyBtn.style.color = 'white';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '';
                copyBtn.style.borderColor = '';
                copyBtn.style.color = '';
            }, 2000);
        }, function(err) {
            alert('Could not copy text: ' + err);
        });
    });
    
    // Download transcript as text file
    downloadBtn.addEventListener('click', function() {
        const text = transcriptContent.innerText;
        const filename = videoTitleElement.textContent.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_transcript.txt';
        
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        
        element.style.display = 'none';
        document.body.appendChild(element);
        
        element.click();
        
        document.body.removeChild(element);
    });
}

// Setup FAQ Accordion functionality
function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current FAQ item
            item.classList.toggle('active');
        });
    });
} 