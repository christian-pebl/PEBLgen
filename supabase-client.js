// supabase-client.js
// Supabase client configuration for PEBLGen

// ⚠️ IMPORTANT: Replace these values with your actual credentials from Supabase Dashboard
// Go to Settings → API to find these values
const SUPABASE_URL = 'https://gamsynrzeixorftnivps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbXN5bnJ6ZWl4b3JmdG5pdnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDU0NTgsImV4cCI6MjA3Njg4MTQ1OH0.nSqM5zF7JD7wfB4yYCk_N2a0NwsyZPRv4lQoiASD2XA';

// Load Supabase client library from CDN
const supabaseScript = document.createElement('script');
supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
supabaseScript.onload = initSupabase;
document.head.appendChild(supabaseScript);

let supabaseClient = null;
let currentUser = null;
let isSupabaseReady = false;

/**
 * Initialize Supabase client
 */
async function initSupabase() {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ [SUPABASE] Client initialized');

        // Set up authentication state listener
        setupAuthListener();

        // Check for existing session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            currentUser = session.user;
            console.log('✅ [AUTH] User authenticated:', currentUser.email);
        } else {
            console.log('ℹ️ [AUTH] No active session');
        }

        isSupabaseReady = true;

        // Expose to window for other scripts
        window.currentUser = currentUser;
        window.supabaseClient = supabaseClient;

        // Trigger custom event so other scripts know Supabase is ready
        window.dispatchEvent(new CustomEvent('supabaseReady', { detail: { user: currentUser } }));

    } catch (error) {
        console.error('❌ [SUPABASE] Initialization failed:', error);
        isSupabaseReady = false;
    }
}

/**
 * Wait for Supabase to be ready
 */
function waitForSupabase() {
    return new Promise((resolve) => {
        if (isSupabaseReady) {
            resolve();
        } else {
            window.addEventListener('supabaseReady', resolve, { once: true });
        }
    });
}

/**
 * Ensure user is authenticated with email/password
 * Redirects to login page if not authenticated
 */
async function ensureAuthenticated() {
    await waitForSupabase();

    // Check if we have a valid session
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error || !session || !session.user) {
        console.warn('⚠️ [AUTH] Not authenticated. Redirecting to login...');

        // Save current page to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);

        // Redirect to login page
        window.location.href = 'login.html';
        return null;
    }

    currentUser = session.user;
    window.currentUser = currentUser;

    console.log('✅ [AUTH] User authenticated:', currentUser.email);
    return currentUser;
}

/**
 * Check authentication status without redirecting
 * Returns user object if authenticated, null otherwise
 */
async function checkAuthStatus() {
    await waitForSupabase();

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session && session.user) {
        currentUser = session.user;
        window.currentUser = currentUser;
        return currentUser;
    }

    return null;
}

/**
 * Check if Supabase is available and working
 */
async function testSupabaseConnection() {
    try {
        await ensureAuthenticated();

        // Try a simple query
        const { data, error } = await supabaseClient
            .from('projects')
            .select('count');

        if (error) throw error;

        console.log('✅ [SUPABASE] Connection test passed');
        return true;

    } catch (error) {
        console.error('❌ [SUPABASE] Connection test failed:', error);
        return false;
    }
}

/**
 * Sign out current user
 */
async function signOut() {
    try {
        await supabaseClient.auth.signOut();
        currentUser = null;
        window.currentUser = null;
        console.log('✅ [AUTH] Signed out successfully');

        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('❌ [AUTH] Sign out failed:', error);
        throw error;
    }
}

/**
 * Listen for authentication state changes
 */
function setupAuthListener() {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log(`🔐 [AUTH] State changed: ${event}`);

        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            window.currentUser = currentUser;
            console.log('✅ [AUTH] User signed in:', currentUser.email);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            window.currentUser = null;
            console.log('ℹ️ [AUTH] User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
            currentUser = session.user;
            window.currentUser = currentUser;
            console.log('🔄 [AUTH] Session refreshed');
        }
    });
}

// Log when script is loaded
console.log('📦 [SUPABASE] Client script loaded');
