'use strict';
const states = { sent: 'Enviada', accepted: 'Confirmada · reservada', rejected: 'Recusada', dispatched: 'Enviada fisicamente', received: 'Recebida', cancelled: 'Cancelada' };
const titles = { overview: 'Visão geral', requests: 'Solicitações', network: 'Minha rede', stocks: 'Estoques' };
const blood = ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+'];
const components = ['Concentrado de hemácias', 'Plasma', 'Concentrado de plaquetas'];
let data = null, view = titles[location.hash.slice(1)] ? location.hash.slice(1) : 'overview', activeRequest = null, refreshing = false;
const content = document.getElementById('app-content'), modal = document.getElementById('app-modal'), modalContent = document.getElementById('modal-content');
function el(tag, className, text) { const node = document.createElement(tag); if (className)
    node.className = className; if (text !== undefined)
    node.textContent = text; return node; }
function append(parent, ...nodes) { parent.append(...nodes.filter(Boolean)); return parent; }
function button(text, action, cls = 'button small') { const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', async () => { node.disabled = true; try {
    await action();
}
catch (e) {
    toast(e.message, true);
}
finally {
    node.disabled = false;
} }); return node; }
let toastTimer;
function toast(message, error = false) { const node = document.getElementById('toast'); node.textContent = message; node.className = error ? 'error' : ''; node.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => node.hidden = true, 5000); }
async function api(path, body) { const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}); let result; try {
    result = await response.json();
}
catch {
    throw new Error('Não foi possível conectar ao servidor.');
} if (response.status === 401) {
    location.assign('/login.html');
    throw new Error('Sessão encerrada.');
} if (!response.ok)
    throw new Error(result.error || 'Não foi possível concluir.'); return result; }
const liters = ml => (ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' L';
const date = t => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const center = () => data.user.kind === 'hemocentro';
function heading(title, description, action) { const node = el('div', 'dash-heading'); append(node, append(el('div'), el('p', 'eyebrow', center() ? 'AMBIENTE DO HEMOCENTRO' : 'AMBIENTE DO HOSPITAL'), el('h1', null, title), el('p', null, description)), action); return node; }
function tag(text, status = '') { return el('span', 'status-tag ' + status, text); }
function metric(title, value, note) { return append(el('article'), el('p', null, title), el('strong', null, value), el('small', null, note)); }
function empty(message, action) { return append(el('div', 'empty-state'), el('span', 'empty-symbol', '⌁'), el('h3', null, message), action); }
function setView(next) { if (!titles[next])
    return; view = next; history.replaceState(null, '', '#' + view); render(); }
document.querySelectorAll('[data-page-button]').forEach(n => n.addEventListener('click', () => setView(n.dataset.pageButton)));
async function refresh() { if (refreshing)
    return; refreshing = true; try {
    data = await api('/api/overview');
    render();
}
catch (e) {
    toast(e.message, true);
}
finally {
    refreshing = false;
} }
function render() { if (!data)
    return; document.getElementById('company-name').textContent = data.user.company_name; document.getElementById('company-avatar').textContent = data.user.kind === 'hospital' ? 'HP' : 'HC'; document.getElementById('breadcrumb').textContent = titles[view]; document.querySelectorAll('[data-page-button]').forEach(n => { n.classList.toggle('active', n.dataset.pageButton === view); n.setAttribute('aria-current', n.dataset.pageButton === view ? 'page' : 'false'); }); content.replaceChildren(); if (view === 'overview')
    renderOverview(); if (view === 'requests')
    renderRequests(); if (view === 'network')
    renderNetwork(); if (view === 'stocks')
    renderStocks(); }
function renderOverview() { const open = data.requests.filter(r => !['received', 'cancelled', 'rejected'].includes(r.status)); content.append(heading('A sua rede, conectada.', center() ? 'Acompanhe demandas, responda aos hospitais e organize seu estoque.' : 'Conecte-se a hemocentros e acompanhe suas solicitações.', !center() ? button('Nova solicitação ↗', newRequest) : button('Atualizar estoque ↗', stockForm))); append(content, append(el('div', 'metrics'), metric('Solicitações em andamento', String(open.length), 'Demandas da sua instituição'), metric('Conexões ativas', String(data.connections.filter(c => c.status === 'accepted').length), 'Instituições na sua rede'), metric('Pedidos recebidos', String(data.requests.filter(r => r.status === 'received').length), 'Ciclo de colaboração concluído'))); content.append(append(el('div', 'card-heading'), el('h2', null, 'Atividade recente'), button('Ver todas →', () => setView('requests'), 'quiet'))); requestList(data.requests.slice(0, 5)); content.append(append(el('article', 'campaign-preview'), append(el('div'), el('p', 'eyebrow', 'DA INFORMAÇÃO À COLABORAÇÃO'), el('h2', null, 'Duas instituições. Uma conexão.'), el('p', null, 'Abra outra conta empresarial para responder aos pedidos e ver as atualizações entre os participantes.')), button('Explorar minha rede →', () => setView('network'), 'quiet'))); }
function renderRequests() { content.append(heading('Solicitações.', center() ? 'Receba, analise e responda aos hospitais da sua rede.' : 'Crie pedidos e acompanhe a resposta dos hemocentros.', !center() ? button('Nova solicitação ↗', newRequest) : null)); const filters = el('div', 'toolbar'); const select = el('select'); select.setAttribute('aria-label', 'Filtrar solicitações'); for (const [key, label] of [['all', 'Todos os estados'], ...Object.entries(states)]) {
    const opt = el('option', null, label);
    opt.value = key;
    select.append(opt);
} filters.append(select); content.append(filters); const list = el('div'); content.append(list); select.addEventListener('change', () => { list.replaceChildren(); requestList(data.requests.filter(r => select.value === 'all' || r.status === select.value), list); }); requestList(data.requests, list); }
function requestList(rows, parent = content) { if (!rows.length) {
    parent.append(empty('Sua próxima conexão começa aqui.', !center() ? button('Criar a primeira solicitação', newRequest) : el('p', 'fine', 'Os pedidos enviados por hospitais conectados aparecerão neste espaço.')));
    return;
} const table = el('div', 'request-list'); for (const r of rows) {
    const row = button('', () => requestDetail(r.id), 'request-row');
    append(row, append(el('div', 'request-blood'), el('strong', null, r.blood_type), el('span', null, liters(r.quantity))), append(el('div', 'request-summary'), el('strong', null, center() ? r.hospital_name : r.center_name), el('span', null, r.component + ' · ' + r.id.slice(0, 8).toUpperCase()), el('small', null, 'Prazo solicitado: ' + r.needed_by.split('-').reverse().join('/') + (r.priority === 'priority' ? ' · Prioridade' : ''))), tag(states[r.status], r.status), el('span', 'row-arrow', '↗'));
    table.append(row);
} parent.append(table); }
function connectionCard(c) { const name = center() ? c.hospital_name : c.center_name; const status = { accepted: 'Conectada', pending: 'Convite pendente', rejected: 'Convite recusado' }; const card = append(el('article', 'network-card'), el('div', 'center-icon', center() ? 'HP' : 'HC'), el('h3', null, name), tag(status[c.status], c.status)); if (c.status === 'pending' && c.requested_by !== data.user.company_id) {
    const actions = el('div', 'actions');
    for (const [status, label] of [['accepted', 'Aceitar conexão'], ['rejected', 'Recusar']])
        actions.append(button(label, async () => { await api('/api/connections/' + c.id, { status }); toast('Convite atualizado.'); await refresh(); }, status === 'accepted' ? 'button small' : 'quiet'));
    card.append(actions);
}
else
    card.append(el('p', 'fine', c.status === 'accepted' ? 'Disponibilidade e pedidos compartilhados entre as duas instituições.' : 'Aguardando decisão da instituição destinatária.')); return card; }
function renderNetwork() { content.append(heading('Minha rede.', center() ? 'Conexões com hospitais para transformar demanda em atendimento.' : 'Hemocentros conectados para coordenação e acompanhamento.', button('Conectar instituição ↗', inviteForm))); if (!data.connections.length) {
    content.append(empty('Monte a rede da sua instituição.', button('Buscar instituições', inviteForm)));
    return;
} const grid = el('div', 'network-grid'); data.connections.forEach(c => grid.append(connectionCard(c))); content.append(grid); }
function renderStocks() { content.append(heading('Disponibilidade compartilhada.', center() ? 'Informe unidades disponíveis. As reservas são controladas pelos pedidos confirmados.' : 'Consulte o estoque informado pelos hemocentros conectados.', center() ? button('Atualizar estoque ↗', stockForm) : null)); const filters = el('div', 'toolbar'); const componentSelect = el('select'); componentSelect.setAttribute('aria-label', 'Hemocomponente'); for (const name of components) {
    const opt = el('option', null, name);
    opt.value = name;
    componentSelect.append(opt);
} filters.append(componentSelect); content.append(filters); const grid = el('div', 'stock-institutions'); content.append(grid); const draw = () => { grid.replaceChildren(); const list = data.stocks.filter(s => s.component === componentSelect.value); if (!list.length) {
    grid.append(empty('Nenhum estoque compartilhado.', button('Ver minha rede', () => setView('network'))));
    return;
} for (const companyId of [...new Set(list.map(s => s.company_id))]) {
    const rows = list.filter(s => s.company_id === companyId);
    const card = el('article', 'stock-card');
    append(card, el('h2', null, rows[0].company_name), el('p', 'muted', 'Volume informado pela instituição · dados fictícios'));
    const items = el('div', 'blood-grid');
    rows.forEach(s => { const item = append(el('div', 'blood-type'), el('strong', null, s.blood_type), el('span', null, liters(s.available) + ' disponíveis'), el('small', 'reserved', liters(s.reserved) + ' reservados'), el('small', 'stock-updated', 'Atualizado ' + date(s.updated_at))); items.append(item); });
    card.append(items);
    grid.append(card);
} }; componentSelect.addEventListener('change', draw); draw(); }
function field(form, label, name, { type = 'text', options = null, value = '', required = true, maxLength = null, min = null, max = null, step = null } = {}) { const wrapper = el('div', 'form-field'); const labelNode = el('label', null, label); labelNode.htmlFor = 'field-' + name; let input; if (options) {
    input = el('select');
    for (const option of options) {
        const opt = el('option', null, typeof option === 'string' ? option : option.label);
        opt.value = typeof option === 'string' ? option : option.value;
        input.append(opt);
    }
}
else
    input = el(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea' && !options)
    input.type = type; input.id = 'field-' + name; input.name = name; input.required = required; if (maxLength)
    input.maxLength = maxLength; if (min !== null)
    input.min = min; if (max !== null)
    input.max = max; if (step !== null)
    input.step = step; if (value)
    input.value = value; append(wrapper, labelNode, input); form.append(wrapper); return input; }
function showForm(title, description, build, onSubmit, submitLabel) { modalContent.replaceChildren(el('p', 'eyebrow', 'COLABORAÇÃO INSTITUCIONAL'), el('h2', null, title), el('p', 'muted', description)); const form = el('form', 'operation-form'); build(form); const error = el('p', 'form-error'); error.setAttribute('role', 'alert'); const submit = el('button', 'button full', submitLabel); submit.type = 'submit'; append(form, error, submit); modalContent.append(form); modal.showModal(); form.addEventListener('submit', async (e) => { e.preventDefault(); error.textContent = ''; submit.disabled = true; try {
    await onSubmit(Object.fromEntries(new FormData(form)));
    modal.close();
    await refresh();
}
catch (e) {
    error.textContent = e.message;
}
finally {
    submit.disabled = false;
} }); }
function newRequest() { const centers = data.connections.filter(c => c.status === 'accepted').map(c => ({ value: c.center_id, label: c.center_name })); if (!centers.length) {
    toast('Conecte-se a um hemocentro antes de criar um pedido.', true);
    setView('network');
    return;
} showForm('Uma nova solicitação.', 'Informe a demanda fictícia. O hemocentro conectado receberá o pedido no próprio painel.', form => { field(form, 'Hemocentro', 'center_id', { options: centers }); field(form, 'Hemocomponente', 'component', { options: components }); const row = el('div', 'form-row'); form.append(row); field(row, 'Tipo sanguíneo', 'blood_type', { options: blood }); field(row, 'Volume (L)', 'quantity_l', { type: 'number', min: 0.001, max: 1000, step: 0.001, value: '2' }); field(form, 'Prazo solicitado', 'needed_by', { type: 'date', min: new Date().toLocaleDateString('en-CA') }); field(form, 'Prioridade', 'priority', { options: [{ value: 'routine', label: 'Rotina' }, { value: 'priority', label: 'Prioridade' }] }); field(form, 'Observação operacional', 'note', { type: 'textarea', required: false, maxLength: 1000 }); form.append(el('p', 'fine', 'Use somente informações fictícias; não inclua dados de pacientes.')); }, async (body) => { await api('/api/requests', { ...body, quantity_l: Number(body.quantity_l) }); toast('Solicitação enviada ao hemocentro.'); }, 'Enviar solicitação ↗'); }
function stockForm() { showForm('Atualizar disponibilidade.', 'Informe o volume disponível em litros. O volume já reservado em pedidos é controlado separadamente.', form => { field(form, 'Hemocomponente', 'component', { options: components }); field(form, 'Tipo sanguíneo', 'blood_type', { options: blood }); field(form, 'Volume disponível (L)', 'available_l', { type: 'number', min: 0, max: 1000, step: 0.001, value: '20' }); }, async (body) => { await api('/api/stocks', { ...body, available_l: Number(body.available_l) }); toast('Estoque atualizado e compartilhado com sua rede.'); }, 'Salvar disponibilidade'); }
async function inviteForm() { const { companies } = await api('/api/companies'); const candidates = companies.filter(c => !data.connections.some(x => (x.hospital_id === c.id || x.center_id === c.id) && x.status !== 'rejected')); if (!candidates.length) {
    toast('Todas as instituições fictícias já estão conectadas ou têm convite pendente.');
    return;
} showForm('Uma nova conexão.', 'O convite precisa ser aceito pela outra instituição.', form => field(form, 'Instituição', 'company_id', { options: candidates.map(c => ({ value: c.id, label: c.name + ' · ' + c.city })) }), async (body) => { await api('/api/connections', body); toast('Convite enviado à instituição.'); }, 'Enviar convite ↗'); }
async function requestDetail(requestId) { const result = await api('/api/requests/' + requestId); activeRequest = requestId; renderDetail(result); if (!modal.open)
    modal.showModal(); }
function renderDetail({ request: r, messages, events }) { modalContent.replaceChildren(); append(modalContent, el('p', 'eyebrow', 'SOLICITAÇÃO ' + r.id.slice(0, 8).toUpperCase()), el('h2', null, r.component), tag(states[r.status], r.status), el('p', 'request-detail-summary', liters(r.quantity) + ' · ' + r.blood_type + ' · prazo ' + r.needed_by.split('-').reverse().join('/'))); if (r.note)
    modalContent.append(el('p', 'detail-note', r.note)); const actions = el('div', 'request-actions'); const isCenter = data.user.company_id === r.center_id; const options = []; if (isCenter && r.status === 'sent')
    options.push(['accepted', 'Confirmar e reservar'], ['rejected', 'Recusar']); if (isCenter && r.status === 'accepted')
    options.push(['dispatched', 'Registrar envio físico']); if (!isCenter && r.status === 'dispatched')
    options.push(['received', 'Confirmar recebimento']); if (['sent', 'accepted'].includes(r.status))
    options.push(['cancelled', 'Cancelar pedido']); for (const [status, label] of options)
    actions.append(button(label, async () => { if (['rejected', 'cancelled'].includes(status)) {
        reasonForm(r, status);
        return;
    } await api('/api/requests/' + r.id + '/status', { status }); toast('Solicitação atualizada.'); await refresh(); await requestDetail(r.id); }, status === 'cancelled' || status === 'rejected' ? 'button small secondary' : 'button small')); modalContent.append(actions); const tabs = el('div', 'request-detail-sections'); const timeline = el('section', 'timeline'); append(timeline, el('h3', null, 'Histórico')); events.forEach(e => append(timeline, append(el('div', 'timeline-item'), el('strong', null, states[e.action] || e.action), el('p', null, e.company_name + ' · ' + date(e.created_at)), e.note ? el('small', null, e.note) : null))); const chat = el('section', 'conversation'); chat.append(el('h3', null, 'Conversa do pedido')); if (!messages.length)
    chat.append(el('p', 'muted', 'Comece uma conversa com a instituição parceira.')); messages.forEach(m => chat.append(append(el('div', 'message'), el('strong', null, m.company_name), el('p', null, m.body), el('small', null, m.author + ' · ' + date(m.created_at))))); const form = el('form', 'message-form'); const input = el('textarea'); input.placeholder = 'Escreva uma mensagem operacional fictícia'; input.setAttribute('aria-label', 'Mensagem para a instituição'); input.required = true; input.maxLength = 2000; const submit = el('button', 'button small', 'Enviar mensagem'); submit.type = 'submit'; append(form, input, submit); form.addEventListener('submit', async (e) => { e.preventDefault(); submit.disabled = true; try {
    await api('/api/requests/' + r.id + '/messages', { body: input.value });
    await requestDetail(r.id);
}
catch (e) {
    toast(e.message, true);
}
finally {
    submit.disabled = false;
} }); chat.append(form); append(tabs, timeline, chat); modalContent.append(tabs); }
function reasonForm(r, status) { modalContent.replaceChildren(el('p', 'eyebrow', 'ATUALIZAR SOLICITAÇÃO'), el('h2', null, status === 'rejected' ? 'Recusar solicitação.' : 'Cancelar solicitação.')); const form = el('form', 'operation-form'); field(form, 'Motivo', 'note', { type: 'textarea', maxLength: 1000 }); const error = el('p', 'form-error'); error.setAttribute('role', 'alert'); const submit = el('button', 'button full', 'Confirmar'); submit.type = 'submit'; append(form, error, submit, button('← Voltar ao pedido', () => requestDetail(r.id), 'quiet')); modalContent.append(form); form.addEventListener('submit', async (e) => { e.preventDefault(); submit.disabled = true; try {
    await api('/api/requests/' + r.id + '/status', { status, note: form.note.value });
    await refresh();
    await requestDetail(r.id);
}
catch (e) {
    error.textContent = e.message;
}
finally {
    submit.disabled = false;
} }); }
modal.addEventListener('close', () => activeRequest = null);
for (const name of ['logout', 'logout-mobile'])
    document.getElementById(name)?.addEventListener('click', async () => { try {
        await api('/api/logout', {});
        location.assign('/login.html');
    }
    catch (e) {
        toast(e.message, true);
    } });
refresh();
setInterval(async () => { if (document.hidden || refreshing)
    return; await refresh(); if (modal.open && activeRequest && !modal.querySelector('.operation-form') && !Array.from(modal.querySelectorAll('textarea')).some(t => t.value || document.activeElement === t)) {
    const scroll = modal.scrollTop;
    try {
        await requestDetail(activeRequest);
        modal.scrollTop = scroll;
    }
    catch { }
} }, 10000);
