// ==================== Router Module ====================

let currentView = 'dashboard';

const viewTitles = {
    dashboard: 'Balance General',
    loans: 'Préstamos',
    settings: 'Ajustes'
};

function navigateTo(view) {
    if (isLocked) return;
    if (view === currentView) return;

    currentView = view;
    window.location.hash = view;

    // Hide all views
    document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));

    // Show target view
    const targetView = document.getElementById(`view-${view}`);
    if (targetView) {
        targetView.classList.remove('hidden');
        // Re-trigger animation
        targetView.style.animation = 'none';
        targetView.offsetHeight; // Force reflow
        targetView.style.animation = '';
    }

    // Update page title
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = viewTitles[view] || 'Dashboard';

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === view);
    });

    // Refresh view data
    if (view === 'dashboard') loadDashboard();
    else if (view === 'loans') loadLoans();
    else if (view === 'settings') loadSettings();
}

function initRouter() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const validViews = ['dashboard', 'loans', 'settings'];
    const view = validViews.includes(hash) ? hash : 'dashboard';
    currentView = view;

    // Set initial state without animation
    document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`view-${view}`);
    if (targetView) targetView.classList.remove('hidden');

    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = viewTitles[view];

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === view);
    });
}

// Handle back button
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const validViews = ['dashboard', 'loans', 'settings'];
    if (validViews.includes(hash) && hash !== currentView) {
        navigateTo(hash);
    }
});
