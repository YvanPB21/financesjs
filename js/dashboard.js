// ==================== Dashboard Module (Budget) ====================

let currentBudget = { netIncome: 0, fixedExpenses: [] };

async function loadDashboard() {
    try {
        currentBudget = await api.get('/budget');
        renderDashboard();
    } catch (error) {
        console.error('Error loading budget:', error);
    }
}

function renderDashboard() {
    const incomeAmountEl = document.getElementById('income-amount');
    const expenseAmountEl = document.getElementById('expense-amount');
    const balanceAmountEl = document.getElementById('balance-amount');
    const fixedListEl = document.getElementById('fixed-expenses-list');

    // Gastos fijos definidos manualmente
    const manualFixed = currentBudget.fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Sumar cuotas de préstamos marcados como gasto fijo
    const loanFixed = (allLoans || [])
        .filter(l => l.isFixedExpense === true && l.status !== 'paid')
        .reduce((sum, l) => sum + l.monthlyPayment, 0);

    const totalFixed = manualFixed + loanFixed;
    const balance = currentBudget.netIncome - totalFixed;

    if (incomeAmountEl) incomeAmountEl.textContent = `S/ ${formatNumber(currentBudget.netIncome)}`;
    if (expenseAmountEl) expenseAmountEl.textContent = `S/ ${formatNumber(totalFixed)}`;
    if (balanceAmountEl) {
        balanceAmountEl.textContent = `S/ ${formatNumber(balance)}`;
        balanceAmountEl.className = `text-3xl font-bold mb-4 ${balance >= 0 ? 'text-white' : 'text-red-400'}`;
    }

    // Render fixed expenses list
    if (fixedListEl) {
        let listHtml = '';

        // Manual expenses
        listHtml += currentBudget.fixedExpenses.map(exp => `
            <div class="glass-card flex items-center justify-between p-3 rounded-xl border border-dark-800/50">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center text-xs">📌</div>
                    <div>
                        <p class="text-sm font-medium text-white">${escapeHtml(exp.name)}</p>
                    </div>
                </div>
                <p class="text-sm font-semibold text-red-400">- S/ ${formatNumber(exp.amount)}</p>
            </div>
        `).join('');

        // Loan expenses
        const activeLoanFixed = (allLoans || []).filter(l => l.isFixedExpense === true && l.status !== 'paid');
        listHtml += activeLoanFixed.map(loan => `
            <div class="glass-card flex items-center justify-between p-3 rounded-xl border border-dark-800/50">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-xs">💰</div>
                    <div>
                        <p class="text-sm font-medium text-white">Préstamo: ${escapeHtml(loan.person)}</p>
                        <p class="text-[10px] text-dark-400">Cuota automática</p>
                    </div>
                </div>
                <p class="text-sm font-semibold text-red-400">- S/ ${formatNumber(loan.monthlyPayment)}</p>
            </div>
        `).join('');

        if (listHtml === '') {
            fixedListEl.innerHTML = '<div class="text-center py-8 text-dark-500 text-sm">No has configurado gastos todavía</div>';
        } else {
            fixedListEl.innerHTML = listHtml;
        }
    }
}

function openBudgetModal() {
    const modal = document.getElementById('modal-budget');
    const incomeInput = document.getElementById('budget-net-income');
    const container = document.getElementById('budget-expenses-container');

    incomeInput.value = currentBudget.netIncome;
    container.innerHTML = '';

    currentBudget.fixedExpenses.forEach(exp => addFixedExpenseRow(exp.name, exp.amount));
    if (currentBudget.fixedExpenses.length === 0) addFixedExpenseRow();

    modal.classList.remove('hidden');
}

function addFixedExpenseRow(name = '', amount = '') {
    const container = document.getElementById('budget-expenses-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center budget-expense-row';
    div.innerHTML = `
        <input type="text" placeholder="Gasto (ej: Alquiler)" value="${name}" required
            class="flex-1 px-3 py-2 rounded-lg bg-dark-900 border border-dark-700/50 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all">
        <input type="number" placeholder="Monto" value="${amount}" step="0.01" required
            class="w-24 px-3 py-2 rounded-lg bg-dark-900 border border-dark-700/50 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all">
        <button type="button" onclick="this.parentElement.remove()" class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2"/></svg>
        </button>
    `;
    container.appendChild(div);
}

async function saveBudget(event) {
    event.preventDefault();
    const income = parseFloat(document.getElementById('budget-net-income').value);

    const rows = document.querySelectorAll('.budget-expense-row');
    const fixedExpenses = Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        return {
            name: inputs[0].value.trim(),
            amount: parseFloat(inputs[1].value)
        };
    }).filter(exp => exp.name && !isNaN(exp.amount));

    try {
        await api.post('/budget', { netIncome: income, fixedExpenses });
        showToast('Presupuesto guardado', '✅');
        closeModal('modal-budget');
        loadDashboard();
    } catch (error) {
        console.error('Error saving budget:', error);
        showToast('Error al guardar', '❌');
    }
}
