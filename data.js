// ============================================================
// DATA.JS - Categorias, grupos e estrutura de dados
// ============================================================

const CATEGORIES = [
    // Alimentação Básica
    { name: 'Supermercado', type: 'Variável', group: 'Alimentação Básica', condition: 'Necessidade' },
    { name: 'Reposição de Casa', type: 'Variável', group: 'Alimentação Básica', condition: 'Necessidade' },

    // Habitação
    { name: 'Aluguel/Condomínio/IPTU', type: 'Fixo', group: 'Habitação', condition: 'Necessidade' },
    { name: 'Contas de Consumo', type: 'Fixo', group: 'Habitação', condition: 'Necessidade' },
    { name: 'Internet/Celular', type: 'Fixo', group: 'Habitação', condition: 'Necessidade' },
    { name: 'Manutenção da Casa', type: 'Variável', group: 'Habitação', condition: 'Necessidade' },
    { name: 'Serviços Domésticos', type: 'Fixo', group: 'Habitação', condition: 'Necessidade' },

    // Carreira e Educação
    { name: 'Ferramentas e Carreira', type: 'Fixo', group: 'Carreira e Educação', condition: 'Necessidade' },
    { name: 'Obrigações Tributárias', type: 'Fixo', group: 'Carreira e Educação', condition: 'Necessidade' },
    { name: 'Conhecimento', type: 'Variável', group: 'Carreira e Educação', condition: 'Necessidade' },

    // Filhos
    { name: 'Mensalidade/Transp. Escolar/Lanche', type: 'Fixo', group: 'Filhos', condition: 'Necessidade' },
    { name: 'Material e Uniforme', type: 'Variável', group: 'Filhos', condition: 'Necessidade' },
    { name: 'Saúde/Cuidados Filhos', type: 'Variável', group: 'Filhos', condition: 'Necessidade' },
    { name: 'Atividades Extras', type: 'Variável', group: 'Filhos', condition: 'Necessidade' },
    { name: 'Babá/Apoio', type: 'Fixo', group: 'Filhos', condition: 'Necessidade' },
    { name: 'Vestuário Filhos', type: 'Variável', group: 'Filhos', condition: 'Necessidade' },
    { name: 'Mesada', type: 'Fixo', group: 'Filhos', condition: 'Necessidade' },

    // Pets
    { name: 'Petshop/Veterinário', type: 'Variável', group: 'Pets', condition: 'Necessidade' },

    // Saúde
    { name: 'Farmácia', type: 'Variável', group: 'Saúde', condition: 'Necessidade' },
    { name: 'Consultas/Exames', type: 'Variável', group: 'Saúde', condition: 'Necessidade' },
    { name: 'Plano de Saúde/Seguro de Vida', type: 'Fixo', group: 'Saúde', condition: 'Necessidade' },

    // Transporte
    { name: 'Combustível', type: 'Variável', group: 'Transporte', condition: 'Necessidade' },
    { name: 'Documentação e Seguro', type: 'Fixo', group: 'Transporte', condition: 'Necessidade' },
    { name: 'Manutenção Veículo', type: 'Variável', group: 'Transporte', condition: 'Necessidade' },
    { name: 'Parcela do Veículo', type: 'Fixo', group: 'Transporte', condition: 'Necessidade' },
    { name: 'Pedágios/Estacionamentos/Multas', type: 'Variável', group: 'Transporte', condition: 'Necessidade' },
    { name: 'Transporte Público/App', type: 'Variável', group: 'Transporte', condition: 'Necessidade' },

    // Bens de Consumo
    { name: 'Eletrônicos', type: 'Variável', group: 'Bens de Consumo', condition: 'Desejo' },
    { name: 'Casa e Decoração', type: 'Variável', group: 'Bens de Consumo', condition: 'Desejo' },

    // Gastronomia e Social
    { name: 'Restaurantes/Bares', type: 'Variável', group: 'Gastronomia e Social', condition: 'Desejo' },
    { name: 'Festas em casa', type: 'Variável', group: 'Gastronomia e Social', condition: 'Desejo' },
    { name: 'Delivery/iFood', type: 'Variável', group: 'Gastronomia e Social', condition: 'Desejo' },

    // Lazer
    { name: 'Viagens', type: 'Variável', group: 'Lazer', condition: 'Desejo' },
    { name: 'Lazer Filhos', type: 'Variável', group: 'Lazer', condition: 'Desejo' },
    { name: 'Ingressos e Passeios', type: 'Variável', group: 'Lazer', condition: 'Desejo' },
    { name: 'Assinaturas/Streaming', type: 'Fixo', group: 'Lazer', condition: 'Desejo' },

    // Pessoal
    { name: 'Cuidados Pessoais', type: 'Variável', group: 'Pessoal', condition: 'Desejo' },
    { name: 'Vestuário', type: 'Variável', group: 'Pessoal', condition: 'Desejo' },
    { name: 'Presentes', type: 'Variável', group: 'Pessoal', condition: 'Desejo' },

    // Social
    { name: 'Apoio Familiar', type: 'Variável', group: 'Social', condition: 'Desejo' },
    { name: 'Doações', type: 'Variável', group: 'Social', condition: 'Desejo' },

    // Dívidas
    { name: 'Empréstimos/Parcelas', type: 'Variável', group: 'Dívidas', condition: 'Dívidas' },
    { name: 'Reembolso', type: 'Variável', group: 'Dívidas', condition: 'Dívidas' },
    { name: 'Apostas', type: 'Variável', group: 'Dívidas', condition: 'Dívidas' },
    { name: 'Juros e Tarifas', type: 'Variável', group: 'Dívidas', condition: 'Dívidas' },

    // Investimentos
    { name: 'Reserva de Emergência', type: 'Fixo', group: 'Investimentos', condition: 'Financeiro' },
    { name: 'Oportunidades/Risco', type: 'Variável', group: 'Investimentos', condition: 'Financeiro' },
    { name: 'Objetivos/Sonhos', type: 'Variável', group: 'Investimentos', condition: 'Financeiro' },
];

const GROUPS = [
    'Alimentação Básica', 'Habitação', 'Carreira e Educação', 'Filhos',
    'Pets', 'Saúde', 'Transporte', 'Bens de Consumo',
    'Gastronomia e Social', 'Lazer', 'Pessoal', 'Social',
    'Dívidas', 'Investimentos'
];

const GROUP_COLORS = {
    'Alimentação Básica': '#737373',
    'Habitação': '#525252',
    'Carreira e Educação': '#6B6B6B',
    'Filhos': '#8A8A8A',
    'Pets': '#999999',
    'Saúde': '#5C5C5C',
    'Transporte': '#7A7A7A',
    'Bens de Consumo': '#8F8F8F',
    'Gastronomia e Social': '#A3A3A3',
    'Lazer': '#6E6E6E',
    'Pessoal': '#858585',
    'Social': '#9C9C9C',
    'Dívidas': '#F87171',
    'Investimentos': '#4ADE80',
};

const CONDITIONS = ['Necessidade', 'Desejo', 'Financeiro', 'Dívidas'];
const CONDITION_TARGETS = { 'Necessidade': 50, 'Desejo': 30, 'Financeiro': 20, 'Dívidas': 0 };

const INCOME_CATEGORIES = [
    'Renda Principal', 'Pensão Alimentícia', 'Freelance', 'Investimentos',
    'Aluguel Recebido', 'Outros'
];

const BANKS = ['Nubank', 'Itaú', 'BB', 'Bradesco', 'Caixa', 'Inter', 'C6', 'Santander', 'Outro'];
const PAYMENT_TYPES = ['Crédito', 'Débito', 'Pix', 'Boleto', 'Dinheiro', 'Transferência'];

const MONTHS = [
    '01.Janeiro', '02.Fevereiro', '03.Março', '04.Abril',
    '05.Maio', '06.Junho', '07.Julho', '08.Agosto',
    '09.Setembro', '10.Outubro', '11.Novembro', '12.Dezembro'
];

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
