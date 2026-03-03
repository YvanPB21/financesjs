// ==================== Settings Module ====================

let pinMode = 'login'; // 'login', 'setup', 'change'
let currentPinInput = '';
let tempPin = ''; // Stores first entry during setup/change
let isLocked = false;

async function loadSettings() {
    try {
        const security = await api.get('/settings/security');
        const pinEnabledCheckbox = document.getElementById('settings-pin-enabled');
        const pinActions = document.getElementById('pin-actions');

        if (pinEnabledCheckbox) {
            pinEnabledCheckbox.checked = security.pinEnabled;
            if (pinActions) {
                pinActions.classList.toggle('hidden', !security.pinEnabled);
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function togglePinSettings() {
    const checkbox = document.getElementById('settings-pin-enabled');
    if (checkbox.checked) {
        openPinModal('setup');
    } else {
        openPinModal('disable');
    }
}

function openPinModal(mode) {
    pinMode = mode;
    currentPinInput = '';
    tempPin = '';
    updatePinDots();

    const modal = document.getElementById('modal-pin');
    const title = document.getElementById('pin-modal-title');
    const desc = document.getElementById('pin-modal-desc');
    const cancelBtn = document.getElementById('pin-cancel-btn');

    modal.classList.remove('hidden');

    if (mode === 'login') {
        title.textContent = 'Seguridad';
        desc.textContent = 'Ingresa tu PIN para continuar';
        cancelBtn.classList.add('hidden');
    } else if (mode === 'setup') {
        title.textContent = 'Configurar PIN';
        desc.textContent = 'Ingresa un nuevo PIN de 4 dígitos';
        cancelBtn.classList.remove('hidden');
    } else if (mode === 'change') {
        title.textContent = 'Cambiar PIN';
        desc.textContent = 'Ingresa tu PIN actual';
        cancelBtn.classList.remove('hidden');
    } else if (mode === 'disable') {
        title.textContent = 'Desactivar PIN';
        desc.textContent = 'Ingresa tu PIN actual para desactivar';
        cancelBtn.classList.remove('hidden');
    }
}

function handlePinInput(num) {
    if (currentPinInput.length < 4) {
        currentPinInput += num;
        updatePinDots();

        if (currentPinInput.length === 4) {
            setTimeout(processPin, 200);
        }
    }
}

function handlePinDelete() {
    currentPinInput = currentPinInput.slice(0, -1);
    updatePinDots();
}

function updatePinDots() {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) {
            dot.classList.toggle('bg-brand-500', currentPinInput.length >= i);
            dot.classList.toggle('bg-dark-700', currentPinInput.length < i);
        }
    }
}

async function processPin() {
    const desc = document.getElementById('pin-modal-desc');

    if (pinMode === 'login' || pinMode === 'disable' || (pinMode === 'change' && !tempPin)) {
        // Verify current PIN
        try {
            const result = await api.post('/settings/security/verify', { pin: currentPinInput });
            if (result.success) {
                if (pinMode === 'login') {
                    unlockApp();
                } else if (pinMode === 'disable') {
                    await api.post('/settings/security/setup', { enabled: false });
                    showToast('✅ PIN desactivado');
                    closeModal('modal-pin');
                    loadSettings();
                } else if (pinMode === 'change') {
                    tempPin = 'verified'; // Flag to indicate we verified current PIN
                    currentPinInput = '';
                    updatePinDots();
                    desc.textContent = 'Ingresa tu nuevo PIN';
                }
            } else {
                currentPinInput = '';
                updatePinDots();
                desc.textContent = '❌ PIN incorrecto, intenta de nuevo';
                desc.classList.add('text-red-400');
                setTimeout(() => desc.classList.remove('text-red-400'), 1000);
            }
        } catch (error) {
            showToast('❌ Error de conexión');
        }
    } else if (pinMode === 'setup' || (pinMode === 'change' && tempPin === 'verified')) {
        // First entry of new PIN
        tempPin = currentPinInput;
        currentPinInput = '';
        updatePinDots();
        desc.textContent = 'Confirma tu nuevo PIN';
    } else if (tempPin && tempPin !== 'verified') {
        // Confirmation entry
        if (currentPinInput === tempPin) {
            try {
                await api.post('/settings/security/setup', { pin: currentPinInput, enabled: true });
                showToast(pinMode === 'setup' ? '✅ PIN configurado' : '✅ PIN cambiado');
                closeModal('modal-pin');
                loadSettings();
            } catch (error) {
                showToast('❌ Error al guardar');
            }
        } else {
            currentPinInput = '';
            updatePinDots();
            desc.textContent = '❌ Los PIN no coinciden, intenta de nuevo';
            desc.classList.add('text-red-400');
            setTimeout(() => desc.classList.remove('text-red-400'), 1000);
            tempPin = (pinMode === 'change') ? 'verified' : ''; // Reset to first new PIN entry step
            desc.textContent = (pinMode === 'change') ? 'Ingresa tu nuevo PIN' : 'Ingresa un nuevo PIN de 4 dígitos';
        }
    }
}

function unlockApp() {
    isLocked = false;
    document.getElementById('modal-pin').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('invisible');
}

function lockApp() {
    isLocked = true;
    document.getElementById('app-screen').classList.add('invisible');
    openPinModal('login');
}
