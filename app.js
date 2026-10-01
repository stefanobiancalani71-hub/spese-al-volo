const STORAGE_KEY = 'spese-al-volo-v1';
const form = document.getElementById('expenseForm');
const list = document.getElementById('expenseList');
const empty = document.getElementById('emptyState');
const todayTotal = document.getElementById('todayTotal');
const weekTotal = document.getElementById('weekTotal');
const exportBtn = document.getElementById('exportBtn');
const toast = document.getElementById('toast');
const installBtn = document.getElementById('installBtn');
const iosInstall = document.getElementById('iosInstall');
let deferredPrompt = null;

function getExpenses() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveExpenses(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function money(n) { return new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR' }).format(n); }
function parseAmount(v) {
  const clean = String(v).trim().replace(/\s/g,'').replace(/\./g,'').replace(',', '.');
  const n = Number(clean);
  return Number.isFinite(n) ? n : NaN;
}
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function esc(s='') { return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function showToast(msg) {
  toast.textContent = msg; toast.classList.add('show');
  clearTimeout(showToast.t); showToast.t = setTimeout(()=>toast.classList.remove('show'), 1800);
}
function render() {
  const items = getExpenses().sort((a,b)=>b.ts-a.ts);
  const today = startOfDay().getTime();
  const seven = new Date(); seven.setDate(seven.getDate()-6); seven.setHours(0,0,0,0);
  const todaySum = items.filter(x=>x.ts>=today).reduce((s,x)=>s+x.amount,0);
  const weekSum = items.filter(x=>x.ts>=seven.getTime()).reduce((s,x)=>s+x.amount,0);
  todayTotal.textContent = money(todaySum);
  weekTotal.textContent = money(weekSum);
  empty.hidden = items.length > 0;
  list.innerHTML = items.map(x=>{
    const d = new Date(x.ts);
    const date = d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' });
    const time = d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
    const note = x.note ? ` · ${esc(x.note)}` : '';
    return `<div class="expense-item">
      <div class="expense-main">
        <strong>${esc(x.category)}</strong>
        <div class="expense-meta">${date} ${time} · ${esc(x.payment)}${note}</div>
      </div>
      <div class="expense-amount">${money(x.amount)}</div>
      <button class="delete-btn" data-id="${x.id}" aria-label="Elimina">×</button>
    </div>`;
  }).join('');
}

form.addEventListener('submit', e=>{
  e.preventDefault();
  const amount = parseAmount(document.getElementById('amount').value);
  if (!amount || amount <= 0) { showToast('Inserisci un importo valido'); return; }
  const item = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    ts: Date.now(), amount,
    category: document.getElementById('category').value,
    payment: document.getElementById('payment').value,
    note: document.getElementById('note').value.trim()
  };
  const items = getExpenses(); items.push(item); saveExpenses(items);
  form.reset(); document.getElementById('category').value = 'Spesa'; document.getElementById('payment').value = 'Carta';
  render(); showToast('Spesa salvata'); document.getElementById('amount').focus();
});

list.addEventListener('click', e=>{
  const btn = e.target.closest('.delete-btn'); if (!btn) return;
  if (!confirm('Eliminare questa spesa?')) return;
  saveExpenses(getExpenses().filter(x=>x.id!==btn.dataset.id)); render(); showToast('Spesa eliminata');
});

exportBtn.addEventListener('click', ()=>{
  const items = getExpenses().sort((a,b)=>a.ts-b.ts);
  if (!items.length) { showToast('Non ci sono spese da esportare'); return; }
  const rows = [['Data','Ora','Importo','Categoria','Pagamento','Nota']];
  items.forEach(x=>{
    const d = new Date(x.ts);
    rows.push([
      d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}),
      x.amount.toFixed(2).replace('.',','), x.category, x.payment, x.note || ''
    ]);
  });
  const csv = '\ufeff' + rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href=url; a.download=`spese-al-volo-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500); showToast('CSV esportato');
});

window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault(); deferredPrompt = e; installBtn.hidden = false;
});
installBtn.addEventListener('click', async ()=>{
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installBtn.hidden = true;
});

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (isIOS && !standalone) iosInstall.hidden = false;

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', ()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

render();
