// ============================================================
// SEED.JS - Dados iniciais baseados na planilha
// Carrega apenas se localStorage estiver vazio
// ============================================================

(function () {
    'use strict';

    // Só executa se não tiver dados
    if (localStorage.getItem('pg_members')) return;

    // --- MEMBROS ---
    const MEMBER_1 = 'mem_karlene';
    const members = [
        { id: MEMBER_1, name: 'Karlene', color: '#6c5ce7', role: 'Titular' },
    ];

    // --- ENTRADAS 2026 (12 meses x 2 fontes) ---
    const parentRP = 'rec_rp_2026';
    const parentPA = 'rec_pa_2026';
    const incomes = [];
    for (let m = 0; m < 12; m++) {
        const mm = String(m + 1).padStart(2, '0');
        const status = m < 3 ? 'Pg' : '';

        incomes.push({
            id: 'inc_rp_' + mm,
            date: `2026-${mm}-01`,
            value: 12680,
            bank: 'Nubank',
            category: 'Renda Principal',
            source: 'Atlas',
            memberId: MEMBER_1,
            status: status,
            recurrenceType: 'recorrente',
            recurrenceDay: 1,
            recurrenceTotal: null,
            recurrenceParent: parentRP,
            installmentLabel: '',
        });
        incomes.push({
            id: 'inc_pa_' + mm,
            date: `2026-${mm}-01`,
            value: 5000,
            bank: 'BB',
            category: 'Pensão Alimentícia',
            source: '',
            memberId: MEMBER_1,
            status: status,
            recurrenceType: 'recorrente',
            recurrenceDay: 1,
            recurrenceTotal: null,
            recurrenceParent: parentPA,
            installmentLabel: '',
        });
    }

    // --- SAÍDAS MARÇO 2026 (dados reais da planilha) ---
    const expenses = [
        // Itaú Black - vencimento 04/03/2026
        { id: 'exp_001', date: '2026-03-04', value: 228.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Cuidados Pessoais', installments: '10/10', description: 'Instituto AOD', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_002', date: '2026-03-04', value: 287.84, bank: 'Itaú', paymentType: 'Crédito', category: 'Oportunidades/Risco', installments: '5/10', description: 'Total Acesso (Rodeio)', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_003', date: '2026-03-04', value: 356.65, bank: 'Itaú', paymentType: 'Crédito', category: 'Documentação e Seguro', installments: '2/10', description: 'Bradesco Seguro', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_004', date: '2026-03-04', value: 187.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Material e Uniforme', installments: '2/2', description: 'Riachuelo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_005', date: '2026-03-04', value: 213.41, bank: 'Itaú', paymentType: 'Crédito', category: 'Material e Uniforme', installments: '2/4', description: 'Dellamole', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_006', date: '2026-03-04', value: 139.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Material e Uniforme', installments: '2/3', description: 'Kalunga', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_007', date: '2026-03-04', value: 115.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Vestuário Filhos', installments: '2/2', description: 'JO - Chuteira Igor', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_008', date: '2026-03-04', value: 163.60, bank: 'Itaú', paymentType: 'Crédito', category: 'Ferramentas e Carreira', installments: '', description: 'Google Workspace', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_009', date: '2026-03-04', value: 120.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Reembolso', installments: '', description: 'Apple.com', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_010', date: '2026-03-04', value: 66.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Ferramentas e Carreira', installments: '', description: 'Apple.com', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_011', date: '2026-03-04', value: 40.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Assinaturas/Streaming', installments: '', description: 'Spotify', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_012', date: '2026-03-04', value: 50.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Pedágios/Estacionamentos/Multas', installments: '', description: 'TagItaú', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_013', date: '2026-03-04', value: 7.99, bank: 'Itaú', paymentType: 'Crédito', category: 'Juros e Tarifas', installments: '', description: 'Envio msg', memberId: MEMBER_1, status: 'Pg' },

        // Itaú Azul - vencimento 06/03/2026
        { id: 'exp_014', date: '2026-03-06', value: 149.50, bank: 'Itaú', paymentType: 'Crédito', category: 'Vestuário Filhos', installments: '2/2', description: 'Cros', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_015', date: '2026-03-06', value: 219.85, bank: 'Itaú', paymentType: 'Crédito', category: 'Vestuário', installments: '2/2', description: 'Pisom Calçados', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_016', date: '2026-03-06', value: 2.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Suprema Alimentação', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_017', date: '2026-03-06', value: 6.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'GrassyCafé', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_018', date: '2026-03-06', value: 11.50, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Wanda', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_019', date: '2026-03-06', value: 178.55, bank: 'Itaú', paymentType: 'Crédito', category: 'Farmácia', installments: '', description: 'Drogaria São Carlos', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_020', date: '2026-03-06', value: 59.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Assinaturas/Streaming', installments: '', description: 'Netflix', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_021', date: '2026-03-06', value: 14.43, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Borges Oliveira', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_022', date: '2026-03-06', value: 10.79, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Borges Oliveira', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_023', date: '2026-03-06', value: 218.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Cuidados Pessoais', installments: '', description: 'Aegyms', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_024', date: '2026-03-06', value: 151.80, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Kisushi', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_025', date: '2026-03-06', value: 15.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'GrassyCafé', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_026', date: '2026-03-06', value: 13.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'GrassyCafé', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_027', date: '2026-03-06', value: 99.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Ferramentas e Carreira', installments: '', description: 'Loom Subscription', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_028', date: '2026-03-06', value: 3.50, bank: 'Itaú', paymentType: 'Crédito', category: 'Ferramentas e Carreira', installments: '', description: 'IOF', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_029', date: '2026-03-06', value: 65.74, bank: 'Itaú', paymentType: 'Crédito', category: 'Vestuário Filhos', installments: '', description: 'Mercado Livre', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_030', date: '2026-03-06', value: 311.40, bank: 'Itaú', paymentType: 'Crédito', category: 'Combustível', installments: '', description: 'Cgterra', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_031', date: '2026-03-06', value: 6.50, bank: 'Itaú', paymentType: 'Crédito', category: 'Assinaturas/Streaming', installments: '', description: 'Apple', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_032', date: '2026-03-06', value: 81.65, bank: 'Itaú', paymentType: 'Crédito', category: 'Farmácia', installments: '', description: 'Drogal', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_033', date: '2026-03-06', value: 51.63, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Suprema Alimentação', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_034', date: '2026-03-06', value: 62.39, bank: 'Itaú', paymentType: 'Crédito', category: 'Reposição de Casa', installments: '', description: 'S.A. Premium', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_035', date: '2026-03-06', value: 211.46, bank: 'Itaú', paymentType: 'Crédito', category: 'Cuidados Pessoais', installments: '1/10', description: 'Ramavi', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_036', date: '2026-03-06', value: 40.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Material e Uniforme', installments: '', description: 'PAYGO garrafinha', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_037', date: '2026-03-06', value: 32.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Cuidados Pessoais', installments: '', description: 'M A S WU LTDA', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_038', date: '2026-03-06', value: 120.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Vestuário Filhos', installments: '', description: 'Edivana Botelho - Crocs crianças', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_039', date: '2026-03-06', value: 30.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Pedágios/Estacionamentos/Multas', installments: '', description: 'PBA Administradora', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_040', date: '2026-03-06', value: 58.94, bank: 'Itaú', paymentType: 'Crédito', category: 'Supermercado', installments: '', description: 'Big Compras', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_041', date: '2026-03-06', value: 3842.45, bank: 'Itaú', paymentType: 'Crédito', category: 'Mensalidade/Transp. Escolar/Lanche', installments: '', description: 'Colégio Novo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_042', date: '2026-03-06', value: 10.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Borges e Oliveira', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_043', date: '2026-03-06', value: 6.50, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Boliche do Gorilão', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_044', date: '2026-03-06', value: 55.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Boliche do Gorilão', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_045', date: '2026-03-06', value: 13.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Boliche do Gorilão', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_046', date: '2026-03-06', value: 100.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Boliche do Gorilão', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_047', date: '2026-03-06', value: 13.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Boliche do Gorilão', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_048', date: '2026-03-06', value: 12.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Av 9 de Julho', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_049', date: '2026-03-06', value: 29.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Mercado Livre EstarHope', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_050', date: '2026-03-06', value: 35.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Camila Gabrielle', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_051', date: '2026-03-06', value: 17.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Ig Takeandgo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_052', date: '2026-03-06', value: 17.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Ig Takeandgo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_053', date: '2026-03-06', value: 17.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Ig Takeandgo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_054', date: '2026-03-06', value: 69.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Mister Churros', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_055', date: '2026-03-06', value: 70.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Camila Gabrielle', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_056', date: '2026-03-06', value: 18.80, bank: 'Itaú', paymentType: 'Crédito', category: 'Lazer Filhos', installments: '', description: 'Banca de feira', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_057', date: '2026-03-06', value: 62.32, bank: 'Itaú', paymentType: 'Crédito', category: 'Reposição de Casa', installments: '', description: 'Casa Tua', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_058', date: '2026-03-06', value: 23.29, bank: 'Itaú', paymentType: 'Crédito', category: 'Reposição de Casa', installments: '', description: 'Casa Tua', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_059', date: '2026-03-06', value: 65.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Reposição de Casa', installments: '', description: 'Casa Tua', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_060', date: '2026-03-06', value: 30.33, bank: 'Itaú', paymentType: 'Crédito', category: 'Reposição de Casa', installments: '', description: 'Casa Tua', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_061', date: '2026-03-06', value: 17.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Cuidados Pessoais', installments: '', description: 'Ramavi', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_062', date: '2026-03-06', value: 310.15, bank: 'Itaú', paymentType: 'Crédito', category: 'Cuidados Pessoais', installments: '', description: 'Ramavi', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_063', date: '2026-03-06', value: 160.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Reposição de Casa', installments: '', description: 'Fabio Henrique', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_064', date: '2026-03-06', value: 47.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Assiny Empreendimentos', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_065', date: '2026-03-06', value: 363.57, bank: 'Itaú', paymentType: 'Crédito', category: 'Combustível', installments: '', description: 'Cgterra', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_066', date: '2026-03-06', value: 105.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Juros e Tarifas', installments: '', description: 'Anuidade', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_067', date: '2026-03-06', value: 10.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Borges e Oliveira', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_068', date: '2026-03-06', value: 15.13, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Panifi Nsa', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_069', date: '2026-03-06', value: 390.32, bank: 'Itaú', paymentType: 'Crédito', category: 'Supermercado', installments: '', description: 'Assaí Atacadista', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_070', date: '2026-03-06', value: 46.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Suprema Alimentação', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_071', date: '2026-03-06', value: 6.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Restaurantes/Bares', installments: '', description: 'Grassy Café', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_072', date: '2026-03-06', value: 97.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Reposição de Casa', installments: '', description: 'Grassy Café', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_073', date: '2026-03-06', value: 139.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Presentes', installments: '1/10', description: 'On Sportswear', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_074', date: '2026-03-06', value: 5.60, bank: 'Itaú', paymentType: 'Crédito', category: 'Reposição de Casa', installments: '', description: 'Borges e Oliveira', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_075', date: '2026-03-06', value: 117.39, bank: 'Itaú', paymentType: 'Crédito', category: 'Ferramentas e Carreira', installments: '', description: 'Claude', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_076', date: '2026-03-06', value: -52.50, bank: 'Itaú', paymentType: 'Crédito', category: 'Juros e Tarifas', installments: '', description: 'Estorno anuidade', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_077', date: '2026-03-06', value: 4.10, bank: 'Itaú', paymentType: 'Crédito', category: 'Juros e Tarifas', installments: '', description: 'IOF', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_078', date: '2026-03-06', value: 7.99, bank: 'Itaú', paymentType: 'Crédito', category: 'Juros e Tarifas', installments: '', description: 'Envio de msg', memberId: MEMBER_1, status: 'Pg' },

        // Janeiro 2026 - fixas
        { id: 'exp_100', date: '2026-01-05', value: 139.99, bank: 'BB', paymentType: 'Pix', category: 'Internet/Celular', installments: '', description: 'Vivo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_101', date: '2026-01-10', value: 3842.45, bank: 'Itaú', paymentType: 'Crédito', category: 'Mensalidade/Transp. Escolar/Lanche', installments: '', description: 'Colégio Novo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_102', date: '2026-01-05', value: 583.61, bank: 'Nubank', paymentType: 'Boleto', category: 'Aluguel/Condomínio/IPTU', installments: '', description: 'Condomínio', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_103', date: '2026-01-08', value: 274.96, bank: 'BB', paymentType: 'Pix', category: 'Contas de Consumo', installments: '', description: 'CPFL Energia', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_104', date: '2026-01-15', value: 756.92, bank: 'BB', paymentType: 'Pix', category: 'Obrigações Tributárias', installments: '', description: 'Prolabore', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_105', date: '2026-01-15', value: 270.00, bank: 'BB', paymentType: 'Pix', category: 'Obrigações Tributárias', installments: '', description: 'DAS', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_106', date: '2026-01-12', value: 210.00, bank: 'BB', paymentType: 'Pix', category: 'Manutenção da Casa', installments: '', description: 'Piscineiro', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_107', date: '2026-01-20', value: 386.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Plano de Saúde/Seguro de Vida', installments: '', description: 'MetLife', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_108', date: '2026-01-06', value: 604.98, bank: 'Itaú', paymentType: 'Crédito', category: 'Supermercado', installments: '', description: 'Assaí Atacadista', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_109', date: '2026-01-18', value: 245.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Combustível', installments: '', description: 'Posto Shell', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_110', date: '2026-01-25', value: 242.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Combustível', installments: '', description: 'Posto Ipiranga', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_111', date: '2026-01-07', value: 44.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Assinaturas/Streaming', installments: '', description: 'Netflix', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_112', date: '2026-01-10', value: 1890.00, bank: 'Nubank', paymentType: 'Pix', category: 'Serviços Domésticos', installments: '', description: 'Angela (doméstica)', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_113', date: '2026-01-22', value: 350.00, bank: 'BB', paymentType: 'Pix', category: 'Serviços Domésticos', installments: '', description: 'Fátima Aparecida', memberId: MEMBER_1, status: 'Pg' },

        // Fevereiro 2026 - fixas
        { id: 'exp_200', date: '2026-02-05', value: 139.99, bank: 'BB', paymentType: 'Pix', category: 'Internet/Celular', installments: '', description: 'Vivo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_201', date: '2026-02-10', value: 3842.45, bank: 'Itaú', paymentType: 'Crédito', category: 'Mensalidade/Transp. Escolar/Lanche', installments: '', description: 'Colégio Novo', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_202', date: '2026-02-05', value: 583.61, bank: 'Nubank', paymentType: 'Boleto', category: 'Aluguel/Condomínio/IPTU', installments: '', description: 'Condomínio', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_203', date: '2026-02-08', value: 180.69, bank: 'BB', paymentType: 'Pix', category: 'Contas de Consumo', installments: '', description: 'CPFL Energia', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_204', date: '2026-02-15', value: 756.92, bank: 'BB', paymentType: 'Pix', category: 'Obrigações Tributárias', installments: '', description: 'Prolabore', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_205', date: '2026-02-15', value: 270.00, bank: 'BB', paymentType: 'Pix', category: 'Obrigações Tributárias', installments: '', description: 'DAS', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_206', date: '2026-02-12', value: 210.00, bank: 'BB', paymentType: 'Pix', category: 'Manutenção da Casa', installments: '', description: 'Piscineiro', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_207', date: '2026-02-20', value: 386.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Plano de Saúde/Seguro de Vida', installments: '', description: 'MetLife', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_208', date: '2026-02-06', value: 722.07, bank: 'Itaú', paymentType: 'Crédito', category: 'Supermercado', installments: '', description: 'Assaí Atacadista', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_209', date: '2026-02-10', value: 327.74, bank: 'Itaú', paymentType: 'Crédito', category: 'Supermercado', installments: '', description: 'Savegnago', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_210', date: '2026-02-18', value: 290.68, bank: 'Itaú', paymentType: 'Crédito', category: 'Combustível', installments: '', description: 'Cgterra', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_211', date: '2026-02-25', value: 255.29, bank: 'Itaú', paymentType: 'Crédito', category: 'Combustível', installments: '', description: 'Posto Shell', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_212', date: '2026-02-07', value: 44.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Assinaturas/Streaming', installments: '', description: 'Netflix', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_213', date: '2026-02-07', value: 21.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Assinaturas/Streaming', installments: '', description: 'Spotify', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_214', date: '2026-02-10', value: 1890.00, bank: 'Nubank', paymentType: 'Pix', category: 'Serviços Domésticos', installments: '', description: 'Angela (doméstica)', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_215', date: '2026-02-14', value: 219.12, bank: 'Itaú', paymentType: 'Crédito', category: 'Documentação e Seguro', installments: '', description: 'Bradesco Seguro', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_216', date: '2026-02-16', value: 82.95, bank: 'BB', paymentType: 'Pix', category: 'Contas de Consumo', installments: '', description: 'Saerp Água', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_217', date: '2026-02-20', value: 209.90, bank: 'Itaú', paymentType: 'Crédito', category: 'Cuidados Pessoais', installments: '', description: 'TotalPass', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_218', date: '2026-02-22', value: 250.00, bank: 'BB', paymentType: 'Pix', category: 'Serviços Domésticos', installments: '', description: 'Fátima Aparecida', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_219', date: '2026-02-28', value: 1716.00, bank: 'Itaú', paymentType: 'Crédito', category: 'Viagens', installments: '', description: 'Airbnb', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_220', date: '2026-02-14', value: 344.66, bank: 'Itaú', paymentType: 'Crédito', category: 'Ingressos e Passeios', installments: '', description: 'Rodeio - Total Acesso', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_221', date: '2026-02-14', value: 344.66, bank: 'Itaú', paymentType: 'Crédito', category: 'Ingressos e Passeios', installments: '', description: 'Rodeio - Total Acesso', memberId: MEMBER_1, status: 'Pg' },
        { id: 'exp_222', date: '2026-02-15', value: 409.84, bank: 'Itaú', paymentType: 'Crédito', category: 'Pedágios/Estacionamentos/Multas', installments: '', description: 'Sem Parar', memberId: MEMBER_1, status: 'Pg' },
    ];

    // --- ORÇAMENTOS ANUAIS (baseado na aba Orçado x Realizado) ---
    const budgets = [];
    const budgetData = {
        'Supermercado': 1200,
        'Reposição de Casa': 150,
        'Aluguel/Condomínio/IPTU': 800,
        'Contas de Consumo': 250,
        'Internet/Celular': 160,
        'Manutenção da Casa': 100,
        'Serviços Domésticos': 1295,
        'Ferramentas e Carreira': 82,
        'Obrigações Tributárias': 1281,
        'Mensalidade/Transp. Escolar/Lanche': 4060,
        'Material e Uniforme': 133,
        'Saúde/Cuidados Filhos': 33,
        'Atividades Extras': 200,
        'Vestuário Filhos': 250,
        'Mesada': 100,
        'Plano de Saúde/Seguro de Vida': 290,
        'Combustível': 913,
        'Documentação e Seguro': 299,
        'Manutenção Veículo': 100,
        'Transporte Público/App': 50,
    };

    for (let m = 0; m < 12; m++) {
        const monthKey = '2026-' + String(m + 1).padStart(2, '0');
        Object.entries(budgetData).forEach(([cat, val]) => {
            budgets.push({ category: cat, monthKey, value: val });
        });
    }

    // --- GERAR PARCELAS FUTURAS ---
    // Para cada despesa com parcelas (ex: "2/10"), gerar os meses seguintes
    const baseExpenses = [...expenses];
    baseExpenses.forEach(e => {
        if (!e.installments || !e.installments.includes('/')) return;
        const parts = e.installments.split('/');
        const current = parseInt(parts[0]);
        const total = parseInt(parts[1]);
        if (isNaN(current) || isNaN(total) || current >= total) return;

        const baseDate = new Date(e.date + 'T00:00:00');
        const baseDay = baseDate.getDate();

        for (let i = 1; i <= (total - current); i++) {
            let futureMonth = baseDate.getMonth() + i;
            let futureYear = baseDate.getFullYear();
            while (futureMonth > 11) { futureMonth -= 12; futureYear++; }
            const mm = String(futureMonth + 1).padStart(2, '0');
            const dd = String(Math.min(baseDay, 28)).padStart(2, '0');

            expenses.push({
                id: e.id + '_p' + (current + i),
                date: `${futureYear}-${mm}-${dd}`,
                value: e.value,
                bank: e.bank,
                paymentType: e.paymentType,
                category: e.category,
                installments: `${current + i}/${total}`,
                description: e.description,
                memberId: e.memberId,
                status: '',
            });
        }
    });

    // --- SALVAR TUDO ---
    localStorage.setItem('pg_members', JSON.stringify(members));
    localStorage.setItem('pg_incomes', JSON.stringify(incomes));
    localStorage.setItem('pg_expenses', JSON.stringify(expenses));
    localStorage.setItem('pg_budgets', JSON.stringify(budgets));

    console.log('ProntoGestão: Dados iniciais carregados da planilha! (' + expenses.length + ' despesas geradas)');
})();
