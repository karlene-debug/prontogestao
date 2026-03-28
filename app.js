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
            const cat = CATEGORIES.find(c => c.name === e.category);
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
            const cat = CATEGORIES.find(c => c.name === e.category);
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
            <th>Membro</th>
            <th>Recebimento</th>
            <th>Ações</th>
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
                <td>${member ? member.name : '-'}</td>
                <td>
                    <button class="btn-status ${i.status === 'Pg' ? 'confirmed' : ''}" onclick="App.toggleIncomeStatus('${i.id}')" title="${i.status === 'Pg' ? 'Recebido - clique para desfazer' : 'Clique para confirmar recebimento'}">
                        ${i.status === 'Pg' ? '&#10003; Recebido' : '&#9711; Confirmar'}
                    </button>
                </td>
                <td>
                    <button class="btn-icon" onclick="App.editIncome('${i.id}')" title="Editar">&#9998;</button>
                    <button class="btn-icon delete" onclick="App.deleteIncome('${i.id}')" title="Excluir">&#10005;</button>
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:30px">Nenhuma entrada neste mês</td></tr>';

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
            const cat = CATEGORIES.find(c => c.name === e.category);
            return cat ? cat.group : '';
        }).filter(Boolean))];

        populateSelect($('filterBank'), banks, 'Todos os Bancos');
        populateSelect($('filterPayment'), payments, 'Tipo Pagamento');
        populateSelect($('filterGroup'), groups, 'Todos os Grupos');

        // Apply filters
        const bankF = $('filterBank').value;
        const payF = $('filterPayment').value;
        const groupF = $('filterGroup').value;
        const searchTerm = ($('searchExpense').value || '').toLowerCase().trim();

        if (bankF !== 'all') expenses = expenses.filter(e => e.bank === bankF);
        if (payF !== 'all') expenses = expenses.filter(e => e.paymentType === payF);
        if (groupF !== 'all') expenses = expenses.filter(e => {
            const cat = CATEGORIES.find(c => c.name === e.category);
            return cat && cat.group === groupF;
        });
        if (searchTerm) expenses = expenses.filter(e =>
            (e.description || '').toLowerCase().includes(searchTerm) ||
            (e.category || '').toLowerCase().includes(searchTerm)
        );

        const total = expenses.reduce((s, e) => s + Number(e.value), 0);
        const fixo = expenses.filter(e => {
            const cat = CATEGORIES.find(c => c.name === e.category);
            return cat && cat.type === 'Fixo';
        }).reduce((s, e) => s + Number(e.value), 0);
        const variavel = total - fixo;

        // Sort
        expenses = sortItems(expenses, 'expenses', 'date');

        // Sortable headers
        $('expenseHead').innerHTML = `<tr>
            ${sortHeader('expenses', 'bank', 'Banco')}
            ${sortHeader('expenses', 'paymentType', 'Tipo Pgto')}
            ${sortHeader('expenses', 'date', 'Data')}
            ${sortHeader('expenses', 'value', 'Valor')}
            ${sortHeader('expenses', 'installments', 'Parcelas')}
            ${sortHeader('expenses', 'description', 'Estabelecimento')}
            ${sortHeader('expenses', 'category', 'Plano de Contas')}
            <th>Membro</th>
            ${sortHeader('expenses', 'status', 'Status')}
            <th>Ações</th>
        </tr>`;

        $('expenseTable').innerHTML = expenses.map(e => {
            const member = members.find(m => m.id === e.memberId);
            return `<tr>
                <td>${e.bank || '-'}</td>
                <td>${e.paymentType || '-'}</td>
                <td>${dateStr(e.date)}</td>
                <td style="font-weight:600;color:var(--expense)">${currency(e.value)}</td>
                <td>${e.installments || '-'}</td>
                <td>${e.description || '-'}</td>
                <td>${e.category || '-'}</td>
                <td>${member ? member.name : '-'}</td>
                <td><span class="status-badge ${e.status === 'Pg' ? 'paid' : 'pending'}">${e.status === 'Pg' ? 'Pago' : 'Pendente'}</span></td>
                <td>
                    <button class="btn-icon" onclick="App.editExpense('${e.id}')" title="Editar">&#9998;</button>
                    <button class="btn-icon" onclick="App.duplicateExpense('${e.id}')" title="Duplicar">&#10697;</button>
                    <button class="btn-icon delete" onclick="App.deleteExpense('${e.id}')" title="Excluir">&#10005;</button>
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:30px">Nenhuma saída neste mês</td></tr>';

        // Summary cards
        $('expTotalCard').textContent = currency(total);
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
            const cats = CATEGORIES.filter(c => c.group === group);
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
        // Categories table
        $('planTable').innerHTML = CATEGORIES.map(c => `
            <tr>
                <td>${c.name}</td>
                <td>${c.type}</td>
                <td><span style="color:${GROUP_COLORS[c.group] || '#aaa'}">${c.group}</span></td>
                <td>${c.condition}</td>
            </tr>
        `).join('');

        // Budget inputs
        const budgets = getBudgets();
        const monthKey = state.currentYear + '-' + String(state.currentMonth + 1).padStart(2, '0');

        $('budgetInputs').innerHTML = GROUPS.map(g => {
            const cats = CATEGORIES.filter(c => c.group === g);
            return cats.map(c => {
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
                    <input type="number" step="0.01" id="fIncValue" value="${i.value || ''}" placeholder="0,00">
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
                value: parseFloat($('fIncValue').value) || 0,
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
                if (idx >= 0) items[idx] = data; else items.push(data);
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

        const catOptions = CATEGORIES.map(c =>
            `<option value="${c.name}" ${e.category === c.name ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="fExpDate" value="${e.date || ''}">
                </div>
                <div class="form-group">
                    <label>Valor</label>
                    <input type="number" step="0.01" id="fExpValue" value="${e.value || ''}" placeholder="0,00">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Banco</label>
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
                    <label>Plano de Contas</label>
                    <select id="fExpCat">${catOptions}</select>
                </div>
                <div class="form-group">
                    <label>Parcelas</label>
                    <input type="text" id="fExpInstall" value="${e.installments || ''}" placeholder="Ex: 3/10">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Estabelecimento</label>
                    <input type="text" id="fExpDesc" value="${e.description || ''}" placeholder="Nome do estabelecimento">
                </div>
                <div class="form-group">
                    <label>Membro</label>
                    <select id="fExpMember">
                        ${members.map(m => `<option value="${m.id}" ${e.memberId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="fExpStatus">
                    <option value="" ${!e.status ? 'selected' : ''}>Pendente</option>
                    <option value="Pg" ${e.status === 'Pg' ? 'selected' : ''}>Pago</option>
                </select>
            </div>
        `;

        openModal(isEdit ? 'Editar Saída' : 'Nova Saída', body, () => {
            const data = {
                id: e.id || uid(),
                date: $('fExpDate').value,
                value: parseFloat($('fExpValue').value) || 0,
                bank: $('fExpBank').value,
                paymentType: $('fExpPayment').value,
                category: $('fExpCat').value,
                installments: $('fExpInstall').value,
                description: $('fExpDesc').value,
                memberId: $('fExpMember').value,
                status: $('fExpStatus').value,
            };

            const items = getExpenses();
            const idx = items.findIndex(x => x.id === data.id);
            if (idx >= 0) items[idx] = data; else items.push(data);
            save(KEYS.expenses, items);
            renderCurrentPage();
        });
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
    $('searchExpense').addEventListener('input', renderSaidas);
    $('filterIncCat').addEventListener('change', renderEntradas);
    $('filterIncBank').addEventListener('change', renderEntradas);
    $('filterIncType').addEventListener('change', renderEntradas);
    $('searchIncome').addEventListener('input', renderEntradas);

    // --- Button listeners ---
    $('btnAddIncome').addEventListener('click', () => openIncomeModal(null));
    $('btnAddExpense').addEventListener('click', () => openExpenseModal(null));
    $('btnAddMember').addEventListener('click', () => openMemberModal(null));

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
        deleteIncome(id) {
            if (!confirm('Excluir esta entrada?')) return;
            save(KEYS.incomes, getIncomes().filter(i => i.id !== id));
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
            if (!confirm('Excluir esta saída?')) return;
            save(KEYS.expenses, getExpenses().filter(e => e.id !== id));
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
            const data = { category, monthKey, value: parseFloat(value) || 0 };
            if (idx >= 0) budgets[idx] = data; else budgets.push(data);
            save(KEYS.budgets, budgets);
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
    };

    // ============================================================
    // INIT
    // ============================================================
    populateMemberFilter();
    updateMonthDisplay();
    renderDashboard();

})();
