// Check if user is logged in and update UI accordingly
function updateUIForLoggedInUser() {
    fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        // Find the navbar element - try different selectors since structure might vary
        let navbarRight = document.querySelector('.navbar-nav');
        
        if (!navbarRight) {
            navbarRight = document.querySelector('.nav-links');
        }
        
        if (!navbarRight) {
            navbarRight = document.querySelector('.auth-buttons');
        }
        
        // Debug info
        console.log('Found navbar element:', navbarRight);
        console.log('User data:', data);
        
        if (data.success && data.user) {
            // User is logged in
            const logoutLink = document.createElement('li');
            logoutLink.className = 'nav-item';
            logoutLink.innerHTML = `<a class="nav-link" href="#" id="logout-link">Logout</a>`;
            
            const profileLink = document.createElement('li');
            profileLink.className = 'nav-item';
            profileLink.innerHTML = `<a class="nav-link" href="/profile.html">My Profile</a>`;
            
            // SPECIAL FIX: Always add admin link for this email
            if (data.user.email === 'ashfaqvishu@gmail.com') {
                console.log('Adding admin dashboard link for ashfaqvishu@gmail.com');
                
                // Force admin status
                addAdminLink(navbarRight);
                
                // Also update the user in the database by calling force-update
                fetch('/api/admin/force-update', {
                    method: 'GET',
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Admin status updated:', data);
                })
                .catch(error => {
                    console.error('Error updating admin status:', error);
                });
            } 
            else if (data.user.isAdmin) {
                console.log('Adding admin dashboard link for admin user');
                addAdminLink(navbarRight);
            }
            
            // Add profile and logout links if navbar exists
            if (navbarRight) {
                navbarRight.appendChild(profileLink);
                navbarRight.appendChild(logoutLink);
                
                // Set up logout functionality
                document.getElementById('logout-link').addEventListener('click', function(e) {
                    e.preventDefault();
                    logout();
                });
            }
            
            // Update any user-specific UI elements
            const userElements = document.querySelectorAll('.user-username');
            userElements.forEach(element => {
                element.textContent = data.user.username;
            });
            
            // Debugging log
            console.log('User logged in as:', data.user.email, 'isAdmin:', data.user.isAdmin);
        } else {
            // User is not logged in
            if (navbarRight) {
                const loginLink = document.createElement('li');
                loginLink.className = 'nav-item';
                loginLink.innerHTML = `<a class="nav-link" href="/login.html">Login</a>`;
                
                const registerLink = document.createElement('li');
                registerLink.className = 'nav-item';
                registerLink.innerHTML = `<a class="nav-link" href="/register.html">Register</a>`;
                
                navbarRight.appendChild(loginLink);
                navbarRight.appendChild(registerLink);
            }
        }
    })
    .catch(error => {
        console.error('Error checking authentication status:', error);
    });
}

// Function to add admin dashboard link
function addAdminLink(navbarElement) {
    if (!navbarElement) {
        console.error('No navbar element found to add admin link');
        return;
    }
    
    // Create direct dashboard access link
    const adminLink = document.createElement('li');
    adminLink.className = 'nav-item';
    adminLink.innerHTML = `
        <a class="nav-link admin-link" href="/admin/dashboard.html" style="background-color: #f1c40f; color: #333 !important; padding: 5px 12px; border-radius: 4px; font-weight: 500;">
            <i class="fas fa-tachometer-alt"></i> Dashboard
            <span style="display: inline-block; background-color: #e74c3c; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; position: relative; top: -1px; margin-left: 5px;">Admin</span>
        </a>
    `;
    
    // Add admin link at the beginning of navbar
    navbarElement.prepend(adminLink);
    console.log('Admin link added to navbar');
}

// Logout function
function logout() {
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Redirect to home page or login page
            window.location.href = '/';
        } else {
            console.error('Logout failed:', data.message);
        }
    })
    .catch(error => {
        console.error('Error during logout:', error);
    });
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking user authentication...');
    updateUIForLoggedInUser();
    
    // Other initialization code...
}); 