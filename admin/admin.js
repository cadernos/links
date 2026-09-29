const $ = (sel) => document.querySelector(sel);
let current = null;
const savedPassword = sessionStorage.getItem('cadlin-admin-password');
if (savedPassword) document.addEventListener('DOMContentLoaded', () => { const p = $('#password'); if (p) p.value = savedPassword; });

function setMessage(text = '', type = '') {
  const el = $('#formMessage');
  el.textContent = text;
  el.className = `form-message ${type}`.trim();
}
function setBusy(busy) {
  $('#saveButton').disabled = busy;
  $('#removeButton').disabled = busy;
}
function validHttps(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
function authHeaders() {
  return {'Content-Type':'application/json', 'Authorization':`Bearer ${$('#password').value}`};
}
function renderCurrent() {
  const root = $('#currentFeatured');
  if (!current) {
    root.className = 'current-empty';
    root.textContent = 'Nenhum destaque publicado.';
    return;
  }
  root.className = 'current-preview';
  root.innerHTML = '';
  const meta = document.createElement('span');
  meta.textContent = current.expiresAt ? `EXPIRA EM ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${current.expiresAt}T12:00:00`))}` : 'SEM DATA DE EXPIRAÇÃO';
  const title = document.createElement('strong');
  title.textContent = current.text;
  const link = document.createElement('a');
  link.href = current.url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'Abrir link ↗';
  root.append(meta, title, link);
}
function fillForm(item) {
  $('#text').value = item?.text || '';
  $('#url').value = item?.url || '';
  $('#expiresAt').value = item?.expiresAt || '';
  $('#charCount').textContent = $('#text').value.length;
}
async function loadCurrent() {
  const status = $('#connectionStatus');
  try {
    const r = await fetch('../api/featured', {cache:'no-store'});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    current = json.featured || null;
    fillForm(current);
    renderCurrent();
    status.textContent = 'online';
    status.className = 'status-pill ok';
  } catch (err) {
    console.error(err);
    status.textContent = 'API indisponível';
    status.className = 'status-pill bad';
    setMessage('A API administrativa ainda não está configurada neste ambiente.', 'bad');
  }
}
$('#text').addEventListener('input', () => { $('#charCount').textContent = $('#text').value.length; });
$('#featuredForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage();
  const text = $('#text').value.trim();
  const url = $('#url').value.trim();
  const expiresAt = $('#expiresAt').value || null;
  const password = $('#password').value;
  if (!text || !url || !password) { setMessage('Preencha texto, link e senha.', 'bad'); return; }
  if (!validHttps(url)) { setMessage('Informe um link válido começando por https://', 'bad'); return; }
  setBusy(true);
  try {
    const r = await fetch('../api/featured', {method:'POST', headers:authHeaders(), body:JSON.stringify({text,url,expiresAt})});
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(json.error || `Erro ${r.status}`);
    current = json.featured;
    sessionStorage.setItem('cadlin-admin-password', password);
    renderCurrent();
    setMessage('Destaque publicado. A página pública costuma refletir a alteração em até 1 minuto.', 'ok');
  } catch (err) {
    setMessage(err.message === 'unauthorized' ? 'Senha incorreta.' : `Não foi possível publicar: ${err.message}`, 'bad');
  } finally { setBusy(false); }
});
$('#removeButton').addEventListener('click', async () => {
  setMessage();
  if (!$('#password').value) { setMessage('Informe a senha de edição para remover o destaque.', 'bad'); return; }
  if (!current) { setMessage('Não há destaque publicado.', 'bad'); return; }
  setBusy(true);
  try {
    const r = await fetch('../api/featured', {method:'DELETE', headers:authHeaders()});
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(json.error || `Erro ${r.status}`);
    current = null;
    sessionStorage.setItem('cadlin-admin-password', $('#password').value);
    fillForm(null);
    renderCurrent();
    setMessage('Destaque removido. A página pública costuma refletir a alteração em até 1 minuto.', 'ok');
  } catch (err) {
    setMessage(err.message === 'unauthorized' ? 'Senha incorreta.' : `Não foi possível remover: ${err.message}`, 'bad');
  } finally { setBusy(false); }
});
loadCurrent();
