// Simple POS invoicing app logic for Bar Providence Plus

// Utils
const $ = sel => document.querySelector(sel);
const format = v => Number(v).toLocaleString('fr-FR', {minimumFractionDigits:0, maximumFractionDigits:0});

// State
let products = JSON.parse(localStorage.getItem('pp_products') || 'null') || [
  {id: genId(), name:'Bière 33cl', price:600},
  {id: genId(), name:'Bière pression 50cl', price:1200},
  {id: genId(), name:'Coca 33cl', price:400},
  {id: genId(), name:'Eau 50cl', price:200},
  {id: genId(), name:'Assiette snack', price:1800}
];
let cart = [];
let taxRate = parseFloat($('#taxRate').value || 18);
let discountRate = parseFloat($('#discountRate').value || 0);
let priceMode = $('#priceMode').value || 'incl'; // incl or excl

// DOM refs
const productsList = $('#productsList');
const catalogueButtons = $('#catalogueButtons');
const cartList = $('#cartList');
const subTotalEl = $('#subTotal');
const taxAmountEl = $('#taxAmount');
const discountAmountEl = $('#discountAmount');
const grandTotalEl = $('#grandTotal');
const taxPercentEl = $('#taxPercent');
const discPercentEl = $('#discPercent');
const invoiceContent = $('#invoiceContent');
const yearEl = $('#year');

yearEl.textContent = new Date().getFullYear();

function genId(){ return 'p_'+Math.random().toString(36).slice(2,9) }

// Save / Load products
function saveProducts(){
  localStorage.setItem('pp_products', JSON.stringify(products));
  renderProducts();
  renderCatalogue();
}

function renderProducts(){
  productsList.innerHTML = '';
  products.forEach(p=>{
    const div = document.createElement('div');
    div.className='item';
    div.innerHTML = `<div><strong>${p.name}</strong><div style="font-size:12px;color:#666">${format(p.price)} CFA</div></div>
      <div>
        <button data-id="${p.id}" class="edit">✏️</button>
        <button data-id="${p.id}" class="del">🗑️</button>
      </div>`;
    productsList.appendChild(div);
  });

  // attach events
  productsList.querySelectorAll('.edit').forEach(b=>{
    b.onclick = e => {
      const id = e.target.dataset.id;
      const p = products.find(x=>x.id===id);
      $('#pName').value = p.name;
      $('#pPrice').value = p.price;
      $('#addProduct').dataset.edit = id;
    }
  });
  productsList.querySelectorAll('.del').forEach(b=>{
    b.onclick = e => {
      const id = e.target.dataset.id;
      products = products.filter(x=>x.id!==id);
      saveProducts();
    }
  });
}

function renderCatalogue(){
  catalogueButtons.innerHTML = '';
  products.forEach(p=>{
    const btn = document.createElement('button');
    btn.className='btn';
    btn.textContent = `${p.name} — ${format(p.price)} CFA`;
    btn.onclick = () => addToCart(p.id);
    catalogueButtons.appendChild(btn);
  });
}

function addToCart(productId){
  const prod = products.find(p=>p.id===productId);
  if(!prod) return;
  const existing = cart.find(c=>c.id===productId);
  if(existing) existing.qty++;
  else cart.push({id:productId, name:prod.name, price:prod.price, qty:1});
  renderCart();
}

function renderCart(){
  cartList.innerHTML = '';
  if(cart.length===0){ cartList.innerHTML = '<div style="color:#777">Le panier est vide</div>'; updateSummary(); return }
  cart.forEach(item=>{
    const div = document.createElement('div');
    div.className='item';
    div.innerHTML = `<div>
        <strong>${item.name}</strong>
        <div style="font-size:12px;color:#666">${format(item.price)} CFA / unité</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="dec" data-id="${item.id}">-</button>
        <span>${item.qty}</span>
        <button class="inc" data-id="${item.id}">+</button>
        <button class="rem" data-id="${item.id}">✖</button>
      </div>`;
    cartList.appendChild(div);
  });

  // events
  cartList.querySelectorAll('.inc').forEach(b=>b.onclick = e=>{
    const id = e.target.dataset.id; cart.find(x=>x.id===id).qty++; renderCart();
  });
  cartList.querySelectorAll('.dec').forEach(b=>b.onclick = e=>{
    const id = e.target.dataset.id; const it = cart.find(x=>x.id===id);
    if(it.qty>1) it.qty--; else cart = cart.filter(x=>x.id!==id);
    renderCart();
  });
  cartList.querySelectorAll('.rem').forEach(b=>b.onclick = e=>{
    const id = e.target.dataset.id; cart = cart.filter(x=>x.id!==id); renderCart();
  });

  updateSummary();
}

function updateSummary(){
  let subtotal = 0;
  for(const item of cart){
    const p = Number(item.price);
    const q = Number(item.qty);
    subtotal += p * q;
  }

  const taxPerc = parseFloat($('#taxRate').value) || 0;
  const discPerc = parseFloat($('#discountRate').value) || 0;
  taxRate = taxPerc; discountRate = discPerc;
  taxPercentEl.textContent = taxRate;
  discPercentEl.textContent = discountRate;

  let taxAmount = 0;
  let discountAmount = 0;
  let total = 0;

  if(priceMode === 'incl'){
    const base = subtotal / (1 + taxRate/100);
    taxAmount = subtotal - base;
    discountAmount = subtotal * (discountRate/100);
    total = subtotal - discountAmount;
  } else {
    taxAmount = subtotal * (taxRate/100);
    discountAmount = subtotal * (discountRate/100);
    total = subtotal + taxAmount - discountAmount;
  }

  subTotalEl.textContent = format(subtotal);
  taxAmountEl.textContent = format(Math.round(taxAmount));
  discountAmountEl.textContent = format(Math.round(discountAmount));
  grandTotalEl.textContent = format(Math.round(total));

  renderInvoicePreview(subtotal, taxAmount, discountAmount, total);
}

function renderInvoicePreview(subtotal, taxAmount, discountAmount, total){
  const client = $('#clientName').value || 'Client';
  const now = new Date();
  const lines = cart.map(it => {
    const price = Number(it.price);
    const qty = Number(it.qty);
    const lineTotal = price * qty;
    return `<tr><td>${it.name}</td><td style="text-align:right">${qty}</td><td style="text-align:right">${format(price)}</td><td style="text-align:right">${format(lineTotal)}</td></tr>`;
  }).join('');

  const html = `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px">
      <div><strong>Bar Providence Plus</strong><br/>Lomé, Togo</div>
      <div>Facture: #${now.getTime()}<br/>${now.toLocaleString('fr-FR')}</div>
    </div>
    <div>Client: <strong>${client}</strong></div>
    <table style="width:100%;margin-top:8px;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid #ddd"><th>Article</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead>
      <tbody>${lines}</tbody>
    </table>
    <div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between"><div>Sous-total</div><div>${format(Math.round(subtotal))} CFA</div></div>
      <div style="display:flex;justify-content:space-between"><div>TVA (${taxRate}%)</div><div>${format(Math.round(taxAmount))} CFA</div></div>
      <div style="display:flex;justify-content:space-between"><div>Remise (${discountRate}%)</div><div>${format(Math.round(discountAmount))} CFA</div></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:6px"><div>Total à payer</div><div>${format(Math.round(total))} CFA</div></div>
    </div>
  `;
  invoiceContent.innerHTML = html;
}

// Buttons & events
$('#addProduct').onclick = ()=>{
  const name = $('#pName').value.trim();
  const price = parseFloat($('#pPrice').value);
  if(!name || isNaN(price)) { alert('Nom et prix valides requis'); return; }
  const editId = $('#addProduct').dataset.edit;
  if(editId){
    const idx = products.findIndex(p=>p.id===editId);
    if(idx>=0){ products[idx].name = name; products[idx].price = price; delete $('#addProduct').dataset.edit; $('#addProduct').textContent='Ajouter / Mettre à jour'; }
  } else {
    products.push({id:genId(), name, price});
  }
  $('#pName').value=''; $('#pPrice').value='';
  saveProducts();
};

$('#resetProducts').onclick = ()=>{
  if(!confirm('Supprimer tout le catalogue ?')) return;
  products = [];
  saveProducts();
};

$('#taxRate').oninput = () => updateSummary();
$('#discountRate').oninput = () => updateSummary();
$('#priceMode').onchange = (e) => { priceMode = e.target.value; updateSummary(); };

// finalize
$('#finalize').onclick = () => {
  if(cart.length===0){ alert('Panier vide'); return; }
  const now = new Date();
  const invoice = {
    id: 'INV_'+now.getTime(),
    date: now.toISOString(),
    client: $('#clientName').value || 'Client',
    items: cart.map(c => ({name:c.name, qty:c.qty, price:c.price, total: c.qty*c.price})),
    taxRate, discountRate,
    totals: {
      subtotal: Number(subTotalEl.textContent.replace(/\s/g,'')),
      tax: Number(taxAmountEl.textContent.replace(/\s/g,'')),
      discount: Number(discountAmountEl.textContent.replace(/\s/g,'')),
      total: Number(grandTotalEl.textContent.replace(/\s/g,''))
    }
  };
  localStorage.setItem('pp_last_invoice', JSON.stringify(invoice));
  alert('Facture générée avec succès ! Tu peux imprimer, exporter en PDF ou télécharger le JSON.');
};

$('#print').onclick = () => {
  if(cart.length===0){ alert('Panier vide'); return; }
  const w = window.open('','PRINT','height=600,width=800');
  w.document.write(`<html><head><title>Facture</title><style>
    body{font-family:Arial;padding:20px}
    table{width:100%;border-collapse:collapse}
    th,td{padding:6px;border-bottom:1px solid #eee}
    .total{font-weight:700}
    </style></head><body>`);
  w.document.write(invoiceContent.innerHTML);
  w.document.write('</body></html>');
  w.document.close();
  w.focus();
  setTimeout(()=>{ w.print(); w.close(); }, 300);
};

$('#btnPdf').onclick = () => {
  if(cart.length===0){ alert('Panier vide'); return; }
  const element = document.createElement('div');
  element.innerHTML = invoiceContent.innerHTML;
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.marginBottom = '8px';
  header.innerHTML = `<div><strong>Bar Providence Plus</strong><br/>Lomé, Togo</div><div>${new Date().toLocaleString('fr-FR')}</div>`;
  element.prepend(header);

  const opt = {
    margin:       10,
    filename:     'facture_providence_plus.pdf',
    image:        { type: 'jpeg', quality: 1 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
};

$('#downloadJson').onclick = () => {
  const last = localStorage.getItem('pp_last_invoice');
  if(!last){ alert('Aucune facture générée. Cliquez sur "Générer facture" d\'abord.'); return; }
  const blob = new Blob([last], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'facture_providence_plus.json'; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
};

$('#clearCart').onclick = () => { if(confirm('Vider le panier ?')){ cart = []; renderCart(); } };

// load
function init(){
  renderProducts();
  renderCatalogue();
  renderCart();
}
init();
