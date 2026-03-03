// ==================== Loans Module (Enhanced) ====================

let allLoans = [];
let loanFilter = 'all';

function setLoanType(type) {
    document.getElementById('loan-type').value = type;
    document.getElementById('btn-loan-lent').classList.toggle('active', type === 'lent');
    document.getElementById('btn-loan-borrowed').classList.toggle('active', type === 'borrowed');
}

function filterLoans(filter) {
    loanFilter = filter;
    document.querySelectorAll('.loan-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-loan-filter') === filter);
    });
    renderLoans();
}

/**
 * Cálculos Financieros
 */
function calculateMonthlyPayment(principal, tea, n) {
    if (tea === 0) return principal / n;
    // Convierte TEA a TEM (Tasa Efectiva Mensual)
    // TEM = (1 + TEA)^(1/12) - 1
    const tem = Math.pow(1 + (tea / 100), 1 / 12) - 1;
    // Fórmula de anualidad (Cuota constante - Método Francés)
    // R = P * [i * (1 + i)^n] / [(1 + i)^n - 1]
    const payment = (principal * tem) / (1 - Math.pow(1 + tem, -n));
    return payment;
}

async function openLoanModal(loanId = null) {
    const modal = document.getElementById('modal-loan');
    const form = document.getElementById('loan-form');
    const title = document.getElementById('modal-loan-title');
    const deleteBtn = document.getElementById('loan-delete-btn');

    form.reset();
    document.getElementById('loan-id').value = '';
    document.getElementById('loan-date').value = getTodayString();
    setLoanType('lent');

    if (loanId) {
        const loan = allLoans.find(l => l.id === loanId);
        if (loan) {
            title.textContent = 'Editar Préstamo';
            document.getElementById('loan-id').value = loan.id;
            setLoanType(loan.type);
            document.getElementById('loan-person').value = loan.person;
            document.getElementById('loan-amount').value = loan.amount;
            document.getElementById('loan-tea').value = loan.tea;
            document.getElementById('loan-installments').value = loan.installmentsCount;
            document.getElementById('loan-date').value = loan.date;
            document.getElementById('loan-is-fixed').checked = loan.isFixedExpense || false;
            deleteBtn.classList.remove('hidden');
        }
    } else {
        title.textContent = 'Nuevo Préstamo';
        deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

async function saveLoan(event) {
    event.preventDefault();

    const id = document.getElementById('loan-id').value;
    const amount = parseFloat(document.getElementById('loan-amount').value);
    const tea = parseFloat(document.getElementById('loan-tea').value);
    const n = parseInt(document.getElementById('loan-installments').value);
    const date = document.getElementById('loan-date').value;

    const monthlyPayment = calculateMonthlyPayment(amount, tea, n);

    // Generar cuotas iniciales si es nuevo
    let installments = [];
    if (!id) {
        let currentDate = new Date(date + 'T00:00:00');
        for (let i = 1; i <= n; i++) {
            installments.push({
                number: i,
                dueDate: currentDate.toISOString().split('T')[0],
                amount: monthlyPayment,
                status: 'pending'
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    } else {
        // Al editar, podríamos querer recalcular o mantener las cuotas. 
        // Simplificamos: si cambia el monto/cuotas drásticamente, el backend o frontend debería decidir.
        // Aquí regeneramos si el usuario guarda, asumiendo que es un "reset".
        let currentDate = new Date(date + 'T00:00:00');
        for (let i = 1; i <= n; i++) {
            installments.push({
                number: i,
                dueDate: currentDate.toISOString().split('T')[0],
                amount: monthlyPayment,
                status: 'pending'
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }

    const data = {
        type: document.getElementById('loan-type').value,
        person: document.getElementById('loan-person').value.trim(),
        amount: amount,
        tea: tea,
        installmentsCount: n,
        monthlyPayment: monthlyPayment,
        date: date,
        installments: installments,
        isFixedExpense: document.getElementById('loan-is-fixed').checked,
        status: 'pending'
    };

    try {
        if (id) {
            await api.put('/loans', id, data);
            showToast('Préstamo actualizado', '✅');
        } else {
            await api.post('/loans', data);
            showToast('Préstamo registrado', '✅');
        }
        closeModal('modal-loan');
        loadLoans();
    } catch (error) {
        console.error('Error saving loan:', error);
        showToast('Error al guardar', '❌');
    }
}

async function deleteLoan() {
    const id = document.getElementById('loan-id').value;
    if (!id || !confirm('¿Eliminar este préstamo y todo su historial?')) return;

    try {
        await api.delete('/loans', id);
        showToast('Préstamo eliminado', '🗑️');
        closeModal('modal-loan');
        loadLoans();
    } catch (error) {
        console.error('Error deleting loan:', error);
        showToast('Error al eliminar', '❌');
    }
}

async function toggleInstallment(loanId, installmentIndex) {
    const loan = allLoans.find(l => l.id === loanId);
    if (!loan) return;

    const inst = loan.installments[installmentIndex];
    inst.status = inst.status === 'paid' ? 'pending' : 'paid';

    // Update loan overall status
    const paidCount = loan.installments.filter(i => i.status === 'paid').length;
    if (paidCount === loan.installments.length) loan.status = 'paid';
    else if (paidCount > 0) loan.status = 'partial';
    else loan.status = 'pending';

    try {
        await api.put('/loans', loanId, {
            installments: loan.installments,
            status: loan.status
        });
        showToast(inst.status === 'paid' ? 'Cuota pagada' : 'Pago revertido', '✅');
        loadLoans();
        // Refresh detail view
        openLoanDetail(loanId);
    } catch (error) {
        console.error('Error updating installment:', error);
    }
}

function openLoanDetail(loanId) {
    const loan = allLoans.find(l => l.id === loanId);
    if (!loan) return;

    const modal = document.getElementById('modal-loan-detail');
    const content = document.getElementById('loan-detail-content');

    const paidCount = loan.installments.filter(i => i.status === 'paid').length;
    const progress = (paidCount / loan.installmentsCount) * 100;

    content.innerHTML = `
        <div class="mb-6">
            <div class="flex justify-between items-end mb-2">
                <div>
                    <p class="text-dark-400 text-xs font-medium uppercase tracking-wider">${loan.type === 'lent' ? 'Presté a' : 'Me prestó'}</p>
                    <h4 class="text-xl font-bold text-white">${escapeHtml(loan.person)}</h4>
                </div>
                <div class="text-right">
                    <p class="text-xs text-dark-400">Cuota Mensual</p>
                    <p class="text-lg font-bold text-brand-400">S/ ${formatNumber(loan.monthlyPayment)}</p>
                </div>
            </div>
            
            <div class="bg-dark-800/50 rounded-2xl p-4 border border-dark-700/30 mb-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-dark-400 text-[10px] uppercase">Monto Inicial</p>
                        <p class="text-sm font-semibold text-white">S/ ${formatNumber(loan.amount)}</p>
                    </div>
                    <div>
                        <p class="text-dark-400 text-[10px] uppercase">TEA / Cuotas</p>
                        <p class="text-sm font-semibold text-white">${loan.tea}% / ${loan.installmentsCount}</p>
                    </div>
                </div>
                <div class="mt-4">
                    <div class="flex justify-between text-[10px] mb-1">
                        <span class="text-dark-400 uppercase font-medium">Progreso</span>
                        <span class="text-brand-400 font-bold">${paidCount}/${loan.installmentsCount} cuotas</span>
                    </div>
                    <div class="h-2 bg-dark-900 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>

            <h5 class="text-sm font-bold text-white mb-3">Cronograma de Pagos</h5>
            <div class="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                ${loan.installments.map((inst, idx) => `
                    <div class="flex items-center justify-between p-3 rounded-xl bg-dark-800/30 border ${inst.status === 'paid' ? 'border-brand-500/20 bg-brand-500/5' : 'border-dark-700/30'}">
                        <div>
                            <p class="text-xs font-bold ${inst.status === 'paid' ? 'text-brand-400' : 'text-white'}">Cuota ${inst.number}</p>
                            <p class="text-[10px] text-dark-500">${formatDateLabel(inst.dueDate)}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <p class="text-sm font-bold text-white">S/ ${formatNumber(inst.amount)}</p>
                            <button onclick="toggleInstallment('${loan.id}', ${idx})" 
                                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all ${inst.status === 'paid' ? 'bg-brand-500 text-white' : 'bg-dark-700 text-dark-400'}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <p class="text-xs text-dark-500 mt-4 text-center">Iniciado el ${formatDateLabel(loan.date)}</p>

            <button onclick="closeModal('modal-loan-detail'); openLoanModal('${loan.id}')" class="w-full mt-6 py-3 rounded-xl border border-dark-700 text-dark-300 text-xs font-bold hover:bg-dark-800 transition-all">
                Editar Datos del Préstamo
            </button>
        </div>
    `;

    modal.classList.remove('hidden');
}

function renderLoans() {
    const list = document.getElementById('loans-list');
    if (!list) return;

    const filtered = allLoans.filter(l => loanFilter === 'all' || l.type === loanFilter);

    if (filtered.length === 0) {
        list.innerHTML = `<div class="text-center py-12">
            <div class="w-16 h-16 bg-dark-800 rounded-2xl flex items-center justify-center mx-auto mb-4">🤝</div>
            <p class="text-dark-400 text-sm">No hay préstamos para mostrar</p>
        </div>`;
        return;
    }

    list.innerHTML = filtered.map(loan => {
        const paidCount = loan.installments.filter(i => i.status === 'paid').length;
        const totalCount = loan.installmentsCount;
        const progress = (paidCount / totalCount) * 100;

        return `
            <div onclick="openLoanDetail('${loan.id}')" class="glass-card p-4 rounded-2xl border border-dark-800/50 active:scale-[0.98] transition-all cursor-pointer">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-[10px] uppercase font-bold tracking-wider ${loan.type === 'lent' ? 'text-brand-400' : 'text-orange-400'}">
                            ${loan.type === 'lent' ? 'Préstamo Otorgado' : 'Préstamo Recibido'}
                        </p>
                        <h4 class="text-base font-bold text-white">${escapeHtml(loan.person)}</h4>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold text-white">S/ ${formatNumber(loan.amount)}</p>
                        <p class="text-[10px] text-dark-400">${loan.installmentsCount} cuotas de S/ ${formatNumber(loan.monthlyPayment)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex-1 h-1.5 bg-dark-900 rounded-full overflow-hidden">
                        <div class="h-full bg-brand-500" style="width: ${progress}%"></div>
                    </div>
                    <span class="text-[10px] font-bold text-dark-300 whitespace-nowrap">${paidCount}/${totalCount} pagadas</span>
                </div>
            </div>
        `;
    }).join('');
}

function updateLoanStats() {
    // Calculamos saldo pendiente (total de cuotas pendientes)
    const lentPending = allLoans
        .filter(l => l.type === 'lent')
        .reduce((sum, l) => {
            return sum + l.installments.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
        }, 0);

    const borrowedPending = allLoans
        .filter(l => l.type === 'borrowed')
        .reduce((sum, l) => {
            return sum + l.installments.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
        }, 0);

    const lentTotalEl = document.getElementById('lent-total');
    const borrowedTotalEl = document.getElementById('borrowed-total');

    if (lentTotalEl) lentTotalEl.textContent = `S/ ${formatNumber(lentPending)}`;
    if (borrowedTotalEl) borrowedTotalEl.textContent = `S/ ${formatNumber(borrowedPending)}`;
}

async function loadLoans() {
    try {
        allLoans = await api.get('/loans');
        renderLoans();
        updateLoanStats();
    } catch (error) {
        console.error('Error loading loans:', error);
    }
}
