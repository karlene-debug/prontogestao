// ============================================================
// APP.JS - ProntoGestão - Gestão Financeira Familiar
// ============================================================

(function () {
    'use strict';

    // --- Storage Keys ---
    const KEYS = {
        members: 'pg_members',
        incomes: 'pg_incomes',
        expenses: 'pg_expenses',
        customCategories: 'pg_custom_categories',
        budgets: 'pg_budgets',
        cards: 'pg_cards',
    };

    function getCards() { return load(KEYS.cards); }

    // --- State ---
    let state = {
        currentPage: 'dashboard',
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        memberFilter: 'all',
        editingId: null,
        editingType: null,
        sort: {}, // { tableName: { field: 'date', dir: 'asc' } }
        selectedExpenses: new Set(),
        selectedIncomes: new Set(),
    };

    // --- Helpers ---
    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
    function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    function currency(v) {
        const n = Number(v) || 0;
        return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    function pct(part, total) { return total === 0 ? 0 : Math.round((part / total) * 100); }
    // --- Toast Notification ---
    function toast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const icons = { success: '\u2713', error: '\u2717', info: '\u2139' };
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, 3200);
    }

    function parseValue(input) {
        if (!input) return 0;
        const cleaned = String(input).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    }

    // --- Sorting ---
    function sortItems(items, tableName, defaultField) {
        const s = state.sort[tableName];
        if (!s) return items;
        const field = s.field;
        const dir = s.dir === 'asc' ? 1 : -1;
        return [...items].sort((a, b) => {
            let va = a[field], vb = b[field];
            if (field === 'value') { va = Number(va) || 0; vb = Number(vb) || 0; return (va - vb) * dir; }
            if (field === 'date') { return ((va || '') > (vb || '') ? 1 : -1) * dir; }
            va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase();
            return va.localeCompare(vb) * dir;
        });
    }

    function sortHeader(tableName, field, label) {
        const s = state.sort[tableName];
        const isActive = s && s.field === field;
        const arrow = isActive ? (s.dir === 'asc' ? ' &#9650;' : ' &#9660;') : ' <span style="opacity:0.3">&#9650;</span>';
        return `<th class="sortable" onclick="App.toggleSort('${tableName}','${field}')">${label}${arrow}</th>`;
    }
    function getCustomCategories() { return load(KEYS.customCategories); }
    function getAllCategories() { return [...CATEGORIES, ...getCustomCategories()]; }

    function dateStr(d) {
        if (!d) return '';
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('pt-BR');
    }

    // --- Data Access ---
    function getMembers() {
        const m = load(KEYS.members);
        if (m.length === 0) {
            const defaults = [
                { id: uid(), name: 'Pessoa 1', color: '#3B82F6', role: 'Titular' },
                { id: uid(), name: 'Pessoa 2', color: '#8B5CF6', role: 'Cônjuge' },
            ];
            save(KEYS.members, defaults);
            return defaults;
        }
        return m;
    }

    function getIncomes() { return load(KEYS.incomes); }
    function getExpenses() { return load(KEYS.expenses); }
    function getBudgets() { return load(KEYS.budgets); }

    function filterByMonth(items, dateField) {
        return items.filter(i => {
            const d = new Date(i[dateField] + 'T00:00:00');
            return d.getMonth() === state.currentMonth && d.getFullYear() === state.currentYear;
        });
    }

    function filterByMember(items) {
        if (state.memberFilter === 'all') return items;
        return items.filter(i => i.memberId === state.memberFilter);
    }

    // --- DOM References ---
    const $ = id => document.getElementById(id);
    const sidebar = $('sidebar');
    const navBtns = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const memberFilterSelect = $('memberFilter');

    // --- Navigation ---
    function navigate(page) {
        state.currentPage = page;
        pages.forEach(p => p.classList.remove('active'));
        $('page-' + page).classList.add('active');
        navBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.page === page);
        });
        closeSidebar();
        renderCurrentPage();
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.page));
    });

    // --- Sidebar Toggle (Mobile) ---
    const sidebarOverlay = $('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    }

    $('sidebarToggle').addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    $('mobileMenuBtn').addEventListener('click', openSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // --- Month Navigation ---
    const SHORT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    function updateMonthDisplay() {
        const label = MONTH_NAMES[state.currentMonth] + ' ' + state.currentYear;
        $('currentMonth').textContent = label;
        const mobileEl = $('currentMonthMobile');
        if (mobileEl) mobileEl.textContent = SHORT_MONTHS[state.currentMonth] + ' ' + state.currentYear;
        // Page-level month labels
        const incLabel = $('monthLabelInc');
        const expLabel = $('monthLabelExp');
        if (incLabel) incLabel.textContent = label;
        if (expLabel) expLabel.textContent = label;
    }

    function prevMonth() {
        state.currentMonth--;
        if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
        updateMonthDisplay();
        renderCurrentPage();
    }

    function nextMonth() {
        state.currentMonth++;
        if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
        updateMonthDisplay();
        renderCurrentPage();
    }

    $('prevMonth').addEventListener('click', prevMonth);
    $('nextMonth').addEventListener('click', nextMonth);
    if ($('prevMonthInc')) $('prevMonthInc').addEventListener('click', prevMonth);
    if ($('nextMonthInc')) $('nextMonthInc').addEventListener('click', nextMonth);
    if ($('prevMonthExp')) $('prevMonthExp').addEventListener('click', prevMonth);
    if ($('nextMonthExp')) $('nextMonthExp').addEventListener('click', nextMonth);
    $('prevMonthMobile').addEventListener('click', prevMonth);
    $('nextMonthMobile').addEventListener('click', nextMonth);

    // --- Member Filter ---
    function populateMemberFilter() {
        const members = getMembers();
        memberFilterSelect.innerHTML = '<option value="all">Família (Todos)</option>';
        members.forEach(m => {
            memberFilterSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
        });
    }

    memberFilterSelect.addEventListener('change', () => {
        state.memberFilter = memberFilterSelect.value;
        renderCurrentPage();
    });

    // --- Render Current Page ---
    function renderCurrentPage() {
        switch (state.currentPage) {
            case 'dashboard': renderDashboard(); break;
            case 'entradas': renderEntradas(); break;
            case 'saidas': renderSaidas(); break;
            case 'orcamento': renderOrcamento(); break;
            case 'fluxo': renderFluxo(); break;
            case 'membros': renderMembros(); break;
            case 'planejamento': renderPlanejamento(); break;
            case 'configuracoes': renderConfiguracoes(); break;
        }
    }

    // ============================================================
    // DASHBOARD
    // ============================================================
    function renderDashboard() {
        const incomes = filterByMember(filterByMonth(getIncomes(), 'date'));
        const expenses = filterByMember(filterByMonth(getExpenses(), 'date'));
        const members = getMembers();

        const totalIn = incomes.reduce((s, i) => s + Number(i.value), 0);
        const totalOut = expenses.reduce((s, e) => s + Number(e.value), 0);
        const balance = totalIn - totalOut;

        $('totalIncome').textContent = currency(totalIn);
        $('totalExpense').textContent = currency(totalOut);

        const balEl = $('totalBalance');
        balEl.textContent = currency(balance);
        balEl.className = 'card-value ' + (balance >= 0 ? 'positive' : 'negative');

        const paidCount = incomes.filter(i => i.status === 'Pg').length;
        $('incomeStatus').textContent = paidCount + ' de ' + incomes.length + ' recebidos';
        $('expenseCount').textContent = expenses.length + ' lançamentos';
        $('balancePercent').textContent = totalIn > 0 ? pct(totalOut, totalIn) + '% da receita gasta' : '--';

        const memberLabel = state.memberFilter === 'all' ? 'Família' : (members.find(m => m.id === state.memberFilter)?.name || 'Família');
        $('dashMember').textContent = memberLabel;

        // Regra 50/30/20
        const byCondition = { 'Necessidade': 0, 'Desejo': 0, 'Financeiro': 0, 'Dívidas': 0 };
        expenses.forEach(e => {
            const cat = getAllCategories().find(c => c.name === e.category);
            if (cat) byCondition[cat.condition] = (byCondition[cat.condition] || 0) + Number(e.value);
        });

        const condItems = [
            { key: 'Necessidade', bar: 'ruleNeedBar', pctEl: 'ruleNeedPct', target: 50 },
            { key: 'Desejo', bar: 'ruleWantBar', pctEl: 'ruleWantPct', target: 30 },
            { key: 'Financeiro', bar: 'ruleFinBar', pctEl: 'ruleFinPct', target: 20 },
            { key: 'Dívidas', bar: 'ruleDebtBar', pctEl: 'ruleDebtPct', target: 0 },
        ];
        condItems.forEach(ci => {
            const base = totalIn > 0 ? totalIn : totalOut;
            const p = base > 0 ? pct(byCondition[ci.key], base) : 0;
            const overBudget = ci.target > 0 && p > ci.target;
            $(ci.pctEl).textContent = p + '%';
            $(ci.pctEl).style.color = overBudget ? 'var(--expense)' : '';
            $(ci.bar).style.width = Math.min(p, 100) + '%';
            if (overBudget) $(ci.bar).style.opacity = '0.85';
            else $(ci.bar).style.opacity = '1';
        });

        // Gastos por Grupo
        const byGroup = {};
        expenses.forEach(e => {
            const cat = getAllCategories().find(c => c.name === e.category);
            const g = cat ? cat.group : 'Outros';
            byGroup[g] = (byGroup[g] || 0) + Number(e.value);
        });
        const maxGroup = Math.max(...Object.values(byGroup), 1);
        const sortedGroups = Object.entries(byGroup).sort((a, b) => b[1] - a[1]);

        $('groupChart').innerHTML = sortedGroups.map(([g, v]) => `
            <div class="group-bar-item">
                <span class="group-bar-label">${g}</span>
                <div class="group-bar-track">
                    <div class="group-bar-fill" style="width:${pct(v, maxGroup)}%;background:${GROUP_COLORS[g] || 'var(--text-muted)'}"></div>
                </div>
                <span class="group-bar-value">${currency(v)}</span>
            </div>
        `).join('');

        // Forma de Pagamento
        const byPayment = {};
        expenses.forEach(e => {
            const t = e.paymentType || 'Outros';
            byPayment[t] = (byPayment[t] || 0) + Number(e.value);
        });

        $('paymentChart').innerHTML = Object.entries(byPayment).sort((a, b) => b[1] - a[1]).map(([t, v]) => `
            <div class="payment-item">
                <span class="pay-label">${t}</span>
                <span class="pay-value">${currency(v)}</span>
                <span class="pay-pct">${pct(v, totalOut)}%</span>
            </div>
        `).join('') || '<div class="empty-state" style="padding:24px"><div class="empty-state-icon" style="font-size:24px">—</div><div class="empty-state-desc">Sem dados neste mês</div></div>';

        // Top 10 Gastos
        const sorted = [...expenses].sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 10);
        $('topExpenses').innerHTML = sorted.map((e, i) => `
            <div class="top-expense-item">
                <span class="top-rank">${i + 1}</span>
                <span class="top-desc">${e.description || '-'}</span>
                <span class="top-cat">${e.category || ''}</span>
                <span class="top-val">${currency(e.value)}</span>
            </div>
        `).join('') || '<div class="empty-state" style="padding:24px"><div class="empty-state-icon" style="font-size:24px">—</div><div class="empty-state-desc">Sem dados neste mês</div></div>';

        // Evolução Mensal (últimos 6 meses)
        renderEvolution();
    }

    function renderEvolution() {
        const allIncomes = filterByMember(getIncomes());
        const allExpenses = filterByMember(getExpenses());
        const months = [];

        for (let i = 5; i >= 0; i--) {
            let m = state.currentMonth - i;
            let y = state.currentYear;
            while (m < 0) { m += 12; y--; }
            months.push({ month: m, year: y });
        }

        const data = months.map(({ month, year }) => {
            const inc = allIncomes.filter(i => {
                const d = new Date(i.date + 'T00:00:00');
                return d.getMonth() === month && d.getFullYear() === year;
            }).reduce((s, i) => s + Number(i.value), 0);

            const exp = allExpenses.filter(e => {
                const d = new Date(e.date + 'T00:00:00');
                return d.getMonth() === month && d.getFullYear() === year;
            }).reduce((s, e) => s + Number(e.value), 0);

            return { month, year, income: inc, expense: exp };
        });

        const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);

        $('evolutionChart').innerHTML = data.map(d => {
            const incH = Math.round((d.income / maxVal) * 120);
            const expH = Math.round((d.expense / maxVal) * 120);
            return `<div class="evo-col">
                <div class="evo-bars">
                    <div class="evo-bar income-bar" style="height:${incH}px" title="Receita: ${currency(d.income)}"></div>
                    <div class="evo-bar expense-bar" style="height:${expH}px" title="Despesa: ${currency(d.expense)}"></div>
                </div>
                <span class="evo-month-label">${SHORT_MONTHS[d.month]}/${String(d.year).slice(2)}</span>
                <span class="evo-values" style="color:var(--income)">${d.income > 0 ? (d.income/1000).toFixed(1)+'k' : '-'}</span>
                <span class="evo-values" style="color:var(--expense)">${d.expense > 0 ? (d.expense/1000).toFixed(1)+'k' : '-'}</span>
            </div>`;
        }).join('');
    }

    // ============================================================
    // ENTRADAS
    // ============================================================
    function renderEntradas() {
        let incomes = filterByMember(filterByMonth(getIncomes(), 'date'));
        const members = getMembers();

        // Populate filters
        const cats = [...new Set(getIncomes().map(i => i.category).filter(Boolean))];
        const banks = [...new Set(getIncomes().map(i => i.bank).filter(Boolean))];
        const memberNames = members.map(m => m.name);
        populateSelect($('filterIncCat'), cats, 'Todas as Categorias');
        populateSelect($('filterIncBank'), banks, 'Todos os Bancos');
        if ($('filterIncMember')) populateSelect($('filterIncMember'), memberNames, 'Todos os Membros');

        // Apply filters
        const catF = $('filterIncCat').value;
        const bankF = $('filterIncBank').value;
        const typeF = $('filterIncType').value;
        const statusIF = $('filterIncStatus').value;
        const memberF = $('filterIncMember') ? $('filterIncMember').value : 'all';
        const searchTerm = ($('searchIncome').value || '').toLowerCase().trim();
        if (memberF !== 'all') {
            const mem = members.find(m => m.name === memberF);
            if (mem) incomes = incomes.filter(i => i.memberId === mem.id);
        }
        if (catF !== 'all') incomes = incomes.filter(i => i.category === catF);
        if (bankF !== 'all') incomes = incomes.filter(i => i.bank === bankF);
        if (typeF !== 'all') incomes = incomes.filter(i => (i.recurrenceType || 'avulsa') === typeF);
        if (statusIF === 'pending') incomes = incomes.filter(i => i.status !== 'Pg');
        if (statusIF === 'paid') incomes = incomes.filter(i => i.status === 'Pg');
        if (searchTerm) incomes = incomes.filter(i =>
            (i.source || '').toLowerCase().includes(searchTerm) ||
            (i.category || '').toLowerCase().includes(searchTerm) ||
            (i.bank || '').toLowerCase().includes(searchTerm)
        );

        // Sort
        incomes = sortItems(incomes, 'incomes', 'date');

        const total = incomes.reduce((s, i) => s + Number(i.value), 0);
        const received = incomes.filter(i => i.status === 'Pg').reduce((s, i) => s + Number(i.value), 0);
        const pending = total - received;

        // Sortable headers
        $('incomeHead').innerHTML = `<tr>
            <th style="width:30px"><input type="checkbox" class="exp-checkbox" id="selectAllIncHead" onchange="App.toggleSelectAllInc(this.checked)"></th>
            ${sortHeader('incomes', 'date', 'Data')}
            ${sortHeader('incomes', 'bank', 'Banco')}
            ${sortHeader('incomes', 'value', 'Valor')}
            ${sortHeader('incomes', 'category', 'Categoria')}
            ${sortHeader('incomes', 'source', 'Fonte')}
            ${sortHeader('incomes', 'recurrenceType', 'Tipo')}
            <th class="actions-header">Ações</th>
        </tr>`;

        $('incomeTable').innerHTML = incomes.map(i => {
            const member = members.find(m => m.id === i.memberId);
            const typeLabel = i.recurrenceType === 'recorrente' ? '<span class="rec-badge recorrente">Recorrente</span>'
                : i.recurrenceType === 'parcelada' ? `<span class="rec-badge parcelada">${i.installmentLabel || 'Parcelada'}</span>`
                : '<span class="rec-badge avulsa">Avulsa</span>';
            const checked = state.selectedIncomes && state.selectedIncomes.has(i.id) ? 'checked' : '';
            return `<tr class="${i.status === 'Pg' ? 'row-paid' : ''}">
                <td><input type="checkbox" class="exp-checkbox inc-row-check" data-id="${i.id}" ${checked} onchange="App.updateBulkCountInc()"></td>
                <td>${dateStr(i.date)}</td>
                <td>${i.bank || '-'}</td>
                <td style="font-weight:600;color:var(--income)">${currency(i.value)}</td>
                <td>${i.category || '-'}</td>
                <td>${i.source || '-'}</td>
                <td>${typeLabel}</td>
                <td class="actions-cell">
                    <button class="btn-status ${i.status === 'Pg' ? 'confirmed' : ''}" onclick="App.toggleIncomeStatus('${i.id}')">
                        ${i.status === 'Pg' ? '&#10003; Recebido' : '&#9711; Receber'}
                    </button>
                    <button class="btn-action edit" onclick="App.editIncome('${i.id}')">Editar</button>
                    <button class="btn-action danger" onclick="App.deleteIncome('${i.id}')">Excluir</button>
                </td>
            </tr>`;
        }).join('') || `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">\u{1F4B0}</div><div class="empty-state-title">Nenhuma entrada neste mês</div><div class="empty-state-desc">Adicione suas receitas clicando em "+ Nova Entrada"</div></div></td></tr>`;

        // Summary cards
        $('incTotalCard').textContent = currency(total);
        $('incReceivedCard').textContent = currency(received);
        $('incPendingCard').textContent = currency(pending);

        // Mobile cards view
        renderMobileCards('income', incomes);
    }

    function renderMobileCards(type, items) {
        const containerId = type === 'income' ? 'mobileIncomeCards' : 'mobileExpenseCards';
        const container = $(containerId);
        if (!container) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const overdue = [];
        const thisWeek = [];
        const pending = [];
        const done = [];

        items.forEach(item => {
            const isPaid = item.status === 'Pg';
            if (isPaid) { done.push(item); return; }
            const d = new Date(item.date + 'T00:00:00');
            if (d < today) { overdue.push(item); }
            else if (d <= weekEnd) { thisWeek.push(item); }
            else { pending.push(item); }
        });

        const isIncome = type === 'income';
        const actionLabel = isIncome ? 'Receber' : 'Pagar';
        const doneLabel = isIncome ? 'Recebido' : 'Pago';
        const toggleFn = isIncome ? 'toggleIncomeStatus' : 'toggleExpenseStatus';
        const valueColor = isIncome ? 'var(--income)' : 'var(--expense)';

        function renderGroup(label, groupItems, cssClass, open) {
            if (groupItems.length === 0) return '';
            const total = groupItems.reduce((s, i) => s + Number(i.value), 0);
            return `<div class="status-group ${cssClass}">
                <div class="status-group-header${open ? ' open' : ''}" onclick="this.classList.toggle('open')">
                    <div class="status-group-left">
                        <span class="status-group-label">${label}</span>
                        <span class="status-group-count">${groupItems.length} ${groupItems.length === 1 ? 'item' : 'itens'}</span>
                    </div>
                    <div class="status-group-right">
                        <span class="status-group-value">${currency(total)}</span>
                        <span class="status-group-arrow">&#9660;</span>
                    </div>
                </div>
                <div class="status-group-items">
                    ${groupItems.map(item => {
                        const desc = isIncome ? (item.source || item.category || '-') : (item.description || item.category || '-');
                        const isPaid = item.status === 'Pg';
                        const editFn = isIncome ? 'editIncome' : 'editExpense';
                        const deleteFn = isIncome ? 'deleteIncome' : 'deleteExpense';
                        return `<div class="mobile-item-swipe" data-id="${item.id}" data-edit="${editFn}" data-delete="${deleteFn}">
                            <div class="swipe-bg swipe-bg-left">Editar</div>
                            <div class="swipe-bg swipe-bg-right">Excluir</div>
                            <div class="mobile-item-content">
                                <div class="mobile-item">
                                    <div class="mobile-item-info">
                                        <div class="mobile-item-top">
                                            <span class="mobile-item-desc">${desc}</span>
                                            <span class="mobile-item-value" style="color:${valueColor}">${currency(item.value)}</span>
                                        </div>
                                        <div class="mobile-item-bottom">
                                            <span class="mobile-item-meta">${dateStr(item.date)}</span>
                                            ${item.dueDate ? `<span class="mobile-item-meta">Paga ${dateStr(item.dueDate)}</span>` : ''}
                                            <span class="mobile-item-meta">${item.category || ''}</span>
                                            <span class="mobile-item-meta">${item.bank || ''}</span>
                                        </div>
                                    </div>
                                    <button class="mobile-item-action${isPaid ? ' confirmed' : ''}" onclick="App.${toggleFn}('${item.id}')">
                                        ${isPaid ? '✓ ' + doneLabel : actionLabel}
                                    </button>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }

        container.innerHTML =
            renderGroup('Atrasadas', overdue, 'overdue', true) +
            renderGroup('Vencendo esta semana', thisWeek, 'week', true) +
            renderGroup('Pendentes', pending, 'pending', false) +
            renderGroup(doneLabel + 's', done, 'done', false) ||
            `<div class="empty-state"><div class="empty-state-icon">—</div><div class="empty-state-desc">Nenhum lançamento neste mês</div></div>`;
    }

    // ============================================================
    // SAÍDAS
    // ============================================================
    function renderSaidas() {
        let expenses = filterByMember(filterByMonth(getExpenses(), 'date'));
        const members = getMembers();

        // Populate filters
        const banks = [...new Set(getExpenses().map(e => e.bank).filter(Boolean))];
        const payments = [...new Set(getExpenses().map(e => e.paymentType).filter(Boolean))];
        const groups = [...new Set(getExpenses().map(e => {
            const cat = getAllCategories().find(c => c.name === e.category);
            return cat ? cat.group : '';
        }).filter(Boolean))];

        const memberNames = members.map(m => m.name);
        populateSelect($('filterBank'), banks, 'Todos os Bancos');
        populateSelect($('filterPayment'), payments, 'Tipo Pagamento');
        populateSelect($('filterGroup'), groups, 'Todos os Grupos');
        if ($('filterExpMember')) populateSelect($('filterExpMember'), memberNames, 'Todos os Membros');

        // Apply filters
        const bankF = $('filterBank').value;
        const payF = $('filterPayment').value;
        const groupF = $('filterGroup').value;
        const statusF = $('filterStatus').value;
        const memberF = $('filterExpMember') ? $('filterExpMember').value : 'all';
        const searchTerm = ($('searchExpense').value || '').toLowerCase().trim();

        if (memberF !== 'all') {
            const mem = members.find(m => m.name === memberF);
            if (mem) expenses = expenses.filter(e => e.memberId === mem.id);
        }

        if (bankF !== 'all') expenses = expenses.filter(e => e.bank === bankF);
        if (payF !== 'all') expenses = expenses.filter(e => e.paymentType === payF);
        if (groupF !== 'all') expenses = expenses.filter(e => {
            const cat = getAllCategories().find(c => c.name === e.category);
            return cat && cat.group === groupF;
        });
        if (statusF === 'pending') expenses = expenses.filter(e => e.status !== 'Pg');
        if (statusF === 'paid') expenses = expenses.filter(e => e.status === 'Pg');
        if (searchTerm) expenses = expenses.filter(e =>
            (e.description || '').toLowerCase().includes(searchTerm) ||
            (e.category || '').toLowerCase().includes(searchTerm)
        );

        const total = expenses.reduce((s, e) => s + Number(e.value), 0);
        const fixo = expenses.filter(e => {
            const cat = getAllCategories().find(c => c.name === e.category);
            return cat && cat.type === 'Fixo';
        }).reduce((s, e) => s + Number(e.value), 0);
        const variavel = total - fixo;

        // Sort
        expenses = sortItems(expenses, 'expenses', 'date');

        // Sortable headers
        $('expenseHead').innerHTML = `<tr>
            <th style="width:30px"><input type="checkbox" class="exp-checkbox" id="selectAllHead" onchange="App.toggleSelectAll(this.checked)"></th>
            ${sortHeader('expenses', 'bank', 'Banco')}
            ${sortHeader('expenses', 'paymentType', 'Tipo Pgto')}
            ${sortHeader('expenses', 'date', 'Data')}
            ${sortHeader('expenses', 'value', 'Valor')}
            ${sortHeader('expenses', 'installments', 'Parcelas')}
            ${sortHeader('expenses', 'description', 'Estabelecimento')}
            ${sortHeader('expenses', 'category', 'Plano de Contas')}
            ${sortHeader('expenses', 'recurrenceType', 'Tipo')}
            <th class="actions-header">Ações</th>
        </tr>`;

        $('expenseTable').innerHTML = expenses.map(e => {
            const member = members.find(m => m.id === e.memberId);
            const checked = state.selectedExpenses && state.selectedExpenses.has(e.id) ? 'checked' : '';
            const recType = e.recurrenceType || (e.installments ? 'parcelada' : 'avulsa');
            const typeLabel = recType === 'recorrente' ? '<span class="rec-badge recorrente">Recorrente</span>'
                : recType === 'parcelada' ? `<span class="rec-badge parcelada">${e.installments || 'Parcelada'}</span>`
                : '<span class="rec-badge avulsa">Avulsa</span>';
            return `<tr class="${e.status === 'Pg' ? 'row-paid' : ''}">
                <td><input type="checkbox" class="exp-checkbox exp-row-check" data-id="${e.id}" ${checked} onchange="App.updateBulkCount()"></td>
                <td>${e.bank || '-'}</td>
                <td>${e.paymentType || '-'}</td>
                <td>${dateStr(e.date)}</td>
                <td style="font-weight:600;color:var(--expense)">${currency(e.value)}</td>
                <td>${e.installments || '-'}</td>
                <td>${e.description || '-'}</td>
                <td>${e.category || '-'}</td>
                <td>${typeLabel}</td>
                <td class="actions-cell">
                    <button class="btn-status ${e.status === 'Pg' ? 'confirmed' : ''}" onclick="App.toggleExpenseStatus('${e.id}')">
                        ${e.status === 'Pg' ? '&#10003; Pago' : '&#9711; Pagar'}
                    </button>
                    <button class="btn-action edit" onclick="App.editExpense('${e.id}')">Editar</button>
                    <button class="btn-action danger" onclick="App.deleteExpense('${e.id}')">Excluir</button>
                </td>
            </tr>`;
        }).join('') || `<tr><td colspan="11"><div class="empty-state"><div class="empty-state-icon">\u{1F4CB}</div><div class="empty-state-title">Nenhuma saída neste mês</div><div class="empty-state-desc">Adicione suas despesas clicando em "+ Nova Saída"</div></div></td></tr>`;

        // Summary cards
        const paid = expenses.filter(e => e.status === 'Pg').reduce((s, e) => s + Number(e.value), 0);
        const pendingExp = total - paid;
        $('expTotalCard').textContent = currency(total);
        $('expPaidCard').textContent = currency(paid);
        $('expPendingCard').textContent = currency(pendingExp);
        $('expFixoCard').textContent = currency(fixo);
        $('expVarCard').textContent = currency(variavel);

        // Mobile cards view
        renderMobileCards('expense', expenses);

        // Card: lançamentos com info pendente
        const allExp = filterByMember(filterByMonth(getExpenses(), 'date'));
        const incomplete = allExp.filter(e => !e.bank || !e.paymentType);
        const pendingCard = $('pendingInfoCard');
        if (pendingCard) {
            if (incomplete.length > 0) {
                pendingCard.style.display = '';
                pendingCard.innerHTML = `<div style="padding:14px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
                    <div>
                        <div style="font-size:13px;font-weight:600;color:var(--warning)">Informações pendentes</div>
                        <div style="font-size:11px;color:var(--text-muted)">${incomplete.length} lançamento(s) sem banco ou tipo de pagamento</div>
                    </div>
                    <span style="font-size:12px;color:var(--text-muted)">&#9660;</span>
                </div>
                <div style="display:none;border:1px solid var(--border);border-top:none;border-radius:0 0 12px 12px;margin-top:-17px;margin-bottom:16px;overflow:hidden">
                    ${incomplete.map(e => `<div class="mobile-item" style="padding:10px 16px">
                        <div class="mobile-item-info">
                            <span class="mobile-item-desc">${e.description || e.category || '-'}</span>
                            <span class="mobile-item-meta">${dateStr(e.date)} · ${currency(e.value)}</span>
                        </div>
                        <button class="mobile-item-action" onclick="App.editExpense('${e.id}')">Completar</button>
                    </div>`).join('')}
                </div>`;
            } else {
                pendingCard.style.display = 'none';
                pendingCard.innerHTML = '';
            }
        }
    }

    function populateSelect(el, options, placeholder) {
        const current = el.value;
        el.innerHTML = `<option value="all">${placeholder}</option>`;
        options.forEach(o => { el.innerHTML += `<option value="${o}">${o}</option>`; });
        el.value = current && options.includes(current) ? current : 'all';
    }

    // ============================================================
    // ORÇADO x REALIZADO
    // ============================================================
    function renderOrcamento() {
        const expenses = filterByMember(filterByMonth(getExpenses(), 'date'));
        const budgets = getBudgets();
        const monthKey = state.currentYear + '-' + String(state.currentMonth + 1).padStart(2, '0');

        let html = '';
        GROUPS.forEach(group => {
            const cats = getAllCategories().filter(c => c.group === group);
            const groupBudget = cats.reduce((s, c) => {
                const b = budgets.find(b => b.category === c.name && b.monthKey === monthKey);
                return s + (b ? Number(b.value) : 0);
            }, 0);
            const groupReal = cats.reduce((s, c) => {
                return s + expenses.filter(e => e.category === c.name).reduce((ss, e) => ss + Number(e.value), 0);
            }, 0);
            const groupVar = groupBudget > 0 ? pct(groupBudget - groupReal, groupBudget) : (groupReal > 0 ? -100 : 0);

            html += `<tr class="group-row"><td colspan="5">${group}</td></tr>`;
            cats.forEach(c => {
                const budget = budgets.find(b => b.category === c.name && b.monthKey === monthKey);
                const budgetVal = budget ? Number(budget.value) : 0;
                const realVal = expenses.filter(e => e.category === c.name).reduce((s, e) => s + Number(e.value), 0);
                const variation = budgetVal > 0 ? pct(budgetVal - realVal, budgetVal) : (realVal > 0 ? -100 : 0);
                const varClass = variation >= 0 ? 'variation-positive' : 'variation-negative';
                const status = realVal === 0 ? '-' : (realVal <= budgetVal || budgetVal === 0 ? '&#10003;' : '&#9888;');
                const barPct = budgetVal > 0 ? Math.min(100, Math.round((realVal / budgetVal) * 100)) : (realVal > 0 ? 100 : 0);
                const barColor = barPct > 100 || (budgetVal > 0 && realVal > budgetVal) ? 'var(--expense)' : 'var(--text-primary)';

                html += `<tr>
                    <td style="padding-left:24px">${c.name}</td>
                    <td>${budgetVal > 0 ? currency(budgetVal) : '-'}</td>
                    <td>${realVal > 0 ? currency(realVal) : '-'}</td>
                    <td class="budget-bar-cell">${budgetVal > 0 || realVal > 0 ? `<div class="budget-bar-wrap"><div class="budget-bar-track"><div class="budget-bar-fill" style="width:${barPct}%;background:${barColor}"></div></div><span class="${varClass}">${variation}%</span></div>` : '-'}</td>
                    <td>${status}</td>
                </tr>`;
            });
        });

        $('budgetTable').innerHTML = html;
    }

    // ============================================================
    // MEMBROS
    // ============================================================
    function renderMembros() {
        const members = getMembers();

        $('membersGrid').innerHTML = members.map(m => {
            const initial = m.name.charAt(0).toUpperCase();

            return `<div class="member-card">
                <div class="member-avatar" style="background:${m.color}">${initial}</div>
                <div class="member-name">${m.name}</div>
                <div class="member-role">${m.role || ''}</div>
                <div class="member-actions">
                    <button class="btn-secondary" onclick="App.editMember('${m.id}')">Editar</button>
                    <button class="btn-secondary" onclick="App.deleteMember('${m.id}')">Remover</button>
                </div>
            </div>`;
        }).join('');
    }

    // ============================================================
    // PLANEJAMENTO
    // ============================================================
    function renderPlanejamento() {
        const allCats = getAllCategories();
        const allExpenses = getExpenses();
        const showAll = $('showAllCategories').checked;

        // Check which categories have been used
        const usedCats = new Set(allExpenses.map(e => e.category));
        const customCats = getCustomCategories();
        const customNames = new Set(customCats.map(c => c.name));

        // Categories table - filter zeradas if toggle off
        const catsToShow = showAll ? allCats : allCats.filter(c => usedCats.has(c.name));

        let prevGroup = '';
        $('planTable').innerHTML = catsToShow.map(c => {
            const isCustom = customNames.has(c.name);
            const used = usedCats.has(c.name);
            const groupHeader = c.group !== prevGroup ? `<tr class="group-row"><td colspan="6">${c.group}</td></tr>` : '';
            prevGroup = c.group;
            return groupHeader + `<tr>
                <td>${c.name}${isCustom ? '<span class="custom-badge">Custom</span>' : ''}</td>
                <td>${c.type}</td>
                <td><span style="color:${GROUP_COLORS[c.group] || '#aaa'}">${c.group}</span></td>
                <td>${c.condition}</td>
                <td style="color:${used ? 'var(--income)' : 'var(--text-muted)'}">${used ? 'Sim' : '-'}</td>
                <td>${isCustom ? `<button class="btn-action danger" onclick="App.deleteCategory('${c.name}')">Excluir</button>` : ''}</td>
            </tr>`;
        }).join('') || `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">\u{1F4CA}</div><div class="empty-state-title">Nenhuma categoria com uso</div><div class="empty-state-desc">Ative "Mostrar zeradas" para ver todas as categorias</div></div></td></tr>`;

        // Budget inputs - only used categories
        const budgets = getBudgets();
        const monthKey = state.currentYear + '-' + String(state.currentMonth + 1).padStart(2, '0');
        const budgetCats = showAll ? allCats : allCats.filter(c => usedCats.has(c.name) || budgets.some(b => b.category === c.name && b.monthKey === monthKey && b.value > 0));

        $('budgetInputs').innerHTML = GROUPS.map(g => {
            const cats = budgetCats.filter(c => c.group === g);
            if (cats.length === 0) return '';
            return `<div style="grid-column:1/-1;margin-top:8px"><strong style="font-size:0.78rem;color:${GROUP_COLORS[g] || 'var(--text-muted)'}">${g}</strong></div>` +
            cats.map(c => {
                const b = budgets.find(b => b.category === c.name && b.monthKey === monthKey);
                const val = b ? b.value : '';
                return `<div class="budget-input-item">
                    <label>${c.name}</label>
                    <input type="number" placeholder="R$ 0" value="${val}"
                           onchange="App.saveBudget('${c.name}','${monthKey}',this.value)">
                </div>`;
            }).join('');
        }).join('');
    }

    // Category modal
    function openCategoryModal() {
        const body = `
            <div class="form-group">
                <label>Nome da Conta</label>
                <input type="text" id="fCatName" placeholder="Ex: Seguro Pet">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Tipo de Custo</label>
                    <select id="fCatType">
                        <option value="Variável">Variável</option>
                        <option value="Fixo">Fixo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Grupo</label>
                    <select id="fCatGroup">
                        ${GROUPS.map(g => `<option value="${g}">${g}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Condição</label>
                <select id="fCatCondition">
                    ${CONDITIONS.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
        `;

        openModal('Nova Conta', body, () => {
            const name = $('fCatName').value.trim();
            if (!name) { toast('Informe o nome da conta.', 'error'); return false; }
            const existing = getAllCategories().find(c => c.name.toLowerCase() === name.toLowerCase());
            if (existing) { toast('Já existe uma conta com esse nome.', 'error'); return false; }

            const cat = {
                name: name,
                type: $('fCatType').value,
                group: $('fCatGroup').value,
                condition: $('fCatCondition').value,
            };
            const customs = getCustomCategories();
            customs.push(cat);
            save(KEYS.customCategories, customs);
            renderPlanejamento();
        });
    }

    // ============================================================
    // FLUXO DE CAIXA
    // ============================================================
    function renderFluxo() {
        const periodo = parseInt($('fluxoPeriodo').value) || 12;
        const allIncomes = filterByMember(getIncomes());
        const allExpenses = filterByMember(getExpenses());
        const now = new Date();
        const currentM = now.getMonth();
        const currentY = now.getFullYear();

        // Build monthly data
        const months = [];
        for (let i = 0; i < periodo; i++) {
            let m = currentM + i;
            let y = currentY;
            while (m > 11) { m -= 12; y++; }
            const inc = allIncomes.filter(item => {
                const d = new Date(item.date + 'T00:00:00');
                return d.getMonth() === m && d.getFullYear() === y;
            }).reduce((s, item) => s + Number(item.value), 0);
            const exp = allExpenses.filter(item => {
                const d = new Date(item.date + 'T00:00:00');
                return d.getMonth() === m && d.getFullYear() === y;
            }).reduce((s, item) => s + Number(item.value), 0);
            months.push({ month: m, year: y, income: inc, expense: exp, saldo: inc - exp });
        }

        // Acumulado
        let acum = 0;
        months.forEach(m => { acum += m.saldo; m.acumulado = acum; });

        // Totals
        const totalInc = months.reduce((s, m) => s + m.income, 0);
        const totalExp = months.reduce((s, m) => s + m.expense, 0);
        const totalSaldo = totalInc - totalExp;
        const taxaEconomia = totalInc > 0 ? Math.round((totalSaldo / totalInc) * 100) : 0;

        // Health indicator
        const healthIcon = $('healthIcon');
        const healthTitle = $('healthTitle');
        const healthDesc = $('healthDesc');
        const negativos = months.filter(m => m.saldo < 0).length;

        healthIcon.className = 'health-icon';
        if (taxaEconomia >= 20) {
            healthIcon.classList.add('excellent');
            healthIcon.textContent = '\u2705';
            healthTitle.textContent = 'Excelente!';
            healthTitle.style.color = 'var(--income)';
            healthDesc.textContent = `Economia de ${taxaEconomia}% da receita. Acima da meta de 20%.`;
        } else if (taxaEconomia >= 10) {
            healthIcon.classList.add('good');
            healthIcon.textContent = '\uD83D\uDC4D';
            healthTitle.textContent = 'Bom caminho';
            healthTitle.style.color = 'var(--text-primary)';
            healthDesc.textContent = `Economia de ${taxaEconomia}%. Falta pouco para a meta de 20%.`;
        } else if (taxaEconomia >= 0) {
            healthIcon.classList.add('warning');
            healthIcon.textContent = '\u26A0\uFE0F';
            healthTitle.textContent = 'Atenção';
            healthTitle.style.color = 'var(--warning)';
            healthDesc.textContent = `Economia de apenas ${taxaEconomia}%. Gasto muito próximo da receita.`;
        } else {
            healthIcon.classList.add('danger');
            healthIcon.textContent = '\uD83D\uDEA8';
            healthTitle.textContent = 'Crítico - Gastando mais do que ganha';
            healthTitle.style.color = 'var(--debt)';
            healthDesc.textContent = `Déficit de ${Math.abs(taxaEconomia)}%. Despesas superam a receita.`;
        }

        $('fluxoReceita').textContent = currency(totalInc);
        $('fluxoDespesa').textContent = currency(totalExp);
        $('fluxoSaldo').textContent = currency(totalSaldo);
        $('fluxoSaldo').style.color = totalSaldo >= 0 ? 'var(--income)' : 'var(--debt)';
        $('fluxoEconomia').textContent = taxaEconomia + '%';
        $('fluxoEconomia').style.color = taxaEconomia >= 20 ? 'var(--income)' : taxaEconomia >= 0 ? 'var(--warning)' : 'var(--debt)';

        // Alerts
        let alertsHtml = '';
        if (negativos > 0) {
            const mesesNeg = months.filter(m => m.saldo < 0).map(m => SHORT_MONTHS[m.month] + '/' + String(m.year).slice(2)).join(', ');
            alertsHtml += `<div class="fluxo-alert alert-danger"><span class="fluxo-alert-icon">\uD83D\uDEA8</span>${negativos} mês(es) com saldo negativo: ${mesesNeg}</div>`;
        }
        const lastAcum = months[months.length - 1]?.acumulado || 0;
        if (lastAcum < 0) {
            alertsHtml += `<div class="fluxo-alert alert-danger"><span class="fluxo-alert-icon">\uD83D\uDCB8</span>Projeção de déficit acumulado de ${currency(Math.abs(lastAcum))} em ${periodo} meses</div>`;
        } else if (lastAcum > 0) {
            alertsHtml += `<div class="fluxo-alert alert-success"><span class="fluxo-alert-icon">\uD83D\uDCB0</span>Projeção de sobra de ${currency(lastAcum)} em ${periodo} meses</div>`;
        }
        $('fluxoAlertas').innerHTML = alertsHtml;

        // Chart
        const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);
        $('fluxoChart').innerHTML = months.map(m => {
            const incW = Math.round((m.income / maxVal) * 100);
            const expW = Math.round((m.expense / maxVal) * 100);
            const isCurrent = m.month === currentM && m.year === currentY;
            return `<div class="fluxo-chart-row${isCurrent ? ' fluxo-current' : ''}">
                <span class="fluxo-chart-label">${SHORT_MONTHS[m.month]}/${String(m.year).slice(2)}</span>
                <div class="fluxo-bar-container"><div class="fluxo-bar bar-income" style="width:${incW}%">${incW > 15 ? (m.income/1000).toFixed(1)+'k' : ''}</div></div>
                <div class="fluxo-bar-container"><div class="fluxo-bar bar-expense" style="width:${expW}%">${expW > 15 ? (m.expense/1000).toFixed(1)+'k' : ''}</div></div>
                <span class="fluxo-chart-saldo" style="color:${m.saldo >= 0 ? 'var(--income)' : 'var(--debt)'}">${m.saldo >= 0 ? '+' : ''}${(m.saldo/1000).toFixed(1)}k</span>
            </div>`;
        }).join('');

        // Table
        $('fluxoTable').innerHTML = months.map(m => {
            const isCurrent = m.month === currentM && m.year === currentY;
            const isNeg = m.saldo < 0;
            const rowClass = isNeg ? 'fluxo-negative' : (isCurrent ? 'fluxo-current' : '');
            const statusIcon = m.saldo >= 0 ? (m.saldo > m.income * 0.2 ? '\u2705' : '\u26A0\uFE0F') : '\uD83D\uDD34';
            return `<tr class="${rowClass}">
                <td style="font-weight:${isCurrent ? '700' : '400'}">${MONTH_NAMES[m.month]} ${m.year}${isCurrent ? ' (atual)' : ''}</td>
                <td style="color:var(--income)">${currency(m.income)}</td>
                <td style="color:var(--expense)">${currency(m.expense)}</td>
                <td style="font-weight:600;color:${m.saldo >= 0 ? 'var(--income)' : 'var(--debt)'}">${currency(m.saldo)}</td>
                <td style="font-weight:600;color:${m.acumulado >= 0 ? 'var(--income)' : 'var(--debt)'}">${currency(m.acumulado)}</td>
                <td>${statusIcon}</td>
            </tr>`;
        }).join('');

        // Insights
        const insights = [];
        const avgExp = totalExp / periodo;
        const avgInc = totalInc / periodo;

        if (taxaEconomia >= 20) {
            insights.push({ icon: '\uD83C\uDFC6', text: `Parabéns! Sua taxa de economia de ${taxaEconomia}% atinge a meta da regra 50/30/20.` });
        } else if (taxaEconomia > 0) {
            const falta = Math.round(avgInc * 0.2) - Math.round(avgInc * taxaEconomia / 100);
            insights.push({ icon: '\uD83C\uDFAF', text: `Para atingir 20% de economia, reduza em média R$ ${falta.toLocaleString('pt-BR')} por mês nas despesas.` });
        }

        if (negativos > 0) {
            insights.push({ icon: '\uD83D\uDCC9', text: `${negativos} de ${periodo} meses projetam saldo negativo. Revise as despesas desses meses.` });
        }

        const biggestExpMonth = months.reduce((max, m) => m.expense > max.expense ? m : max, months[0]);
        insights.push({ icon: '\uD83D\uDCC8', text: `Mês mais caro: ${MONTH_NAMES[biggestExpMonth.month]} ${biggestExpMonth.year} com ${currency(biggestExpMonth.expense)} em despesas.` });

        const avgMonthly = Math.round(totalSaldo / periodo);
        if (avgMonthly > 0) {
            insights.push({ icon: '\uD83D\uDCB5', text: `Em média, sobram ${currency(avgMonthly)} por mês. Em 1 ano seriam ${currency(avgMonthly * 12)}.` });
        }

        // Check investimentos
        const investTotal = allExpenses.filter(e => {
            const cat = getAllCategories().find(c => c.name === e.category);
            return cat && cat.condition === 'Financeiro';
        }).reduce((s, e) => s + Number(e.value), 0);
        if (investTotal > 0) {
            insights.push({ icon: '\uD83D\uDE80', text: `Total alocado em investimentos/financeiro: ${currency(investTotal)}. Continue investindo!` });
        } else {
            insights.push({ icon: '\uD83D\uDCA1', text: `Nenhum valor alocado em investimentos. Considere destinar 20% da receita para reserva e objetivos.` });
        }

        $('fluxoInsights').innerHTML = insights.map(i =>
            `<div class="insight-item"><span class="insight-icon">${i.icon}</span><span>${i.text}</span></div>`
        ).join('');
    }

    // Listener for period change
    $('fluxoPeriodo').addEventListener('change', () => {
        if (state.currentPage === 'fluxo') renderFluxo();
    });

    // ============================================================
    // MODALS
    // ============================================================
    function openModal(title, bodyHtml, onSave) {
        $('modalTitle').textContent = title;
        $('modalBody').innerHTML = bodyHtml;
        $('modalOverlay').classList.add('open');
        $('modalSave').onclick = () => {
            const result = onSave();
            if (result !== false) closeModal();
        };
    }

    function closeModal() {
        $('modalOverlay').classList.remove('open');
        state.editingId = null;
        state.editingType = null;
    }

    $('modalClose').addEventListener('click', closeModal);
    $('modalCancel').addEventListener('click', closeModal);
    $('modalOverlay').addEventListener('click', e => {
        if (e.target === $('modalOverlay')) closeModal();
    });

    // --- Income Modal ---
    function openIncomeModal(income) {
        const members = getMembers();
        const isEdit = !!income;
        const i = income || {};
        const isGenerated = i.recurrenceParent;

        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label>Tipo de Receita</label>
                    <select id="fIncType" ${isGenerated ? 'disabled' : ''}>
                        <option value="avulsa" ${(!i.recurrenceType || i.recurrenceType === 'avulsa') ? 'selected' : ''}>Avulsa (única)</option>
                        <option value="recorrente" ${i.recurrenceType === 'recorrente' ? 'selected' : ''}>Recorrente (todo mês)</option>
                        <option value="parcelada" ${i.recurrenceType === 'parcelada' ? 'selected' : ''}>Parcelada (X vezes)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Valor</label>
                    <input type="number" step="0.01" min="0" id="fIncValue" value="${i.value ? Number(i.value).toFixed(2) : ''}" placeholder="0.00">
                </div>
            </div>
            <div class="form-row" id="recurrenceRow" style="display:none">
                <div class="form-group">
                    <label>Dia do Recebimento</label>
                    <input type="number" min="1" max="31" id="fIncDay" value="${i.recurrenceDay || ''}" placeholder="Ex: 5">
                </div>
                <div class="form-group" id="installmentGroup" style="display:none">
                    <label>Quantidade de Parcelas</label>
                    <input type="number" min="1" max="60" id="fIncInstallments" value="${i.recurrenceTotal || ''}" placeholder="Ex: 3">
                </div>
            </div>
            <div class="form-row" id="dateRow">
                <div class="form-group">
                    <label>Data da Entrada${isGenerated ? ' (gerada)' : ''}</label>
                    <input type="date" id="fIncDate" value="${i.date || ''}" ${isGenerated ? 'readonly style="opacity:0.6"' : ''}>
                </div>
                <div class="form-group">
                    <label>Banco</label>
                    <select id="fIncBank">
                        <option value="">Selecione</option>
                        ${BANKS.map(b => `<option value="${b}" ${i.bank === b ? 'selected' : ''}>${b}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Categoria</label>
                    <select id="fIncCat">
                        ${INCOME_CATEGORIES.map(c => `<option value="${c}" ${i.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Fonte Pagadora</label>
                    <input type="text" id="fIncSource" value="${i.source || ''}" placeholder="Ex: Empresa XYZ">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Membro</label>
                    <select id="fIncMember">
                        ${members.map(m => `<option value="${m.id}" ${i.memberId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="fIncStatus">
                        <option value="" ${!i.status ? 'selected' : ''}>Pendente</option>
                        <option value="Pg" ${i.status === 'Pg' ? 'selected' : ''}>Recebido</option>
                    </select>
                </div>
            </div>
            ${isGenerated ? `<div style="margin-top:12px;padding:12px;background:var(--bg-hover);border-radius:8px;font-size:12px;color:var(--text-muted)">
                Este lançamento faz parte de uma recorrência.
                <label style="display:flex;align-items:center;gap:8px;margin-top:8px;cursor:pointer;color:var(--text-primary);font-size:13px">
                    <input type="checkbox" id="fIncApplyAll"> Aplicar alteração em todos os meses
                </label>
            </div>` : ''}
        `;

        openModal(isEdit ? 'Editar Entrada' : 'Nova Entrada', body, () => {
            const recType = $('fIncType').value;
            const val = parseValue($('fIncValue').value);
            if (!val || val <= 0) { toast('Informe o valor.', 'error'); return false; }
            if (recType === 'avulsa' && !$('fIncDate').value) { toast('Informe a data.', 'error'); return false; }
            if ((recType === 'recorrente' || recType === 'parcelada') && !$('fIncDay').value) { toast('Informe o dia do recebimento.', 'error'); return false; }
            const data = {
                id: i.id || uid(),
                date: $('fIncDate').value,
                value: val,
                bank: $('fIncBank').value,
                category: $('fIncCat').value,
                source: $('fIncSource').value,
                memberId: $('fIncMember').value,
                status: $('fIncStatus').value,
                recurrenceType: recType,
                recurrenceDay: parseInt($('fIncDay').value) || null,
                recurrenceTotal: parseInt($('fIncInstallments').value) || null,
                recurrenceParent: i.recurrenceParent || null,
            };

            if (!isEdit && (recType === 'recorrente' || recType === 'parcelada')) {
                generateRecurringIncomes(data);
            } else {
                const items = getIncomes();
                const idx = items.findIndex(x => x.id === data.id);
                if (idx >= 0) {
                    const parentId = i.recurrenceParent;
                    if (parentId && isEdit) {
                        const siblings = items.filter(x => x.recurrenceParent === parentId && x.id !== data.id);
                        const applyAllEl = document.getElementById('fIncApplyAll');
                        if (siblings.length > 0 && applyAllEl && applyAllEl.checked) {
                            siblings.forEach(sib => {
                                sib.value = data.value;
                                sib.bank = data.bank;
                                sib.category = data.category;
                                sib.source = data.source;
                                sib.memberId = data.memberId;
                            });
                        }
                    }
                    items[idx] = data;
                } else {
                    items.push(data);
                }
                save(KEYS.incomes, items);
            }
            renderCurrentPage();
        });

        // Toggle recurrence fields after modal opens
        setTimeout(() => {
            const typeEl = $('fIncType');
            if (!typeEl) return;

            function toggleFields() {
                const v = typeEl.value;
                const recRow = $('recurrenceRow');
                const instGroup = $('installmentGroup');
                const dateRow = $('dateRow');
                // Always show date when editing
                dateRow.style.display = '';
                if (v === 'recorrente') {
                    recRow.style.display = '';
                    instGroup.style.display = 'none';
                    if (!isEdit) dateRow.style.display = 'none';
                } else if (v === 'parcelada') {
                    recRow.style.display = '';
                    instGroup.style.display = '';
                    if (!isEdit) dateRow.style.display = 'none';
                } else {
                    recRow.style.display = 'none';
                }
            }

            typeEl.addEventListener('change', toggleFields);
            toggleFields();
        }, 50);
    }

    // --- Generate Recurring/Installment Incomes ---
    function generateRecurringIncomes(data) {
        const items = getIncomes();
        const parentId = uid();
        const day = data.recurrenceDay || 1;
        const count = data.recurrenceType === 'parcelada' ? (data.recurrenceTotal || 1) : 12;
        const startMonth = new Date().getMonth();
        const startYear = new Date().getFullYear();

        for (let i = 0; i < count; i++) {
            let m = startMonth + i;
            let y = startYear;
            while (m > 11) { m -= 12; y++; }
            const mm = String(m + 1).padStart(2, '0');
            const dd = String(Math.min(day, 28)).padStart(2, '0');
            const installLabel = data.recurrenceType === 'parcelada' ? `${i + 1}/${count}` : '';

            items.push({
                id: uid(),
                date: `${y}-${mm}-${dd}`,
                value: data.value,
                bank: data.bank,
                category: data.category,
                source: data.source,
                memberId: data.memberId,
                status: '',
                recurrenceType: data.recurrenceType,
                recurrenceDay: day,
                recurrenceTotal: data.recurrenceType === 'parcelada' ? count : null,
                recurrenceParent: parentId,
                installmentLabel: installLabel,
            });
        }
        save(KEYS.incomes, items);
        toast(state.editingId ? 'Entrada atualizada' : 'Entrada adicionada');
    }

    // --- Expense Modal ---
    function openExpenseModal(expense) {
        const members = getMembers();
        const isEdit = !!expense;
        const e = expense || {};
        const isGeneratedInstallment = e.installmentParent;

        const catOptions = getAllCategories().map(c =>
            `<option value="${c.name}">${c.name}</option>`
        ).join('');

        const body = `
            <div class="form-group">
                <label>Data da Compra *</label>
                <input type="date" id="fExpDate" value="${e.date || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Valor *</label>
                    <input type="number" step="0.01" min="0" id="fExpValue" value="${e.value ? Number(e.value).toFixed(2) : ''}" placeholder="0.00" required>
                </div>
                <div class="form-group">
                    <label>Estabelecimento</label>
                    <input type="text" id="fExpDesc" value="${e.description || ''}" placeholder="Nome do estabelecimento">
                </div>
            </div>
            <div class="form-group" style="position:relative">
                <label>Plano de Contas *</label>
                <input type="text" id="fExpCat" value="${e.category || ''}" placeholder="Digite para buscar..." autocomplete="off"
                    onfocus="this.nextElementSibling.style.display=''"
                    oninput="App.filterCatDropdown(this.value, 'fExpCatDrop')">
                <div class="cat-dropdown" id="fExpCatDrop" style="display:none"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Banco / Cartão</label>
                    <select id="fExpBank">
                        <option value="">Não definido</option>
                        ${BANKS.map(b => `<option value="${b}" ${e.bank === b ? 'selected' : ''}>${b}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tipo Pagamento</label>
                    <select id="fExpPayment">
                        <option value="">Não definido</option>
                        ${PAYMENT_TYPES.map(p => `<option value="${p}" ${e.paymentType === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Data de Pagamento</label>
                <input type="date" id="fExpDueDate" value="${e.dueDate || ''}">
                <span style="font-size:10px;color:var(--text-muted)" id="fExpDueDateHint">Preenchido automaticamente para crédito, débito e pix</span>
            </div>
            <div id="fExpCardInfo" style="margin-top:4px;padding:12px;background:var(--bg-hover);border-radius:8px;font-size:12px;color:var(--text-muted);display:none"></div>
            <div class="form-row">
                <div class="form-group">
                    <label>Membro</label>
                    <select id="fExpMember">
                        ${members.map(m => `<option value="${m.id}" ${e.memberId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="fExpRecType" ${isGeneratedInstallment ? 'disabled' : ''}>
                        <option value="avulsa" ${(!e.recurrenceType || e.recurrenceType === 'avulsa') && !e.installments ? 'selected' : ''}>Avulsa (única)</option>
                        <option value="recorrente" ${e.recurrenceType === 'recorrente' ? 'selected' : ''}>Recorrente (todo mês)</option>
                        <option value="parcelada" ${e.recurrenceType === 'parcelada' || e.installments ? 'selected' : ''}>Parcelada (X vezes)</option>
                    </select>
                </div>
            </div>
            <div class="form-group" id="installmentCountGroup" style="${(e.installments || e.recurrenceType === 'parcelada') ? '' : 'display:none'}">
                <label>Quantidade de Parcelas</label>
                <input type="number" min="2" max="72" id="fExpInstallCount" value="${e.installments ? e.installments.split('/')[1] || '' : ''}" placeholder="Ex: 10" ${isGeneratedInstallment ? 'disabled' : ''}>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Status</label>
                    <select id="fExpStatus">
                        <option value="" ${!e.status ? 'selected' : ''}>Pendente</option>
                        <option value="Pg" ${e.status === 'Pg' ? 'selected' : ''}>Pago</option>
                    </select>
                </div>
                <div class="form-group"></div>
            </div>
            ${isGeneratedInstallment ? `<div style="margin-top:12px;padding:12px;background:var(--bg-hover);border-radius:8px;font-size:12px;color:var(--text-muted)">
                ${e.recurrenceType === 'recorrente' ? 'Este lançamento faz parte de uma recorrência.' : `Parcela ${e.installments} - gerada automaticamente.`}
                <label style="display:flex;align-items:center;gap:8px;margin-top:8px;cursor:pointer;color:var(--text-primary);font-size:13px">
                    <input type="checkbox" id="fExpApplyAll"> Aplicar alteração em ${e.recurrenceType === 'recorrente' ? 'todos os meses' : 'todas as parcelas'}
                </label>
            </div>` : ''}
        `;

        openModal(isEdit ? 'Editar Saída' : 'Nova Saída', body, () => {
            const recType = $('fExpRecType').value;
            const installCount = parseInt($('fExpInstallCount').value) || 0;
            const val = parseValue($('fExpValue').value);
            const statusVal = $('fExpStatus').value;
            if (!val || val <= 0) { toast('Informe o valor.', 'error'); return false; }
            if (!$('fExpDate').value) { toast('Informe a data da compra.', 'error'); return false; }
            if (!$('fExpCat').value.trim()) { toast('Informe o plano de contas.', 'error'); return false; }
            if (recType === 'parcelada' && installCount < 2) { toast('Informe a quantidade de parcelas (mínimo 2).', 'error'); return false; }
            // Se marcou como pago, exige banco e tipo pagamento
            if (statusVal === 'Pg') {
                if (!$('fExpBank').value) { toast('Informe o banco para confirmar pagamento.', 'error'); return false; }
                if (!$('fExpPayment').value) { toast('Informe o tipo de pagamento para confirmar.', 'error'); return false; }
            }

            const data = {
                id: e.id || uid(),
                date: $('fExpDate').value,
                dueDate: $('fExpDueDate').value || '',
                value: val,
                bank: $('fExpBank').value,
                paymentType: $('fExpPayment').value,
                category: $('fExpCat').value.trim(),
                installments: recType === 'parcelada' && installCount > 1 ? `1/${installCount}` : '',
                description: $('fExpDesc').value,
                memberId: $('fExpMember').value,
                status: $('fExpStatus').value,
                installmentParent: e.installmentParent || null,
                recurrenceType: recType,
                recurrenceParent: e.recurrenceParent || null,
            };

            if (!isEdit && recType === 'recorrente') {
                generateRecurrentExpenses(data);
            } else if (!isEdit && recType === 'parcelada' && installCount > 1) {
                generateInstallmentExpenses(data, installCount);
            } else {
                const items = getExpenses();
                const idx = items.findIndex(x => x.id === data.id);
                if (idx >= 0) {
                    const parentId = e.installmentParent || e.recurrenceParent;
                    if (parentId && isEdit) {
                        const siblings = items.filter(x => (x.installmentParent === parentId || x.recurrenceParent === parentId) && x.id !== data.id);
                        const applyAllEl = document.getElementById('fExpApplyAll');
                        if (siblings.length > 0 && applyAllEl && applyAllEl.checked) {
                            siblings.forEach(sib => {
                                sib.value = data.value;
                                sib.bank = data.bank;
                                sib.paymentType = data.paymentType;
                                sib.category = data.category;
                                sib.description = data.description;
                                sib.memberId = data.memberId;
                            });
                        }
                    }
                    items[idx] = data;
                } else {
                    items.push(data);
                }
                save(KEYS.expenses, items);
            }
            renderCurrentPage();
        });

        // Toggle installment field + populate dropdown
        setTimeout(() => {
            // Populate category dropdown
            App.filterCatDropdown('', 'fExpCatDrop');
            // Close dropdown on blur
            const catInput = $('fExpCat');
            if (catInput) {
                catInput.addEventListener('blur', () => {
                    setTimeout(() => { const d = $('fExpCatDrop'); if (d) d.style.display = 'none'; }, 200);
                });
            }

            const sel = $('fExpRecType');
            if (!sel) return;
            sel.addEventListener('change', () => {
                $('installmentCountGroup').style.display = sel.value === 'parcelada' ? '' : 'none';
            });

            // Show card billing info + auto-fill due date
            function updateCardInfo() {
                const bankEl = $('fExpBank');
                const payEl = $('fExpPayment');
                const dateEl = $('fExpDate');
                const dueDateEl = $('fExpDueDate');
                const infoEl = $('fExpCardInfo');
                const hintEl = $('fExpDueDateHint');
                if (!bankEl || !payEl || !infoEl) return;
                const bank = bankEl.value;
                const pay = payEl.value;
                const purchaseDate = dateEl.value;

                // Débito ou Pix → data de pagamento = data da compra
                if ((pay === 'Débito' || pay === 'Pix') && purchaseDate) {
                    if (dueDateEl && !dueDateEl._userEdited) {
                        dueDateEl.value = purchaseDate;
                    }
                    infoEl.style.display = '';
                    infoEl.innerHTML = `<span style="color:var(--income)">✓</span> ${pay} — pagamento na data da compra`;
                    return;
                }

                // Crédito + banco cadastrado → data da fatura
                if (pay === 'Crédito' && bank) {
                    const card = getCards().find(c => c.bank === bank);
                    if (card) {
                        const pDate = purchaseDate ? new Date(purchaseDate + 'T00:00:00') : new Date();
                        const day = pDate.getDate();
                        let faturaMonth = pDate.getMonth();
                        let faturaYear = pDate.getFullYear();
                        if (day > card.closeDay) {
                            faturaMonth++;
                            if (faturaMonth > 11) { faturaMonth = 0; faturaYear++; }
                        }
                        let payMonth = faturaMonth + 1;
                        let payYear = faturaYear;
                        if (payMonth > 11) { payMonth = 0; payYear++; }
                        const faturaLabel = MONTH_NAMES[faturaMonth] + '/' + faturaYear;
                        const payMM = String(payMonth + 1).padStart(2, '0');
                        const payDD = String(card.dueDay).padStart(2, '0');
                        const dueDateStr = `${payYear}-${payMM}-${payDD}`;
                        if (dueDateEl && !dueDateEl._userEdited) {
                            dueDateEl.value = dueDateStr;
                        }
                        infoEl.style.display = '';
                        infoEl.innerHTML = `<strong>${bank}</strong> · Fatura ${faturaLabel} (fecha dia ${card.closeDay}) · Paga dia ${card.dueDay}
                            <div style="margin-top:4px;font-size:11px;color:var(--text-muted)">Compra dia ${day} → ${day > card.closeDay ? 'próxima fatura' : 'esta fatura'}</div>`;
                    } else {
                        infoEl.style.display = '';
                        infoEl.innerHTML = `Cartão "${bank}" não cadastrado. <a href="#" onclick="App.navigate('configuracoes');return false" style="color:var(--text-primary);text-decoration:underline">Cadastrar</a>`;
                    }
                    return;
                }

                // Transferência → mesma data
                if (pay === 'Transferência' && purchaseDate) {
                    if (dueDateEl && !dueDateEl._userEdited) {
                        dueDateEl.value = purchaseDate;
                    }
                    infoEl.style.display = 'none';
                    return;
                }

                infoEl.style.display = 'none';
                }
            }
            const bankEl = $('fExpBank');
            const payEl = $('fExpPayment');
            const dateEl = $('fExpDate');
            const dueDateEl2 = $('fExpDueDate');
            if (bankEl) bankEl.addEventListener('change', updateCardInfo);
            if (payEl) payEl.addEventListener('change', updateCardInfo);
            if (dateEl) dateEl.addEventListener('change', () => {
                if (dueDateEl2) dueDateEl2._userEdited = false; // reset on date change
                updateCardInfo();
            });
            if (dueDateEl2) dueDateEl2.addEventListener('change', () => { dueDateEl2._userEdited = true; });
            updateCardInfo();
        }, 50);
    }

    // --- Generate Installment Expenses ---
    function generateInstallmentExpenses(data, count) {
        const items = getExpenses();
        const parentId = uid();
        const baseDate = new Date(data.date + 'T00:00:00');
        const baseDay = baseDate.getDate();

        for (let i = 0; i < count; i++) {
            let m = baseDate.getMonth() + i;
            let y = baseDate.getFullYear();
            while (m > 11) { m -= 12; y++; }
            const mm = String(m + 1).padStart(2, '0');
            const dd = String(Math.min(baseDay, 28)).padStart(2, '0');

            items.push({
                id: uid(),
                date: `${y}-${mm}-${dd}`,
                value: data.value,
                bank: data.bank,
                paymentType: data.paymentType,
                category: data.category,
                installments: `${i + 1}/${count}`,
                description: data.description,
                memberId: data.memberId,
                status: i === 0 ? data.status : '',
                installmentParent: parentId,
            });
        }
        save(KEYS.expenses, items);
        toast(state.editingId ? 'Saída atualizada' : 'Saída adicionada');
    }

    // --- Generate Recurrent Expenses (12 months) ---
    function generateRecurrentExpenses(data) {
        const items = getExpenses();
        const parentId = uid();
        const baseDate = new Date(data.date + 'T00:00:00');
        const day = baseDate.getDate();

        for (let i = 0; i < 12; i++) {
            let m = baseDate.getMonth() + i;
            let y = baseDate.getFullYear();
            while (m > 11) { m -= 12; y++; }
            const mm = String(m + 1).padStart(2, '0');
            const dd = String(Math.min(day, 28)).padStart(2, '0');

            items.push({
                id: uid(),
                date: `${y}-${mm}-${dd}`,
                value: data.value,
                bank: data.bank,
                paymentType: data.paymentType,
                category: data.category,
                installments: '',
                description: data.description,
                memberId: data.memberId,
                status: i === 0 ? data.status : '',
                installmentParent: parentId,
                recurrenceType: 'recorrente',
                recurrenceParent: parentId,
            });
        }
        save(KEYS.expenses, items);
        toast('Saída recorrente adicionada (12 meses)');
    }

    // --- Member Modal ---
    function openMemberModal(member) {
        const isEdit = !!member;
        const m = member || {};

        const body = `
            <div class="form-group">
                <label>Nome</label>
                <input type="text" id="fMemName" value="${m.name || ''}" placeholder="Nome do membro">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Papel</label>
                    <input type="text" id="fMemRole" value="${m.role || ''}" placeholder="Ex: Titular, Cônjuge">
                </div>
                <div class="form-group">
                    <label>Cor</label>
                    <input type="color" id="fMemColor" value="${m.color || '#3B82F6'}">
                </div>
            </div>
        `;

        openModal(isEdit ? 'Editar Membro' : 'Novo Membro', body, () => {
            const data = {
                id: m.id || uid(),
                name: $('fMemName').value || 'Sem Nome',
                role: $('fMemRole').value,
                color: $('fMemColor').value,
            };

            const items = getMembers();
            const idx = items.findIndex(x => x.id === data.id);
            if (idx >= 0) items[idx] = data; else items.push(data);
            save(KEYS.members, items);
            populateMemberFilter();
            renderCurrentPage();
        });
    }

    // --- Filter listeners ---
    $('filterBank').addEventListener('change', renderSaidas);
    $('filterPayment').addEventListener('change', renderSaidas);
    $('filterGroup').addEventListener('change', renderSaidas);
    $('filterStatus').addEventListener('change', renderSaidas);
    $('searchExpense').addEventListener('input', renderSaidas);
    $('selectAllExpenses').addEventListener('change', (e) => {
        App.toggleSelectAll(e.target.checked);
    });
    $('filterIncCat').addEventListener('change', renderEntradas);
    $('filterIncBank').addEventListener('change', renderEntradas);
    $('filterIncType').addEventListener('change', renderEntradas);
    $('filterIncStatus').addEventListener('change', renderEntradas);
    $('searchIncome').addEventListener('input', renderEntradas);
    $('selectAllIncomes').addEventListener('change', (e) => {
        App.toggleSelectAllInc(e.target.checked);
    });

    // --- Button listeners ---
    $('btnAddIncome').addEventListener('click', () => openIncomeModal(null));
    $('btnAddExpense').addEventListener('click', () => openExpenseModal(null));
    $('btnAddMember').addEventListener('click', () => openMemberModal(null));
    $('btnAddCategory').addEventListener('click', () => openCategoryModal());
    $('showAllCategories').addEventListener('change', () => {
        if (state.currentPage === 'planejamento') renderPlanejamento();
    });

    // ============================================================
    // PUBLIC API (for onclick handlers in HTML)
    // ============================================================
    window.App = {
        navigate(page) { navigate(page); },
        filterCatDropdown(query, dropId) {
            const drop = document.getElementById(dropId);
            if (!drop) return;
            const cats = getAllCategories();
            const q = query.toLowerCase().trim();
            const filtered = q ? cats.filter(c => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)) : cats;
            drop.innerHTML = filtered.slice(0, 15).map(c =>
                `<div class="cat-dropdown-item" onmousedown="document.getElementById('fExpCat').value='${c.name}';document.getElementById('${dropId}').style.display='none'">
                    ${c.name}<span class="cat-dropdown-group">${c.group}</span>
                </div>`
            ).join('') || '<div style="padding:10px 12px;font-size:12px;color:var(--text-muted)">Nenhum resultado</div>';
            drop.style.display = filtered.length > 0 || q ? '' : 'none';
        },
        populateCatDropdown(dropId) {
            const drop = document.getElementById(dropId);
            if (!drop) return;
            const cats = getAllCategories();
            drop.innerHTML = cats.slice(0, 20).map(c =>
                `<div class="cat-dropdown-item" onmousedown="document.getElementById('fExpCat').value='${c.name}';document.getElementById('${dropId}').style.display='none'">
                    ${c.name}<span class="cat-dropdown-group">${c.group}</span>
                </div>`
            ).join('');
        },
        editIncome(id) {
            const item = getIncomes().find(i => i.id === id);
            if (item) openIncomeModal(item);
        },
        toggleIncomeStatus(id) {
            const items = getIncomes();
            const item = items.find(i => i.id === id);
            if (!item) return;
            item.status = item.status === 'Pg' ? '' : 'Pg';
            save(KEYS.incomes, items);
            renderCurrentPage();
        },
        toggleExpenseStatus(id) {
            const items = getExpenses();
            const item = items.find(e => e.id === id);
            if (!item) return;
            item.status = item.status === 'Pg' ? '' : 'Pg';
            save(KEYS.expenses, items);
            renderCurrentPage();
        },
        deleteIncome(id) {
            const items = getIncomes();
            const item = items.find(i => i.id === id);
            if (!item) return;
            if (item.recurrenceParent) {
                const siblings = items.filter(i => i.recurrenceParent === item.recurrenceParent);
                if (siblings.length > 1) {
                    const deleteAll = confirm('Essa entrada faz parte de uma recorrência.\n\nExcluir TODAS as parcelas?\n\n• OK = Excluir todas\n• Cancelar = Excluir só esta');
                    if (deleteAll) {
                        save(KEYS.incomes, items.filter(i => i.recurrenceParent !== item.recurrenceParent));
                        toast('Entradas excluídas');
                        renderCurrentPage();
                        return;
                    }
                }
            }
            if (!confirm('Excluir esta entrada?')) return;
            save(KEYS.incomes, items.filter(i => i.id !== id));
            toast('Entrada excluída');
            renderCurrentPage();
        },
        duplicateIncome(id) {
            const item = getIncomes().find(i => i.id === id);
            if (!item) return;
            const dup = { ...item, id: uid(), status: '' };
            const items = getIncomes();
            items.push(dup);
            save(KEYS.incomes, items);
            renderCurrentPage();
        },
        editExpense(id) {
            const item = getExpenses().find(e => e.id === id);
            if (item) openExpenseModal(item);
        },
        deleteExpense(id) {
            const items = getExpenses();
            const item = items.find(e => e.id === id);
            if (!item) return;
            if (item.installmentParent) {
                const siblings = items.filter(e => e.installmentParent === item.installmentParent);
                if (siblings.length > 1) {
                    const deleteAll = confirm('Essa saída faz parte de um parcelamento.\n\nExcluir TODAS as parcelas?\n\n• OK = Excluir todas\n• Cancelar = Excluir só esta');
                    if (deleteAll) {
                        save(KEYS.expenses, items.filter(e => e.installmentParent !== item.installmentParent));
                        toast('Saídas excluídas');
                        renderCurrentPage();
                        return;
                    }
                }
            }
            if (!confirm('Excluir esta saída?')) return;
            save(KEYS.expenses, items.filter(e => e.id !== id));
            toast('Saída excluída');
            renderCurrentPage();
        },
        duplicateExpense(id) {
            const item = getExpenses().find(e => e.id === id);
            if (!item) return;
            const dup = { ...item, id: uid(), status: '' };
            const items = getExpenses();
            items.push(dup);
            save(KEYS.expenses, items);
            renderCurrentPage();
        },
        editMember(id) {
            const item = getMembers().find(m => m.id === id);
            if (item) openMemberModal(item);
        },
        deleteMember(id) {
            const members = getMembers();
            if (members.length <= 1) { toast('Precisa ter pelo menos 1 membro.', 'error'); return; }
            if (!confirm('Remover este membro?')) return;
            save(KEYS.members, members.filter(m => m.id !== id));
            populateMemberFilter();
            renderCurrentPage();
        },
        removeCard(id) {
            const cards = getCards().filter(c => c.id !== id);
            save(KEYS.cards, cards);
            toast('Cartão removido.');
            renderCardSettings();
        },
        saveBudget(category, monthKey, value) {
            const budgets = getBudgets();
            const idx = budgets.findIndex(b => b.category === category && b.monthKey === monthKey);
            const data = { category, monthKey, value: parseValue(value) };
            if (idx >= 0) budgets[idx] = data; else budgets.push(data);
            save(KEYS.budgets, budgets);
        },
        deleteCategory(name) {
            const customs = getCustomCategories();
            if (!customs.find(c => c.name === name)) { toast('Só é possível excluir contas customizadas.', 'error'); return; }
            if (!confirm(`Excluir a conta "${name}"?`)) return;
            save(KEYS.customCategories, customs.filter(c => c.name !== name));
            renderPlanejamento();
        },
        toggleSort(tableName, field) {
            const s = state.sort[tableName];
            if (s && s.field === field) {
                state.sort[tableName] = { field, dir: s.dir === 'asc' ? 'desc' : 'asc' };
            } else {
                state.sort[tableName] = { field, dir: 'asc' };
            }
            renderCurrentPage();
        },
        // --- Bulk actions ---
        toggleSelectAll(checked) {
            const checkboxes = document.querySelectorAll('.exp-row-check');
            state.selectedExpenses = new Set();
            checkboxes.forEach(cb => {
                cb.checked = checked;
                if (checked) state.selectedExpenses.add(cb.dataset.id);
            });
            const headCb = $('selectAllHead');
            if (headCb) headCb.checked = checked;
            const sideCb = $('selectAllExpenses');
            if (sideCb) sideCb.checked = checked;
            this.updateBulkCount();
        },
        updateBulkCount() {
            const checkboxes = document.querySelectorAll('.exp-row-check');
            state.selectedExpenses = new Set();
            checkboxes.forEach(cb => { if (cb.checked) state.selectedExpenses.add(cb.dataset.id); });
            const count = state.selectedExpenses.size;
            if (count === 0) {
                $('bulkCount').textContent = '0 selecionados';
            } else {
                const items = getExpenses();
                const subtotal = items.filter(e => state.selectedExpenses.has(e.id)).reduce((s, e) => s + Number(e.value), 0);
                $('bulkCount').innerHTML = `${count} selecionados &mdash; <strong style="color:var(--expense)">${currency(subtotal)}</strong>`;
            }
        },
        bulkPaySelected() {
            if (state.selectedExpenses.size === 0) { toast('Selecione pelo menos um item.', 'info'); return; }
            const items = getExpenses();
            items.forEach(e => { if (state.selectedExpenses.has(e.id)) e.status = 'Pg'; });
            save(KEYS.expenses, items);
            state.selectedExpenses = new Set();
            renderSaidas();
        },
        bulkUnpaySelected() {
            if (state.selectedExpenses.size === 0) { toast('Selecione pelo menos um item.', 'info'); return; }
            const items = getExpenses();
            items.forEach(e => { if (state.selectedExpenses.has(e.id)) e.status = ''; });
            save(KEYS.expenses, items);
            state.selectedExpenses = new Set();
            renderSaidas();
        },
        // --- Bulk actions for Incomes ---
        toggleSelectAllInc(checked) {
            const checkboxes = document.querySelectorAll('.inc-row-check');
            state.selectedIncomes = new Set();
            checkboxes.forEach(cb => {
                cb.checked = checked;
                if (checked) state.selectedIncomes.add(cb.dataset.id);
            });
            const headCb = $('selectAllIncHead');
            if (headCb) headCb.checked = checked;
            const sideCb = $('selectAllIncomes');
            if (sideCb) sideCb.checked = checked;
            this.updateBulkCountInc();
        },
        updateBulkCountInc() {
            const checkboxes = document.querySelectorAll('.inc-row-check');
            state.selectedIncomes = new Set();
            checkboxes.forEach(cb => { if (cb.checked) state.selectedIncomes.add(cb.dataset.id); });
            const count = state.selectedIncomes.size;
            if (count === 0) {
                $('bulkCountInc').textContent = '0 selecionados';
            } else {
                const items = getIncomes();
                const subtotal = items.filter(i => state.selectedIncomes.has(i.id)).reduce((s, i) => s + Number(i.value), 0);
                $('bulkCountInc').innerHTML = `${count} selecionados &mdash; <strong style="color:var(--income)">${currency(subtotal)}</strong>`;
            }
        },
        bulkReceiveSelected() {
            if (state.selectedIncomes.size === 0) { toast('Selecione pelo menos um item.', 'info'); return; }
            const items = getIncomes();
            items.forEach(i => { if (state.selectedIncomes.has(i.id)) i.status = 'Pg'; });
            save(KEYS.incomes, items);
            state.selectedIncomes = new Set();
            renderEntradas();
        },
        bulkUnreceiveSelected() {
            if (state.selectedIncomes.size === 0) { toast('Selecione pelo menos um item.', 'info'); return; }
            const items = getIncomes();
            items.forEach(i => { if (state.selectedIncomes.has(i.id)) i.status = ''; });
            save(KEYS.incomes, items);
            state.selectedIncomes = new Set();
            renderEntradas();
        },
        openFatura() {
            $('faturaCard').style.display = '';
            // Populate banco select
            const banks = [...new Set(getExpenses().map(e => e.bank).filter(Boolean))];
            $('faturaBanco').innerHTML = banks.map(b => `<option value="${b}">${b}</option>`).join('');
            $('faturaResult').innerHTML = '';
            $('faturaValor').value = '';
        },
        closeFatura() {
            $('faturaCard').style.display = 'none';
        },
        conferirFatura() {
            const valor = parseValue($('faturaValor').value);
            const banco = $('faturaBanco').value;
            if (!valor || !banco) { toast('Informe o valor e o banco da fatura.', 'error'); return; }

            const items = getExpenses();
            const monthItems = filterByMember(filterByMonth(items, 'date'));
            const matching = monthItems.filter(e => e.bank === banco && e.status !== 'Pg');
            const totalMatching = matching.reduce((s, e) => s + Number(e.value), 0);
            const diff = Math.abs(valor - totalMatching);

            if (matching.length === 0) {
                $('faturaResult').innerHTML = `<div class="fatura-result-ok fatura-diff">Nenhuma despesa pendente encontrada para ${banco} neste mês.</div>`;
                return;
            }

            // Mark all matching as paid
            matching.forEach(m => {
                const item = items.find(e => e.id === m.id);
                if (item) item.status = 'Pg';
            });
            save(KEYS.expenses, items);

            if (diff < 0.01) {
                $('faturaResult').innerHTML = `<div class="fatura-result-ok fatura-match">Fatura conferida! ${matching.length} itens marcados como pago. Valor bateu: ${currency(valor)}</div>`;
            } else {
                $('faturaResult').innerHTML = `<div class="fatura-result-ok fatura-diff">
                    ${matching.length} itens marcados como pago.<br>
                    Fatura: ${currency(valor)} | Itens: ${currency(totalMatching)}<br>
                    <strong>Diferença: ${currency(diff)}</strong> - verifique se há lançamentos faltando.
                </div>`;
            }
            state.selectedExpenses = new Set();
            renderSaidas();
        },
    };

    // ============================================================
    // THEME
    // ============================================================
    function loadTheme() {
        const saved = localStorage.getItem('pg_theme') || 'dark';
        applyTheme(saved);
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pg_theme', theme);
        const icon = $('themeIcon');
        const label = $('themeLabel');
        if (icon) {
            if (theme === 'light') {
                icon.textContent = '\u2600';
                label.textContent = 'Modo Escuro';
            } else {
                icon.textContent = '\u263D';
                label.textContent = 'Modo Claro';
            }
        }
    }

    $('themeToggle').addEventListener('click', () => {
        const current = localStorage.getItem('pg_theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    // ============================================================
    // AUTH (layout pronto — lógica real virá com Supabase)
    // ============================================================
    const AUTH_KEY = 'pg_auth';

    function isLoggedIn() {
        return !!localStorage.getItem(AUTH_KEY);
    }

    function loginUser(name, email) {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ name, email, loggedAt: Date.now() }));
    }

    function logoutUser() {
        localStorage.removeItem(AUTH_KEY);
        // Não apagar pg_onboarding_done — ao relogar, não refaz o wizard
    }

    function getAuthUser() {
        try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
    }

    function showAuthScreen() {
        $('authScreen').style.display = '';
        $('app').classList.add('app-hidden');
        const onb = document.getElementById('onboardingScreen');
        if (onb) onb.style.display = 'none';
    }

    function showApp() {
        $('authScreen').style.display = 'none';
        $('app').classList.remove('app-hidden');
        const onb = document.getElementById('onboardingScreen');
        if (onb) onb.style.display = 'none';
    }

    // Auth form handlers
    $('btnLogin').addEventListener('click', () => {
        const email = $('loginEmail').value.trim();
        const pass = $('loginPassword').value;
        if (!email || !pass) { toast('Preencha email e senha.', 'error'); return; }
        // Simulado — real virá com Supabase
        loginUser(email.split('@')[0], email);
        toast('Login realizado!');
        checkOnboarding();
    });

    $('btnRegister').addEventListener('click', () => {
        const name = $('regName').value.trim();
        const email = $('regEmail').value.trim();
        const pass = $('regPassword').value;
        const confirmPass = $('regPasswordConfirm').value;
        if (!name || !email || !pass) { toast('Preencha todos os campos.', 'error'); return; }
        if (pass !== confirmPass) { toast('As senhas não coincidem.', 'error'); return; }
        if (pass.length < 6) { toast('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
        loginUser(name, email);
        toast('Conta criada!');
        checkOnboarding();
    });

    $('btnForgot').addEventListener('click', () => {
        const email = $('forgotEmail').value.trim();
        if (!email) { toast('Informe seu email.', 'error'); return; }
        toast('Link de recuperação enviado para ' + email, 'info');
        setTimeout(() => window.App.showAuth('login'), 2000);
    });

    $('btnGoogleLogin').addEventListener('click', () => {
        // Simulado — real virá com Supabase
        loginUser('Usuário Google', 'user@google.com');
        toast('Login com Google realizado!');
        checkOnboarding();
    });

    // ============================================================
    // ONBOARDING
    // ============================================================
    function checkOnboarding() {
        // Auto-login se já tem dados (usuários existentes antes do auth)
        if (!isLoggedIn()) {
            const hasData = localStorage.getItem('pg_members') || localStorage.getItem('pg_incomes') || localStorage.getItem('pg_expenses');
            if (hasData) {
                loginUser('Usuário', 'usuario@prontogestao.app');
                localStorage.setItem('pg_onboarding_done', '1');
            } else {
                showAuthScreen();
                return;
            }
        }
        if (!localStorage.getItem('pg_onboarding_done')) {
            showOnboarding();
        } else {
            showApp();
            initApp();
        }
    }

    function showOnboarding() {
        $('authScreen').style.display = 'none';
        $('app').style.display = 'none';
        let onb = document.getElementById('onboardingScreen');
        if (!onb) {
            onb = document.createElement('div');
            onb.id = 'onboardingScreen';
            onb.className = 'onboarding-screen';
            document.body.appendChild(onb);
        }
        onb.style.display = '';
        renderOnboardingStep(1);
    }

    let onboardingData = { name: '', members: [], income: '' };

    function renderOnboardingStep(step) {
        const onb = document.getElementById('onboardingScreen');
        const user = getAuthUser();

        const steps = `<div class="onboarding-steps">
            <div class="onboarding-step ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}"></div>
            <div class="onboarding-step ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}"></div>
            <div class="onboarding-step ${step >= 3 ? 'active' : ''}"></div>
        </div>`;

        if (step === 1) {
            onb.innerHTML = `<div class="onboarding-container"><div class="onboarding-card">
                ${steps}
                <h2 class="onboarding-title">Bem-vindo ao ProntoGestão!</h2>
                <p class="onboarding-desc">Vamos configurar sua conta em 3 passos rápidos.</p>
                <div class="form-group">
                    <label>Como quer ser chamado?</label>
                    <input type="text" id="onbName" value="${user ? user.name : ''}" placeholder="Seu nome">
                </div>
                <div class="onboarding-actions">
                    <div></div>
                    <button class="btn-primary" onclick="App.onboardingNext(1)">Próximo</button>
                </div>
            </div></div>`;
        } else if (step === 2) {
            const membersList = onboardingData.members.map((m, i) =>
                `<div class="settings-row"><span class="settings-row-label">${m}</span><button class="btn-action danger" onclick="App.onboardingRemoveMember(${i})">Remover</button></div>`
            ).join('');
            onb.innerHTML = `<div class="onboarding-container"><div class="onboarding-card">
                ${steps}
                <h2 class="onboarding-title">Membros da família</h2>
                <p class="onboarding-desc">Adicione as pessoas que compartilham as finanças.</p>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nome do membro</label>
                        <input type="text" id="onbMemberName" placeholder="Ex: Maria">
                    </div>
                    <div class="form-group" style="display:flex;align-items:flex-end">
                        <button class="btn-secondary" onclick="App.onboardingAddMember()" style="width:100%">Adicionar</button>
                    </div>
                </div>
                <div id="onbMembersList">${membersList || '<p style="color:var(--text-muted);font-size:13px">Nenhum membro adicionado ainda</p>'}</div>
                <div class="onboarding-actions">
                    <button class="btn-secondary" onclick="App.onboardingBack(2)">Voltar</button>
                    <button class="btn-primary" onclick="App.onboardingNext(2)">Próximo</button>
                </div>
            </div></div>`;
        } else if (step === 3) {
            onb.innerHTML = `<div class="onboarding-container"><div class="onboarding-card">
                ${steps}
                <h2 class="onboarding-title">Renda mensal</h2>
                <p class="onboarding-desc">Informe a renda total da família para calcularmos a regra 50/30/20.</p>
                <div class="form-group">
                    <label>Renda mensal total</label>
                    <input type="text" inputmode="decimal" id="onbIncome" value="${onboardingData.income}" placeholder="Ex: 10.000,00">
                </div>
                <div class="onboarding-actions">
                    <button class="btn-secondary" onclick="App.onboardingBack(3)">Voltar</button>
                    <button class="btn-primary" onclick="App.onboardingFinish()">Começar!</button>
                </div>
            </div></div>`;
        }
    }

    // ============================================================
    // SETTINGS PAGE
    // ============================================================
    function renderConfiguracoes() {
        const user = getAuthUser();
        if (user) {
            const nameEl = $('settingsName');
            const emailEl = $('settingsEmail');
            if (nameEl) nameEl.value = user.name || '';
            if (emailEl) emailEl.value = user.email || '';
        }
        renderCardSettings();
    }

    function renderCardSettings() {
        const container = $('cardSettings');
        if (!container) return;
        const cards = getCards();
        if (cards.length === 0) {
            container.innerHTML = '<p style="font-size:13px;color:var(--text-muted)">Nenhum cartão cadastrado.</p>';
            return;
        }
        container.innerHTML = cards.map(c => `
            <div class="settings-row" style="padding:10px 0">
                <div class="settings-row-info">
                    <span class="settings-row-label">${c.bank}</span>
                    <span class="settings-row-desc">Abre dia ${c.openDay || '?'} · Fecha dia ${c.closeDay} · Paga dia ${c.dueDay}</span>
                </div>
                <button class="btn-action danger" onclick="App.removeCard('${c.id}')">Remover</button>
            </div>
        `).join('');
    }

    // Settings event listeners
    setTimeout(() => {
        const btnSave = $('btnSaveProfile');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const name = $('settingsName').value.trim();
                if (!name) { toast('Informe seu nome.', 'error'); return; }
                const user = getAuthUser();
                if (user) {
                    user.name = name;
                    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
                    toast('Perfil atualizado!');
                }
            });
        }

        const btnTheme = $('settingsThemeToggle');
        if (btnTheme) {
            btnTheme.addEventListener('click', () => {
                const current = localStorage.getItem('pg_theme') || 'dark';
                applyTheme(current === 'dark' ? 'light' : 'dark');
                toast('Tema alterado!');
            });
        }

        const btnExport = $('btnExportData');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const data = {};
                Object.keys(KEYS).forEach(k => { data[k] = load(KEYS[k]); });
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `prontogestao-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click(); URL.revokeObjectURL(url);
                toast('Dados exportados!');
            });
        }

        const btnImport = $('btnImportData');
        if (btnImport) {
            btnImport.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        Object.keys(KEYS).forEach(k => {
                            if (data[k]) save(KEYS[k], data[k]);
                        });
                        toast('Dados importados!');
                        renderCurrentPage();
                    } catch { toast('Arquivo inválido.', 'error'); }
                };
                reader.readAsText(file);
            });
        }

        const btnClear = $('btnClearData');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (!confirm('Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.')) return;
                Object.keys(KEYS).forEach(k => localStorage.removeItem(KEYS[k]));
                toast('Todos os dados foram apagados.');
                renderCurrentPage();
            });
        }

        const btnLogout = $('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                logoutUser();
                toast('Você saiu da conta.');
                showAuthScreen();
            });
        }

        const btnAddCard = $('btnAddCard');
        if (btnAddCard) {
            btnAddCard.addEventListener('click', () => {
                openModal('Adicionar Cartão', `
                    <div class="form-group">
                        <label>Banco / Cartão</label>
                        <select id="fCardBank">
                            ${BANKS.map(b => `<option value="${b}">${b}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Dia da Abertura da Fatura</label>
                        <input type="number" min="1" max="31" id="fCardOpen" placeholder="Ex: 1">
                        <span style="font-size:11px;color:var(--text-muted)">Primeiro dia que compras entram nesta fatura</span>
                    </div>
                    <div class="form-group">
                        <label>Dia do Fechamento da Fatura</label>
                        <input type="number" min="1" max="31" id="fCardClose" placeholder="Ex: 30">
                        <span style="font-size:11px;color:var(--text-muted)">Último dia que compras entram nesta fatura</span>
                    </div>
                    <div class="form-group">
                        <label>Dia do Pagamento da Fatura</label>
                        <input type="number" min="1" max="31" id="fCardDue" placeholder="Ex: 4">
                        <span style="font-size:11px;color:var(--text-muted)">Data de vencimento/pagamento</span>
                    </div>
                `, () => {
                    const bank = $('fCardBank').value;
                    const openDay = parseInt($('fCardOpen').value);
                    const closeDay = parseInt($('fCardClose').value);
                    const dueDay = parseInt($('fCardDue').value);
                    if (!openDay || !closeDay || !dueDay) { toast('Informe abertura, fechamento e pagamento.', 'error'); return false; }
                    const cards = getCards();
                    cards.push({ id: uid(), bank, openDay, closeDay, dueDay });
                    save(KEYS.cards, cards);
                    toast('Cartão adicionado!');
                    renderCardSettings();
                });
            });
        }
    }, 100);

    // ============================================================
    // INIT
    // ============================================================
    function initApp() {
        populateMemberFilter();
        updateMonthDisplay();
        renderDashboard();
    }

    loadTheme();

    // Add auth/onboarding methods to App
    const authMethods = {
        showAuth(screen) {
            $('authLogin').style.display = screen === 'login' ? '' : 'none';
            $('authRegister').style.display = screen === 'register' ? '' : 'none';
            $('authForgot').style.display = screen === 'forgot' ? '' : 'none';
        },
        onboardingNext(step) {
            if (step === 1) {
                const name = document.getElementById('onbName').value.trim();
                if (!name) { toast('Informe seu nome.', 'error'); return; }
                onboardingData.name = name;
                renderOnboardingStep(2);
            } else if (step === 2) {
                renderOnboardingStep(3);
            }
        },
        onboardingBack(step) {
            renderOnboardingStep(step - 1);
        },
        onboardingAddMember() {
            const input = document.getElementById('onbMemberName');
            const name = input.value.trim();
            if (!name) return;
            onboardingData.members.push(name);
            input.value = '';
            renderOnboardingStep(2);
        },
        onboardingRemoveMember(idx) {
            onboardingData.members.splice(idx, 1);
            renderOnboardingStep(2);
        },
        onboardingFinish() {
            const income = parseValue(document.getElementById('onbIncome').value);
            onboardingData.income = income;

            // Save onboarding data
            const user = getAuthUser();
            if (user) {
                user.name = onboardingData.name;
                localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            }

            // Create members
            const members = [{ id: uid(), name: onboardingData.name, role: 'Titular', color: '#3B82F6' }];
            onboardingData.members.forEach(name => {
                members.push({ id: uid(), name, role: 'Dependente', color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') });
            });
            save(KEYS.members, members);

            // Create 12 months of recurrent income if provided
            if (income > 0) {
                const today = new Date();
                const incomes = load(KEYS.incomes);
                const parentId = uid();
                const day = today.getDate();

                for (let i = 0; i < 12; i++) {
                    let m = today.getMonth() + i;
                    let y = today.getFullYear();
                    while (m > 11) { m -= 12; y++; }
                    const mm = String(m + 1).padStart(2, '0');
                    const dd = String(Math.min(day, 28)).padStart(2, '0');

                    incomes.push({
                        id: uid(),
                        date: `${y}-${mm}-${dd}`,
                        value: income,
                        category: 'Salário',
                        source: 'Renda principal',
                        bank: '',
                        memberId: members[0].id,
                        status: i === 0 ? '' : '',
                        recurrenceType: 'recorrente',
                        recurrenceDay: day,
                        recurrenceTotal: null,
                        recurrenceParent: parentId,
                        installmentLabel: '',
                    });
                }
                save(KEYS.incomes, incomes);
            }

            localStorage.setItem('pg_onboarding_done', '1');
            toast('Tudo pronto! Bem-vindo ao ProntoGestão!');
            showApp();
            initApp();
        },
    };

    // Merge auth methods into App after it's defined
    setTimeout(() => {
        Object.assign(window.App, authMethods);
    }, 0);

    // ============================================================
    // SWIPE GESTURE FOR MOBILE CARDS
    // ============================================================
    (function initSwipe() {
        let startX = 0, currentX = 0, swiping = false, swipeEl = null;
        const THRESHOLD = 80;

        document.addEventListener('touchstart', e => {
            const el = e.target.closest('.mobile-item-swipe');
            if (!el) return;
            swipeEl = el.querySelector('.mobile-item-content');
            startX = e.touches[0].clientX;
            currentX = startX;
            swiping = true;
            swipeEl.style.transition = 'none';
        }, { passive: true });

        document.addEventListener('touchmove', e => {
            if (!swiping || !swipeEl) return;
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            const clamped = Math.max(-120, Math.min(120, diff));
            swipeEl.style.transform = `translateX(${clamped}px)`;
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!swiping || !swipeEl) return;
            swiping = false;
            const diff = currentX - startX;
            swipeEl.style.transition = 'transform 0.2s ease';

            const parent = swipeEl.closest('.mobile-item-swipe');
            const resetEl = swipeEl;
            if (diff > THRESHOLD && parent) {
                // Swipe right = edit
                resetEl.style.transform = 'translateX(0)';
                const fn = parent.dataset.edit;
                const id = parent.dataset.id;
                if (fn && id) setTimeout(() => App[fn](id), 100);
            } else if (diff < -THRESHOLD && parent) {
                // Swipe left = delete — show then reset
                resetEl.style.transform = 'translateX(-80px)';
                const fn = parent.dataset.delete;
                const id = parent.dataset.id;
                if (fn && id) {
                    setTimeout(() => {
                        App[fn](id);
                        // Reset position after confirm/cancel
                        setTimeout(() => { resetEl.style.transform = 'translateX(0)'; }, 100);
                    }, 200);
                }
            } else {
                resetEl.style.transform = 'translateX(0)';
            }
            swipeEl = null;
        });
    })();

    // Check auth state
    checkOnboarding();

})();
