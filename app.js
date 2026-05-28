// Configuração do Supabase
const SUPABASE_URL = 'https://hpmnmcklygycxsqqoqak.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_szXj5gSZoACQW2fIW6xCug_LLCAFL3P';

// Inicializar cliente do Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let clients = [];
let editingId = null;

const form = document.getElementById('client-form');
const tableBody = document.getElementById('clients-table-body');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const formTitle = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getStatusBadge(status) {
    if (status === 'ativo') {
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Ativo</span>';
    }
    return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Inadimplente</span>';
}

// Ler clientes do Supabase (Super rápido, sem CORS e sem cache!)
async function loadClients() {
    try {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        clients = data || [];
        render();
    } catch (err) {
        console.error('Erro ao carregar clientes do Supabase:', err.message);
    }
}

function render(filter = '') {
    const filtered = clients.filter(c =>
        (c.nome || '').toLowerCase().includes(filter.toLowerCase()) ||
        (c.documento || '').includes(filter)
    );

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filtered.forEach(client => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="font-medium text-slate-900">${client.nome}</div>
                    <div class="text-xs text-slate-500">${client.documento} • ${client.telefone}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-slate-700">${client.plano}</div>
                    <div class="text-xs text-slate-400 truncate max-w-[120px]">${client.endereco}</div>
                </td>
                <td class="px-6 py-4 text-slate-600">Dia ${client.vencimento}</td>
                <td class="px-6 py-4 font-medium text-slate-700">${formatCurrency(client.valor_mensal)}</td>
                <td class="px-6 py-4">${getStatusBadge(client.status)}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="editClient('${client.id}')" class="text-indigo-600 hover:text-indigo-800 font-medium text-xs mr-3">Editar</button>
                    <button onclick="deleteClient('${client.id}')" class="text-rose-600 hover:text-rose-800 font-medium text-xs">Excluir</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    updateStats();
}

function updateStats() {
    document.getElementById('stat-total').textContent = clients.length;
    const revenue = clients.reduce((sum, c) => sum + parseFloat(c.valor_mensal || 0), 0);
    document.getElementById('stat-revenue').textContent = formatCurrency(revenue);
    const overdue = clients.filter(c => c.status === 'inadimplente').length;
    document.getElementById('stat-overdue').textContent = overdue;
}

// Salvar / Editar cliente no Supabase
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const clientData = {
        nome: document.getElementById('nome').value,
        documento: document.getElementById('documento').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
        plano: document.getElementById('plano').value,
        valor_mensal: parseFloat(document.getElementById('valor').value),
        vencimento: parseInt(document.getElementById('vencimento').value),
        status: document.getElementById('status').value
    };

    const originalText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Salvando...';

    try {
        if (editingId) {
            // Atualizar cliente existente
            const { error } = await supabase
                .from('clientes')
                .update(clientData)
                .eq('id', editingId);

            if (error) throw error;
            resetForm();
        } else {
            // Inserir novo cliente
            const { error } = await supabase
                .from('clientes')
                .insert([clientData]);

            if (error) throw error;
            form.reset();
        }
        
        await loadClients();
    } catch (err) {
        alert('Erro ao salvar no Supabase: ' + err.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
});

window.editClient = function(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    editingId = id;
    document.getElementById('nome').value = client.nome;
    document.getElementById('documento').value = client.documento;
    document.getElementById('telefone').value = client.telefone;
    document.getElementById('endereco').value = client.endereco;
    document.getElementById('plano').value = client.plano;
    document.getElementById('valor').value = client.valor_mensal;
    document.getElementById('vencimento').value = client.vencimento;
    document.getElementById('status').value = client.status;

    formTitle.textContent = 'Editar Cliente';
    btnSubmit.textContent = 'Salvar Alterações';
    btnCancelEdit.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteClient = async function(id) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (editingId === id) resetForm();
            await loadClients();
        } catch (err) {
            alert('Erro ao excluir no Supabase: ' + err.message);
        }
    }
};

window.resetForm = function() {
    editingId = null;
    form.reset();
    formTitle.textContent = 'Novo Cliente';
    btnSubmit.textContent = 'Adicionar Cliente';
    btnCancelEdit.classList.add('hidden');
};

window.clearAllData = async function() {
    if (confirm('ATENÇÃO: Isso apagará TODOS os clientes do Supabase. Deseja continuar?')) {
        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Apaga tudo

            if (error) throw error;

            resetForm();
            await loadClients();
        } catch (err) {
            alert('Erro ao limpar tudo: ' + err.message);
        }
    }
};

searchInput.addEventListener('input', (e) => {
    render(e.target.value);
});

loadClients();
