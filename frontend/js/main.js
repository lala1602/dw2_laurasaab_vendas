// =======================
// Pink Store - Frontend
// Busca, filtro por categoria, ordenação, paginação,
// carrinho localStorage, cupom ALUNO10, export CSV/JSON,
// drawer acessível e clique com efeito rosa
// =======================

const fmtBRL = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

// ---------- Estado / Persistência ----------
const LS_KEYS = {
  CARRINHO: 'ps_carrinho',
  ORDENACAO: 'ps_ordenacao',
  CUPOM: 'ps_cupom',
  PRODUTOS: 'ps_produtos'
};

// Catálogo pedido
const PRODUTOS_SEMENTE = [
  { id: 1, nome: "Calça Cargo Branca", preco: 169.90, estoque: 12, categoria: "Calças" },
  { id: 2, nome: "Calça Cargo Cinza",  preco: 169.90, estoque: 10, categoria: "Calças" },
  { id: 3, nome: "Body Preto",         preco: 79.90,  estoque: 20, categoria: "Bodies" },
  { id: 4, nome: "Body Vinho",         preco: 84.90,  estoque: 18, categoria: "Bodies" },
  { id: 5, nome: "Cropped Preto",      preco: 59.90,  estoque: 25, categoria: "Croppeds" },
  { id: 6, nome: "Shorts Jeans Claro", preco: 89.90,  estoque: 16, categoria: "Shorts" }
];

function loadProdutos() {
  const salvo = localStorage.getItem(LS_KEYS.PRODUTOS);
  return salvo ? JSON.parse(salvo) : structuredClone(PRODUTOS_SEMENTE);
}
function saveProdutos(arr) { localStorage.setItem(LS_KEYS.PRODUTOS, JSON.stringify(arr)); }
let produtos = loadProdutos();

function loadCarrinho() { try { return JSON.parse(localStorage.getItem(LS_KEYS.CARRINHO)) ?? []; } catch { return []; } }
function saveCarrinho(c) { localStorage.setItem(LS_KEYS.CARRINHO, JSON.stringify(c)); atualizarBadge(); }

function loadOrdenacao() { return localStorage.getItem(LS_KEYS.ORDENACAO) || 'nome-asc'; }
function saveOrdenacao(v) { localStorage.setItem(LS_KEYS.ORDENACAO, v); }

function loadCupom() { return localStorage.getItem(LS_KEYS.CUPOM) || ''; }
function saveCupom(v) { localStorage.setItem(LS_KEYS.CUPOM, v); }

let carrinho = loadCarrinho();
let cupom = loadCupom();

// ---------- DOM ----------
const elListaProdutos = document.getElementById('lista-produtos');
const elBusca = document.getElementById('busca-produto');
const elOrdenar = document.getElementById('ordenar');
const elCategoria = document.getElementById('categoria');
const elBtnMais = document.getElementById('btn-mais');
const elBtnLimpar = document.getElementById('btn-limpar');
const elBtnExportJSON = document.getElementById('btn-export-json');
const elBtnExportCSV = document.getElementById('btn-export-csv');

const elBtnCarrinho = document.getElementById('btn-carrinho');
const elBadge = document.getElementById('badge-carrinho');
const elOverlay = document.getElementById('overlay');
const elDrawer = document.getElementById('drawer-carrinho');
const elFecharCarrinho = document.getElementById('fechar-carrinho');
const elListaCarrinho = document.getElementById('lista-carrinho');
const elSubtotal = document.getElementById('subtotal');
const elDesconto = document.getElementById('desconto');
const elTotal = document.getElementById('total');
const elFinalizar = document.getElementById('finalizar-compra');
const elInputCupom = document.getElementById('input-cupom');
const elAplicarCupom = document.getElementById('btn-aplicar-cupom');
const elRemoverCupom = document.getElementById('btn-remover-cupom');

const elLive = document.getElementById('sr-live');

// ---------- Filtros / paginação ----------
let pagina = 1;
const TAM_PAGINA = 10;

function normalizar(str) {
  return (str || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function filtrarOrdenar() {
  const termo = normalizar(elBusca.value);
  const cat = elCategoria?.value || '';
  let base = produtos.filter(p =>
    normalizar(p.nome).includes(termo) && (cat === '' || p.categoria === cat)
  );

  const ord = elOrdenar.value;
  if (ord === 'nome-asc') base.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (ord === 'preco-asc') base.sort((a,b) => a.preco - b.preco);
  if (ord === 'preco-desc') base.sort((a,b) => b.preco - a.preco);

  return base;
}

function paginaAtual(lista) {
  const fim = pagina * TAM_PAGINA;
  const sub = lista.slice(0, fim);
  elBtnMais.style.display = lista.length > sub.length ? 'inline-block' : 'none';
  return sub;
}

// ---------- Helpers carrinho ----------
function qtdNoCarrinho(id) {
  const item = carrinho.find(i => i.id === id);
  return item ? item.qtd : 0;
}
function estoqueDisponivel(id) {
  const p = produtos.find(p => p.id === id);
  return p ? Math.max(0, p.estoque - qtdNoCarrinho(id)) : 0;
}

// ---------- Render de Produtos ----------
function renderProdutos() {
  const listaFiltrada = filtrarOrdenar();
  const visiveis = paginaAtual(listaFiltrada);

  elListaProdutos.innerHTML = '';
  visiveis.forEach(prod => {
    const disp = estoqueDisponivel(prod.id);
    const card = document.createElement('div');
    card.className = 'card-produto';
    const urlImg = `https://placehold.co/300x300/jpg?text=${encodeURIComponent(prod.nome)}`;

    card.innerHTML = `
      <img src="${urlImg}" alt="${prod.nome}" />
      <strong>${prod.nome}</strong>
      <div class="price">${fmtBRL(prod.preco)}</div>
      <div style="font-size:.9rem;color:#b8bac0;">Estoque: ${prod.estoque}</div>

      <div class="qtd-controls" aria-label="Quantidade no carrinho de ${prod.nome}">
        <button class="icon" data-act="menos" data-id="${prod.id}" ${qtdNoCarrinho(prod.id)===0?'disabled':''} aria-label="Diminuir quantidade">-</button>
        <span aria-live="polite">${qtdNoCarrinho(prod.id)}</span>
        <button class="icon" data-act="mais" data-id="${prod.id}" ${disp===0?'disabled':''} aria-label="Aumentar quantidade">+</button>
      </div>

      <button data-act="add" data-id="${prod.id}" ${disp===0?'disabled':''}>Adicionar ao Carrinho</button>
    `;
    elListaProdutos.appendChild(card);
  });
}

// Delegação dos botões dos cards
elListaProdutos.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const act = btn.dataset.act;

  if (act === 'add') adicionarCarrinho(id, 1);
  if (act === 'mais') adicionarCarrinho(id, 1);
  if (act === 'menos') removerQuantidade(id, 1);
});

// ---------- Carrinho ----------
function atualizarBadge() {
  const totalQtd = carrinho.reduce((s,i)=>s+i.qtd,0);
  elBadge.textContent = String(totalQtd);
}

function renderCarrinho() {
  elListaCarrinho.innerHTML = '';
  if (carrinho.length === 0) {
    elListaCarrinho.innerHTML = '<em>Carrinho vazio.</em>';
  } else {
    carrinho.forEach(item => {
      const p = produtos.find(p => p.id === item.id);
      const max = (p?.estoque ?? 0);

      const row = document.createElement('div');
      row.className = 'carrinho-item';
      row.innerHTML = `
        <div>
          <div><strong>${item.nome}</strong></div>
          <div style="font-size:.9rem;color:#b8bac0;">${fmtBRL(item.preco)} — Em estoque: ${max}</div>
          <div class="qtd-controls" aria-label="Controle de quantidade para ${item.nome}">
            <button class="icon" data-act="menos-c" data-id="${item.id}" aria-label="Diminuir quantidade">-</button>
            <span aria-live="polite">${item.qtd}</span>
            <button class="icon" data-act="mais-c" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
            <button class="icon" data-act="rem" data-id="${item.id}" aria-label="Remover item">remover</button>
          </div>
        </div>
        <div><strong>${fmtBRL(item.preco * item.qtd)}</strong></div>
      `;
      elListaCarrinho.appendChild(row);
    });
  }
  calcularTotais();
}

elListaCarrinho.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const act = btn.dataset.act;

  if (act === 'menos-c') removerQuantidade(id, 1);
  if (act === 'mais-c') adicionarCarrinho(id, 1);
  if (act === 'rem') removerDoCarrinho(id);
});

function adicionarCarrinho(id, qtd = 1) {
  const p = produtos.find(p => p.id === id);
  if (!p) return;

  const item = carrinho.find(i => i.id === id);
  const atual = item ? item.qtd : 0;
  const disponivel = p.estoque - atual;

  if (disponivel <= 0) { anunciar(`Sem estoque disponível para ${p.nome}.`); return; }
  const novaQtd = Math.min(atual + qtd, p.estoque);

  if (item) item.qtd = novaQtd;
  else carrinho.push({ id: p.id, nome: p.nome, preco: p.preco, qtd: 1 });

  saveCarrinho(carrinho);
  renderProdutos(); renderCarrinho();
  anunciar(`${p.nome} adicionado ao carrinho.`);
}

function removerQuantidade(id, qtd = 1) {
  const item = carrinho.find(i => i.id === id);
  if (!item) return;
  item.qtd = Math.max(0, item.qtd - qtd);
  if (item.qtd === 0) {
    carrinho = carrinho.filter(i => i.id !== id);
    anunciar(`Item removido do carrinho.`);
  }
  saveCarrinho(carrinho);
  renderProdutos(); renderCarrinho();
}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter(i => i.id !== id);
  saveCarrinho(carrinho);
  renderProdutos(); renderCarrinho();
  anunciar(`Item removido do carrinho.`);
}

// Totais + cupom
function calcularTotais() {
  const subtotal = carrinho.reduce((s,i)=> s + i.preco * i.qtd, 0);
  let desconto = 0;
  if (cupom === 'ALUNO10') desconto = subtotal * 0.10;
  const total = Math.max(0, subtotal - desconto);
  elSubtotal.textContent = fmtBRL(subtotal);
  elDesconto.textContent = fmtBRL(desconto);
  elTotal.textContent = fmtBRL(total);
  elAplicarCupom.setAttribute('aria-pressed', cupom === 'ALUNO10' ? 'true' : 'false');
}

elAplicarCupom?.addEventListener('click', () => {
  const code = (elInputCupom.value || '').trim().toUpperCase();
  if (code === 'ALUNO10') {
    cupom = code; saveCupom(cupom); calcularTotais(); anunciar('Cupom aplicado com sucesso.');
  } else { anunciar('Cupom inválido.'); }
});
elRemoverCupom?.addEventListener('click', () => {
  cupom = ''; saveCupom(cupom); elInputCupom.value = ''; calcularTotais(); anunciar('Cupom removido.');
});

// Finalizar (simulação)
elFinalizar?.addEventListener('click', () => {
  if (carrinho.length === 0) { alert('O carrinho está vazio!'); return; }
  for (const item of carrinho) {
    const p = produtos.find(p => p.id === item.id);
    if (!p || item.qtd > p.estoque) { alert(`Estoque insuficiente para ${item?.nome ?? 'produto'}.`); return; }
  }
  for (const item of carrinho) {
    const p = produtos.find(p => p.id === item.id);
    p.estoque -= item.qtd;
  }
  saveProdutos(produtos);
  carrinho = []; saveCarrinho(carrinho);
  cupom = ''; saveCupom(cupom);
  renderProdutos(); renderCarrinho();
  anunciar('Pedido confirmado! Estoques atualizados.');
  alert('Compra finalizada! (simulação)');
});

// ---------- Exportações ----------
elBtnExportJSON?.addEventListener('click', () => {
  const data = filtrarOrdenar();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  baixarArquivo(blob, 'produtos-filtrados.json');
});
elBtnExportCSV?.addEventListener('click', () => {
  const data = filtrarOrdenar();
  const header = ['id', 'nome', 'preco', 'estoque', 'categoria'];
  const linhas = [header.join(',')].concat(
    data.map(p => [p.id, `"${p.nome.replace(/"/g,'""')}"`, p.preco, p.esteque ?? p.estoque, `"${p.categoria.replace(/"/g,'""')}"`].join(','))
  );
  const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
  baixarArquivo(blob, 'produtos-filtrados.csv');
});
function baixarArquivo(blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Drawer ----------
function abrirCarrinho() {
  elOverlay.hidden = false;
  elDrawer.hidden = false;
  elBtnCarrinho.setAttribute('aria-expanded', 'true');
  elFecharCarrinho.focus();
}
function fecharCarrinho() {
  elOverlay.hidden = true;
  elDrawer.hidden = true;
  elBtnCarrinho.setAttribute('aria-expanded', 'false');
  elBtnCarrinho.focus();
}
elBtnCarrinho?.addEventListener('click', abrirCarrinho);
elFecharCarrinho?.addEventListener('click', fecharCarrinho);
elOverlay?.addEventListener('click', fecharCarrinho);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !elDrawer.hidden) fecharCarrinho(); });

// ---------- Busca / Ordenação / Categoria / Paginação ----------
elOrdenar.value = loadOrdenacao();
elOrdenar.addEventListener('change', () => { saveOrdenacao(elOrdenar.value); pagina = 1; renderProdutos(); });
elBusca.addEventListener('input', () => { pagina = 1; renderProdutos(); });
elCategoria?.addEventListener('change', () => { pagina = 1; renderProdutos(); });

elBtnMais.addEventListener('click', () => { pagina += 1; renderProdutos(); });

elBtnLimpar.addEventListener('click', () => {
  elBusca.value = '';
  elCategoria.value = '';
  elOrdenar.value = 'nome-asc'; saveOrdenacao('nome-asc');
  pagina = 1; renderProdutos();
});

// ---------- Feedback acessível ----------
function anunciar(msg) {
  elLive.textContent = '';
  setTimeout(() => elLive.textContent = msg, 10);
}

// ---------- Efeito rosa no clique de botões ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  btn.classList.add('ativo');
  setTimeout(() => btn.classList.remove('ativo'), 450);
});

// ---------- Inicialização ----------
function init() {
  atualizarBadge();
  renderProdutos();
  renderCarrinho();
  if (cupom) elInputCupom.value = cupom;
  calcularTotais();
}
document.addEventListener('DOMContentLoaded', init);
