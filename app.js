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
    };

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
                { id: uid(), name: 'Pessoa 1', color: '#6c5ce7', role: 'Titular' },
                { id: uid(), name: 'Pessoa 2', color: '#e84393', role: 'Cônjuge' },
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
    $('prevMonthInc').addEventListener('click', prevMonth);
    $('nextMonthInc').addEventListener('click', nextMonth);
    $('prevMonthExp').addEventListener('click', prevMonth);
    $('nextMonthExp').addEventListener('click', nextMonth);
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
            const p = totalOut > 0 ? pct(byCondition[ci.key], totalOut) : 0;
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
                    <div class="group-bar-fill" style="width:${pct(v, maxGroup)}%;background:${GROUP_COLORS[g] || '#6c5ce7'}"></div>
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
        `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Sem dados</p>';

        // Top 10 Gastos
        const sorted = [...expenses].sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 10);
        $('topExpenses').innerHTML = sorted.map((e, i) => `
            <div class="top-expense-item">
                <span class="top-rank">${i + 1}</span>
                <span class="top-desc">${e.description || '-'}</span>
                <span class="top-cat">${e.category || ''}</span>
                <span class="top-val">${currency(e.value)}</span>
            </div>
        `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Sem dados</p>';

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
        populateSelect($('filterIncCat'), cats, 'Todas as Categorias');
        populateSelect($('filterIncBank'), banks, 'Todos os Bancos');

        // Apply filters
        const catF = $('filterIncCat').value;
        const bankF = $('filterIncBank').value;
        const typeF = $('filterIncType').value;
        const searchTerm = ($('searchIncome').value || '').toLowerCase().trim();
        if (catF !== 'all') incomes = incomes.filter(i => i.category === catF);
        if (bankF !== 'all') incomes = incomes.filter(i => i.bank === bankF);
        if (typeF !== 'all') incomes = incomes.filter(i => (i.recurrenceType || 'avulsa') === typeF);
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
            return `<tr>
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
        }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px">Nenhuma entrada neste mês</td></tr>';

        // Summary cards
        $('incTotalCard').textContent = currency(total);
        $('incReceivedCard').textContent = currency(received);
        $('incPendingCard').textContent = currency(pending);
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

        populateSelect($('filterBank'), banks, 'Todos os Bancos');
        populateSelect($('filterPayment'), payments, 'Tipo Pagamento');
        populateSelect($('filterGroup'), groups, 'Todos os Grupos');

        // Apply filters
        const bankF = $('filterBank').value;
        const payF = $('filterPayment').value;
        const groupF = $('filterGroup').value;
        const statusF = $('filterStatus').value;
        const searchTerm = ($('searchExpense').value || '').toLowerCase().trim();

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
            <th class="actions-header">Ações</th>
        </tr>`;

        $('expenseTable').innerHTML = expenses.map(e => {
            const member = members.find(m => m.id === e.memberId);
            const checked = state.selectedExpenses && state.selectedExpenses.has(e.id) ? 'checked' : '';
            return `<tr class="${e.status === 'Pg' ? 'row-paid' : ''}">
                <td><input type="checkbox" class="exp-checkbox exp-row-check" data-id="${e.id}" ${checked} onchange="App.updateBulkCount()"></td>
                <td>${e.bank || '-'}</td>
                <td>${e.paymentType || '-'}</td>
                <td>${dateStr(e.date)}</td>
                <td style="font-weight:600;color:var(--expense)">${currency(e.value)}</td>
                <td>${e.installments || '-'}</td>
                <td>${e.description || '-'}</td>
                <td>${e.category || '-'}</td>
                <td class="actions-cell">
                    <button class="btn-status ${e.status === 'Pg' ? 'confirmed' : ''}" onclick="App.toggleExpenseStatus('${e.id}')">
                        ${e.status === 'Pg' ? '&#10003; Pago' : '&#9711; Pagar'}
                    </button>
                    <button class="btn-action edit" onclick="App.editExpense('${e.id}')">Editar</button>
                    <button class="btn-action danger" onclick="App.deleteExpense('${e.id}')">Excluir</button>
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:30px">Nenhuma saída neste mês</td></tr>';

        // Summary cards
        const paid = expenses.filter(e => e.status === 'Pg').reduce((s, e) => s + Number(e.value), 0);
        const pendingExp = total - paid;
        $('expTotalCard').textContent = currency(total);
        $('expPaidCard').textContent = currency(paid);
        $('expPendingCard').textContent = currency(pendingExp);
        $('expFixoCard').textContent = currency(fixo);
        $('expVarCard').textContent = currency(variavel);
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

                html += `<tr>
                    <td style="padding-left:24px">${c.name}</td>
                    <td>${budgetVal > 0 ? currency(budgetVal) : '-'}</td>
                    <td>${realVal > 0 ? currency(realVal) : '-'}</td>
                    <td class="${varClass}">${budgetVal > 0 || realVal > 0 ? variation + '%' : '-'}</td>
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
        const incomes = filterByMonth(getIncomes(), 'date');
        const expenses = filterByMonth(getExpenses(), 'date');

        $('membersGrid').innerHTML = members.map(m => {
            const mIncome = incomes.filter(i => i.memberId === m.id).reduce((s, i) => s + Number(i.value), 0);
            const mExpense = expenses.filter(e => e.memberId === m.id).reduce((s, e) => s + Number(e.value), 0);
            const initial = m.name.charAt(0).toUpperCase();

            return `<div class="member-card">
                <div class="member-avatar" style="background:${m.color}">${initial}</div>
                <div class="member-name">${m.name}</div>
                <div class="member-role">${m.role || ''}</div>
                <div class="member-stats">
                    <div class="member-stat">
                        <span class="stat-label">Receitas</span>
                        <span class="stat-value income">${currency(mIncome)}</span>
                    </div>
                    <div class="member-stat">
                        <span class="stat-label">Despesas</span>
                        <span class="stat-value expense">${currency(mExpense)}</span>
                    </div>
                </div>
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
        }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px">Nenhuma categoria com uso. Ative "Mostrar zeradas" para ver todas.</td></tr>';

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
            if (!name) return;
            const existing = getAllCategories().find(c => c.name.toLowerCase() === name.toLowerCase());
            if (existing) { alert('Já existe uma conta com esse nome.'); return; }

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
            healthTitle.style.color = 'var(--need)';
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
            onSave();
            closeModal();
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
                    <input type="text" inputmode="decimal" id="fIncValue" value="${i.value || ''}" placeholder="0,00">
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
                    <label>Data</label>
                    <input type="date" id="fIncDate" value="${i.date || ''}">
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
            ${isGenerated ? '<p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">Este lançamento foi gerado automaticamente. Edite apenas valor e status.</p>' : ''}
        `;

        openModal(isEdit ? 'Editar Entrada' : 'Nova Entrada', body, () => {
            const recType = $('fIncType').value;
            const data = {
                id: i.id || uid(),
                date: $('fIncDate').value,
                value: parseValue($('fIncValue').value),
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
                        if (siblings.length > 0) {
                            const applyAll = confirm('Essa entrada faz parte de uma recorrência.\n\nAplicar a alteração em TODAS?\n\n• OK = Alterar todas\n• Cancelar = Alterar só esta');
                            if (applyAll) {
                                siblings.forEach(sib => {
                                    sib.value = data.value;
                                    sib.bank = data.bank;
                                    sib.category = data.category;
                                    sib.source = data.source;
                                    sib.memberId = data.memberId;
                                });
                            }
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
                if (v === 'recorrente') {
                    recRow.style.display = '';
                    instGroup.style.display = 'none';
                    dateRow.style.display = 'none';
                } else if (v === 'parcelada') {
                    recRow.style.display = '';
                    instGroup.style.display = '';
                    dateRow.style.display = 'none';
                } else {
                    recRow.style.display = 'none';
                    dateRow.style.display = '';
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
    }

    // --- Expense Modal ---
    function openExpenseModal(expense) {
        const members = getMembers();
        const isEdit = !!expense;
        const e = expense || {};
        const isGeneratedInstallment = e.installmentParent;

        const catOptions = getAllCategories().map(c =>
            `<option value="${c.name}" ${e.category === c.name ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label>Data da Compra</label>
                    <input type="date" id="fExpDate" value="${e.date || ''}">
                </div>
                <div class="form-group">
                    <label>Valor da Parcela</label>
                    <input type="text" inputmode="decimal" id="fExpValue" value="${e.value || ''}" placeholder="0,00">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Banco / Cartão</label>
                    <select id="fExpBank">
                        <option value="">Selecione</option>
                        ${BANKS.map(b => `<option value="${b}" ${e.bank === b ? 'selected' : ''}>${b}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tipo Pagamento</label>
                    <select id="fExpPayment">
                        ${PAYMENT_TYPES.map(p => `<option value="${p}" ${e.paymentType === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Estabelecimento</label>
                    <input type="text" id="fExpDesc" value="${e.description || ''}" placeholder="Nome do estabelecimento">
                </div>
                <div class="form-group">
                    <label>Plano de Contas</label>
                    <select id="fExpCat">${catOptions}</select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Parcelado?</label>
                    <select id="fExpIsInstallment" ${isGeneratedInstallment ? 'disabled' : ''}>
                        <option value="nao" ${!e.installments ? 'selected' : ''}>Não (à vista)</option>
                        <option value="sim" ${e.installments ? 'selected' : ''}>Sim, parcelado</option>
                    </select>
                </div>
                <div class="form-group" id="installmentCountGroup" style="${e.installments ? '' : 'display:none'}">
                    <label>Quantidade de Parcelas</label>
                    <input type="number" min="2" max="72" id="fExpInstallCount" value="${e.installments ? e.installments.split('/')[1] || '' : ''}" placeholder="Ex: 10" ${isGeneratedInstallment ? 'disabled' : ''}>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Membro</label>
                    <select id="fExpMember">
                        ${members.map(m => `<option value="${m.id}" ${e.memberId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="fExpStatus">
                        <option value="" ${!e.status ? 'selected' : ''}>Pendente</option>
                        <option value="Pg" ${e.status === 'Pg' ? 'selected' : ''}>Pago</option>
                    </select>
                </div>
            </div>
            ${isGeneratedInstallment ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">Parcela ${e.installments} - gerada automaticamente. Edite valor e status.</p>` : ''}
        `;

        openModal(isEdit ? 'Editar Saída' : 'Nova Saída', body, () => {
            const isInstallment = $('fExpIsInstallment').value === 'sim';
            const installCount = parseInt($('fExpInstallCount').value) || 0;

            const data = {
                id: e.id || uid(),
                date: $('fExpDate').value,
                value: parseValue($('fExpValue').value),
                bank: $('fExpBank').value,
                paymentType: $('fExpPayment').value,
                category: $('fExpCat').value,
                installments: isInstallment && installCount > 1 ? `1/${installCount}` : '',
                description: $('fExpDesc').value,
                memberId: $('fExpMember').value,
                status: $('fExpStatus').value,
                installmentParent: e.installmentParent || null,
            };

            if (!isEdit && isInstallment && installCount > 1) {
                generateInstallmentExpenses(data, installCount);
            } else {
                const items = getExpenses();
                const idx = items.findIndex(x => x.id === data.id);
                if (idx >= 0) {
                    const parentId = e.installmentParent;
                    if (parentId && isEdit) {
                        const siblings = items.filter(x => x.installmentParent === parentId && x.id !== data.id);
                        if (siblings.length > 0) {
                            const applyAll = confirm('Essa saída faz parte de um parcelamento.\n\nAplicar a alteração em TODAS as parcelas?\n\n• OK = Alterar todas\n• Cancelar = Alterar só esta');
                            if (applyAll) {
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
                    }
                    items[idx] = data;
                } else {
                    items.push(data);
                }
                save(KEYS.expenses, items);
            }
            renderCurrentPage();
        });

        // Toggle installment field
        setTimeout(() => {
            const sel = $('fExpIsInstallment');
            if (!sel) return;
            sel.addEventListener('change', () => {
                $('installmentCountGroup').style.display = sel.value === 'sim' ? '' : 'none';
            });
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
                    <input type="color" id="fMemColor" value="${m.color || '#6c5ce7'}">
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
    $('searchIncome').addEventListener('input', renderEntradas);

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
                        renderCurrentPage();
                        return;
                    }
                }
            }
            if (!confirm('Excluir esta entrada?')) return;
            save(KEYS.incomes, items.filter(i => i.id !== id));
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
                        renderCurrentPage();
                        return;
                    }
                }
            }
            if (!confirm('Excluir esta saída?')) return;
            save(KEYS.expenses, items.filter(e => e.id !== id));
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
            if (members.length <= 1) { alert('Precisa ter pelo menos 1 membro.'); return; }
            if (!confirm('Remover este membro?')) return;
            save(KEYS.members, members.filter(m => m.id !== id));
            populateMemberFilter();
            renderCurrentPage();
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
            if (!customs.find(c => c.name === name)) { alert('Só é possível excluir contas customizadas.'); return; }
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
            if (state.selectedExpenses.size === 0) { alert('Selecione pelo menos um item.'); return; }
            const items = getExpenses();
            items.forEach(e => { if (state.selectedExpenses.has(e.id)) e.status = 'Pg'; });
            save(KEYS.expenses, items);
            state.selectedExpenses = new Set();
            renderSaidas();
        },
        bulkUnpaySelected() {
            if (state.selectedExpenses.size === 0) { alert('Selecione pelo menos um item.'); return; }
            const items = getExpenses();
            items.forEach(e => { if (state.selectedExpenses.has(e.id)) e.status = ''; });
            save(KEYS.expenses, items);
            state.selectedExpenses = new Set();
            renderSaidas();
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
            if (!valor || !banco) { alert('Informe o valor e o banco da fatura.'); return; }

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
        if (theme === 'light') {
            icon.textContent = '\u2600';
            label.textContent = 'Modo Escuro';
        } else {
            icon.textContent = '\u263D';
            label.textContent = 'Modo Claro';
        }
    }

    $('themeToggle').addEventListener('click', () => {
        const current = localStorage.getItem('pg_theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    // ============================================================
    // INIT
    // ============================================================
    loadTheme();
    populateMemberFilter();
    updateMonthDisplay();
    renderDashboard();

})();
