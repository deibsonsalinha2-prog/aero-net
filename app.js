const API_URL = 'https://script.google.com/macros/s/AKfycbwgP-h55N-lw8ZZl2DNm04WH1DvdeH1vTitRqWcJhg4185l2E7gyhfx-6I2da_qn5cJ5g/exec';

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

// GET via AllOrigins CORS proxy usando JSONP callback — 100% imune a qualquer bloqueio CORS
function loadClients() {
    return new Promise(function(resolve) {
        var cbName = '_jsonp_cb_' + Date.now();
        var script = document.createElement('script');
        
        // Timeout de segurança
        var timeout = setTimeout(function() {
            delete window[cbName];
            script.remove();
            console.warn('Timeout no carregamento');
            resolve();
        }, 12000);

        window[cbName] = function(response) {
            clearTimeout(timeout);
            try {
                // AllOrigins encapsula a resposta original em response.contents
                var data = JSON.parse(response.contents);
                clients = Array.isArray(data) ? data : [];
                render();
            } catch(e) {
                console.error("Erro ao processar dados da API:", e);
            }
            delete window[cbName];
            script.remove();
            resolve();
        };

        // Solicita o AllOrigins retornando o script como JSONP callback (com cache-busting forte)
        var cacheBuster = Date.now() + Math.random().toString(36).substring(2);
        var targetUrl = encodeURIComponent(API_URL + '?_nocache=' + cacheBuster);
        script.src = 'https://api.allorigins.win/get?url=' + targetUrl + '&callback=' + cbName;
        
        script.onerror = function() {
            clearTimeout(timeout);
            delete window[cbName];
            script.remove();
            console.error('Falha de rede no carregamento via Proxy');
            resolve();
        };

        document.head.appendChild(script);
    });
}

function render(filter) {
    filter = filter || '';
    var filtered = clients.filter(function(c) {
        return (c.nome || '').toLowerCase().indexOf(filter.toLowerCase()) !== -1 ||
               (c.documento || '').indexOf(filter) !== -1;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filtered.forEach(function(client) {
            var tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors';
            tr.innerHTML =
                '<td class="px-6 py-4">' +
                    '<div class="font-medium text-slate-900">' + client.nome + '</div>' +
                    '<div class="text-xs text-slate-500">' + client.documento + ' • ' + client.telefone + '</div>' +
                '</td>' +
                '<td class="px-6 py-4">' +
                    '<div class="text-slate-700">' + client.plano + '</div>' +
                    '<div class="text-xs text-slate-400 truncate max-w-[120px]">' + client.endereco + '</div>' +
                '</td>' +
                '<td class="px-6 py-4 text-slate-600">Dia ' + client.vencimento + '</td>' +
                '<td class="px-6 py-4 font-medium text-slate-700">' + formatCurrency(client.valor_mensal) + '</td>' +
                '<td class="px-6 py-4">' + getStatusBadge(client.status) + '</td>' +
                '<td class="px-6 py-4 text-right">' +
                    '<button onclick="editClient(\'' + client.id + '\')" class="text-indigo-600 hover:text-indigo-800 font-medium text-xs mr-3">Editar</button>' +
                    '<button onclick="deleteClient(\'' + client.id + '\')" class="text-rose-600 hover:text-rose-800 font-medium text-xs">Excluir</button>' +
                '</td>';
            tableBody.appendChild(tr);
        });
    }

    updateStats();
}

function updateStats() {
    document.getElementById('stat-total').textContent = clients.length;
    var revenue = clients.reduce(function(sum, c) { return sum + parseFloat(c.valor_mensal || 0); }, 0);
    document.getElementById('stat-revenue').textContent = formatCurrency(revenue);
    var overdue = clients.filter(function(c) { return c.status === 'inadimplente'; }).length;
    document.getElementById('stat-overdue').textContent = overdue;
}

// Envia POST com no-cors (corpo text/plain é enviado sem preflight CORS)
function gasPost(payload) {
    return fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        redirect: 'follow',
        body: JSON.stringify(payload)
    });
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();

    var clientData = {
        nome: document.getElementById('nome').value,
        documento: document.getElementById('documento').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
        plano: document.getElementById('plano').value,
        valor_mensal: parseFloat(document.getElementById('valor').value),
        vencimento: parseInt(document.getElementById('vencimento').value),
        status: document.getElementById('status').value
    };

    var originalText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Salvando...';

    // 1. Salvar — erros aqui aparecem como "Erro ao salvar"
    try {
        if (editingId) {
            await gasPost(Object.assign({}, clientData, { id: editingId, _method: 'PUT' }));
            resetForm();
        } else {
            await gasPost(clientData);
            form.reset();
        }
    } catch (err) {
        alert('Erro ao salvar: ' + err.message);
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
        return;
    }

    btnSubmit.disabled = false;
    btnSubmit.textContent = originalText;

    // 2. Recarregar lista — falhas aqui NÃO mostram "Erro ao salvar"
    await new Promise(function(r) { setTimeout(r, 1500); });
    await loadClients();
});

window.editClient = function(id) {
    var client = clients.find(function(c) { return c.id === id; });
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
            await gasPost({ id: id, _method: 'DELETE' });
            if (editingId === id) resetForm();
            await new Promise(function(r) { setTimeout(r, 1500); });
            await loadClients();
        } catch (err) {
            alert('Erro ao excluir: ' + err.message);
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
    if (confirm('ATENÇÃO: Isso apagará TODOS os clientes. Deseja continuar?')) {
        try {
            for (var i = 0; i < clients.length; i++) {
                await gasPost({ id: clients[i].id, _method: 'DELETE' });
            }
            resetForm();
            await new Promise(function(r) { setTimeout(r, 1500); });
            await loadClients();
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    }
};

searchInput.addEventListener('input', function(e) {
    render(e.target.value);
});

loadClients();
