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

        // Check for existing session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            console.log('✅ [SUPABASE] User authenticated:', currentUser.email);
        } else {
            console.log('ℹ️ [SUPABASE] No active session');
        }

        isSupabaseReady = true;

        // Trigger custom event so other scripts know Supabase is ready
        window.dispatchEvent(new CustomEvent('supabaseReady'));

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
 * Create anonymous user for migration phase
 * Uses Supabase's built-in anonymous authentication
 */
async function signInAnonymously() {
    try {
        await waitForSupabase();

        console.log('🔐 [SUPABASE] Signing in anonymously...');

        // Use Supabase's built-in anonymous authentication
        const { data, error } = await supabaseClient.auth.signInAnonymously();

        if (error) {
            throw error;
        }

        currentUser = data.user;
        console.log('✅ [SUPABASE] Authenticated successfully as anonymous user');
        console.log(`   User ID: ${currentUser.id}`);

        return currentUser;

    } catch (error) {
        console.error('❌ [SUPABASE] Authentication failed:', error);
        console.error('   Make sure anonymous sign-ins are enabled in Supabase dashboard');
        console.error('   Go to: Authentication → Settings → Allow anonymous sign-ins');
        return null;
    }
}

/**
 * Ensure user is authenticated before making requests
 */
async function ensureAuthenticated() {
    await waitForSupabase();

    if (!currentUser) {
        currentUser = await signInAnonymously();
    }
    return currentUser;
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
        console.log('✅ [SUPABASE] Signed out');
    } catch (error) {
        console.error('❌ [SUPABASE] Sign out failed:', error);
    }
}

// Log when script is loaded
console.log('📦 [SUPABASE] Client script loaded');
