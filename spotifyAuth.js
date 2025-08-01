// Simple function to check if we have a valid token
function hasValidToken() {
    const token = localStorage.getItem('spotify_access_token');
    console.log('Checking token:', token ? 'Token exists' : 'No token found');
    return token && token.length > 0;
}

// Get URL parameter
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Get the current base URL (works for both local and production)
function getBaseURL() {
    return window.location.origin;
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code) {
    try {
        console.log('Exchanging authorization code for token...');
        const response = await fetch(`${getBaseURL()}/callback?code=${code}&fetch=true`); // Add fetch parameter
        
        console.log(`Token exchange response status: ${response.status}`);
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
                if (errorData.details) {
                    console.error('Error details:', errorData.details);
                }
            } catch (e) {
                console.error('Could not parse error response as JSON');
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json(); // wait for json response containing the token
        console.log('Token exchange response received');
        
        if (data.access_token) {
            console.log('Storing access token in localStorage');
            localStorage.setItem('spotify_access_token', data.access_token); // store token
            console.log('Token stored successfully');
            return data.access_token;
        } else {
            console.error('No access token in response:', data);
            throw new Error('No access token in response');
        }
    } catch (error) {
        console.error('Token exchange failed:', error);
        throw error;
    }
}

// Get Spotify configuration from backend
async function getSpotifyConfig() {
    try {
        console.log('Fetching Spotify configuration...');
        const response = await fetch(`${getBaseURL()}/spotify_config`);
        
        console.log(`Spotify config response status: ${response.status}`);
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
                console.error('Config error details:', errorData.details);
            } catch (e) {
                console.error('Could not parse config error response as JSON');
            }
            throw new Error(errorMessage);
        }
        
        const config = await response.json();
        console.log('Spotify configuration received:', { 
            client_id: config.client_id ? config.client_id.substring(0, 10) + '...' : 'missing',
            redirect_uri: config.redirect_uri 
        });
        return config;
    } catch (error) {
        console.error('Failed to get Spotify config:', error);
        throw error;
    }
}

// Main login function - make it global so HTML onclick can find it
window.loginWithSpotify = async function() {
    
    // If we already have a token, go to universe - happens when button is clicked after login
    if (hasValidToken()) {
        window.location.href = '/universe'; // Use Flask route instead of universe.html
        return;
    }
    
    // No token, start OAuth flow
    console.log('Starting Spotify authorization');
    
    try {
        // Get configuration from backend
        const config = await getSpotifyConfig();
        
        const authURL = 'https://accounts.spotify.com/authorize' +
            `?client_id=${config.client_id}` +
            '&response_type=code' +
            `&redirect_uri=${encodeURIComponent(config.redirect_uri)}` +
            '&scope=user-top-read';
       
        window.location.href = authURL; // Redirect to Spotify for authorization
    } catch (error) {
        console.error('Failed to start login process:', error);
        alert('Failed to start login process. Please try again.');
    }
}

// Logout function
function logoutSpotifyUser() {
    localStorage.removeItem('spotify_access_token');
    // Clean up URL if it has a code
    if (window.location.search.includes('code=')) {
        const url = new URL(window.location);
        url.searchParams.delete('code');
        window.history.replaceState({}, document.title, url.pathname);
    }
    // Reset button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.textContent = 'Log in';
    // Hide user info
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.style.display = 'none';
    console.log('Logged out successfully');
}

// Initialize page
window.onload = function() {
    console.log('Page loaded');
    
    const loginBtn = document.getElementById('login-btn');
    const logoutLink = document.getElementById('logout-link');
    const userInfo = document.getElementById('user-info');
    
    const code = getQueryParam('code'); // Try to get the code from URL
    
    // For if we just came back from Spotify with a code - handle it automatically
    if (code && !hasValidToken()) {
        
        if (loginBtn) loginBtn.textContent = 'Getting your data...';
        
        // Get the token
        exchangeCodeForToken(code)
            .then(() => {
                console.log('Token exchange successful, redirecting to universe page');
                // Clean up URL immediately
                const url = new URL(window.location);
                url.searchParams.delete('code');
                url.searchParams.delete('state'); // Also remove state if present
                window.history.replaceState({}, document.title, url.toString());
                // Automatically redirect to universe page after successful authentication
                console.log('Redirecting to /universe');
                window.location.href = '/universe';
            })
            .catch(error => {
                console.error('Auto token exchange failed:', error);
                if (loginBtn) loginBtn.textContent = 'Login failed - try again';
                // Clear any stale data and reset - also clean URL
                localStorage.removeItem('spotify_access_token');
                const url = new URL(window.location);
                url.searchParams.delete('code');
                url.searchParams.delete('state');
                window.history.replaceState({}, document.title, url.toString());
            });
    } else {
        // Clean up URL if we already have a token but there's still a code in the URL
        if (code && hasValidToken()) {
            console.log('Already have token, cleaning up URL');
            const url = new URL(window.location);
            url.searchParams.delete('code');
            url.searchParams.delete('state');
            window.history.replaceState({}, document.title, url.toString());
        }
        
        // Set up login button for normal cases
        if (loginBtn) {
            // Don't assign onclick here since HTML already has it
            // loginBtn.onclick = loginWithSpotify;
            // Set initial button text
            if (hasValidToken()) {
                loginBtn.textContent = 'explore your spotify universe';
                if (userInfo) userInfo.style.display = 'block';
            } else {
                loginBtn.textContent = 'Log in';
                if (userInfo) userInfo.style.display = 'none';
            }
        }
    }
    
    // Set up logout link
    if (logoutLink) {
        logoutLink.onclick = function(e) {
            e.preventDefault();
            logoutSpotifyUser();
        };
    }
    
    console.log('Auth system initialized');
};

console.log('spotifyAuth.js loaded');