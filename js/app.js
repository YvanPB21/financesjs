// ==================== App Entry Point ====================

// ==================== Utility Functions ====================

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toggleLoading(show) {
    const loader = document.getElementById('global-loader');
    if (loader) {
        if (show) loader.classList.remove('hidden');
        else loader.classList.add('hidden');
    }
}

function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts.map(Number);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d} ${months[m - 1]} ${y}`;
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 2) return dateStr;
    const [y, m, d] = parts.map(Number);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d} ${months[m - 1]}`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function refreshCurrentView() {
    if (currentView === 'dashboard') loadDashboard();
    else if (currentView === 'loans') loadLoans();
}

// ==================== Modal Helpers ====================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

function openAddModal() {
    if (currentView === 'loans') {
        openLoanModal();
    } else {
        openBudgetModal();
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.add('hidden');
    }
});

// ==================== Toast ====================

function showToast(message, icon = '✅') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toast-message').textContent = message;
    document.getElementById('toast-icon').textContent = icon;
    toast.classList.remove('hidden');
    const toastDiv = toast.querySelector('div');
    if (toastDiv) {
        toastDiv.className = 'px-4 py-3 rounded-xl bg-dark-800 border border-dark-700/50 shadow-xl text-sm font-medium text-white flex items-center gap-2 toast-show';
    }

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ==================== App Init ====================

function showScreen(screenId) {
    const loader = document.getElementById('loading-screen');
    if (loader) loader.classList.add('hidden');
    const appScreen = document.getElementById('app-screen');
    if (appScreen) appScreen.classList.remove('hidden');
}

async function initApp() {
    try {
        const security = await api.get('/settings/security');
        if (security.pinEnabled) {
            lockApp();
        }
    } catch (error) {
        console.error('Error al verificar seguridad:', error);
    }

    showScreen('app-screen');
    initRouter();
    refreshCurrentView();
}

// Initialize immediately
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});
