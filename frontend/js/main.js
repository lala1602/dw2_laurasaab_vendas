// =======================
// Loja de Roupas — main.js
// Busca, (categoria opcional), ordenação persistida,
// carrinho localStorage, cupom ALUNO10, paginação,
// export CSV/JSON, drawer acessível, integração FastAPI
// =======================

const API = "http://127.0.0.1:8000";
const fmtBRL = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

// ---------- Estado / Persistência ----------
const LS_KEYS = {
  CARRINHO: 'loja_carrinho',
  ORDENACAO: 'loja_ordenacao',
  CATEGORIA: 'loja_categoria',
  CUPOM: 'loja_cupom',
  PRODUTOS: 'loja_produtos'
};

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) {
  localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
}

const PRODUTOS_SEMENTE = [
  { id: 1, nome: "Camiseta Oversized Preta", preco: 79.9, estoque: 15, categoria: "Camisetas" },
  { id: 2, nome: "Calça Jeans Skinny Azul", preco: 169.9, estoque: 8, categoria: "Calças" },
  { id: 3, nome: "Moletom Capuz Cinza", preco: 199.9, estoque: 6, categoria: "Moletons" },
  { id: 4, nome: "Vestido Midi Preto", preco: 189.9, estoque: 7, categoria: "Vestidos" },
  { id: 5, nome: "Boné Trucker Preto", preco: 69.9, estoque: 20, categoria: "Acessórios" },
  { id: 6, nome: "Tênis Casual Branco", preco: 249.9, estoque: 10, categoria: "Calçados" }
];

// ---------- Variáveis globais ----------
let produtos = [];                              // catálogo carregado da API (ou seed local)
let carrinho = load(LS_KEYS.CARRINHO, []);      // [{id,nome,preco,qtd}]
let cupom = localStorage.getItem(LS_KEYS.CUPOM) || "";

// ---------- DOM ----------
const elListaProdutos  = document.getElementById('lista-produtos');
const elBusca          = document.getElementById('busca-produto');
const elOrdenar        = document.getElementById('ordenar');
const elCategoria      = document.getElementById('categoria'); // pode não existir no seu HTML
const elBtnMais        = document.getElementById('btn-mais');
const elBtnLimpar      = document.getElementById('btn-limpar');
const elBtnExportJSON  = document.getElementById('btn-export-json');
const elBtnExportCSV   = document.getElementById('btn-export-csv');

const elBtnCarrinho    = document.getElementById('btn-carrinho');
const elBadge          = document.getElementById('badge-carrinho');
const elOverlay        = document.getElementById('overlay');
const elDrawer         = document.getElementById('drawer-carrinho');
const elFecharCarrinho = document.getElementById('fechar-carrinho');
const elListaCarrinho  = document.getElementById('lista-carrinho');
const elSubtotal       = document.getElementById('subtotal');
const elDesconto       = document.getElementById('desconto');
const elTotal          = document.getElementById('total');
const elFinalizar      = document.getElementById('finalizar-compra');
const elInputCupom     = document.getElementById('input-cupom');
const elAplicarCupom   = document.getElementById('btn-aplicar-cupom');
const elRemoverCupom   = document.getElementById('btn-remover-cupom');
const elLive           = document.getElementById('sr-live');

// ---------- Filtros / paginação ----------
let pagina = 1;
const TAM_PAGINA = 12;

function normalizar(str) {
  return (str || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function filtrarOrdenar() {
  const termo = normalizar(elBusca?.value || "");
  const cat = elCategoria ? (elCategoria.value || "") : "";

  let base = produtos.filter(p => {
    const okBusca = normalizar(p.nome).includes(termo);
    const okCat = !cat || p.categoria === cat;
    return okBusca && okCat;
  });

  const ord = elOrdenar?.value || 'nome-asc';
  if (ord === 'nome-asc') base.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (ord === 'preco-asc') base.sort((a,b) => a.preco - b.preco);
  if (ord === 'preco-desc') base.sort((a,b) => b.preco - a.preco);

  return base;
}

function paginaAtual(lista) {
  const fim = pagina * TAM_PAGINA;
  const sub = lista.slice(0, fim);
  if (elBtnMais) elBtnMais.style.display = lista.length > sub.length ? 'inline-block' : 'none';
  return sub;
}

// ---------- Render de Produtos ----------
function qtdNoCarrinho(id) {
  const item = carrinho.find(i => i.id === id);
  return item ? item.qtd : 0;
}
function estoqueDisponivel(id) {
  const p = produtos.find(p => p.id === id);
  return p ? Math.max(0, p.estoque - qtdNoCarrinho(id)) : 0;
}

function renderProdutos() {
  const listaFiltrada = filtrarOrdenar();
  const visiveis = paginaAtual(listaFiltrada);

  elListaProdutos.innerHTML = '';
  visiveis.forEach(prod => {
    const disp = estoqueDisponivel(prod.id);

    const card = document.createElement('article');
    card.className = 'card-produto';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', prod.nome);
    card.innerHTML = `
      <img src="https://picsum.photos/seed/${encodeURIComponent(prod.nome)}/320/320"
           alt="Foto ilustrativa: ${prod.nome}" />
      <strong>${prod.nome}</strong>
      <div class="price">${fmtBRL(prod.preco)}</div>
      <div style="font-size:.9rem;color:#6b7280;">
        ${prod.estoque>0 ? `Estoque: ${prod.estoque}` : `<span class="badge-oos">Sem estoque</span>`}
      </div>
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

// Delegação para os botões dos cards
elListaProdutos.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const act = btn.dataset.act;

  if (act === 'add')      adicionarCarrinho(id, 1);
  else if (act === 'mais') adicionarCarrinho(id, 1);
  else if (act === 'menos') removerQuantidade(id, 1);
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
      const p = produtos.find(p => p.id === item.id) || {estoque:0};
      const row = document.createElement('div');
      row.className = 'carrinho-item';
      row.innerHTML = `
        <div>
          <div><strong>${item.nome}</strong></div>
          <div style="font-size:.9rem;color:#6b7280;">${fmtBRL(item.preco)} — Em estoque: ${p.estoque}</div>
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
  if (act === 'mais-c')  adicionarCarrinho(id, 1);
  if (act === 'rem')     removerDoCarrinho(id);
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

  save(LS_KEYS.CARRINHO, carrinho);
  atualizarBadge();
  renderProdutos();
  renderCarrinho();
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
  save(LS_KEYS.CARRINHO, carrinho);
  atualizarBadge();
  renderProdutos();
  renderCarrinho();
}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter(i => i.id !== id);
  save(LS_KEYS.CARRINHO, carrinho);
  atualizarBadge();
  renderProdutos();
  renderCarrinho();
  anunciar(`Item removido do carrinho.`);
}

// Totais + cupom
function calcularTotais() {
  const subtotal = carrinho.reduce((s,i)=> s + i.preco * i.qtd, 0);
  let desconto = 0;
  if ((cupom || "").toUpperCase() === 'ALUNO10') desconto = subtotal * 0.10;
  const total = Math.max(0, subtotal - desconto);

  elSubtotal.textContent = fmtBRL(subtotal);
  elDesconto.textContent = fmtBRL(desconto);
  elTotal.textContent = fmtBRL(total);

  if (elAplicarCupom) elAplicarCupom.setAttribute('aria-pressed', (cupom || "").toUpperCase() === 'ALUNO10' ? 'true' : 'false');
}

elAplicarCupom?.addEventListener('click', () => {
  const code = (elInputCupom.value || '').trim().toUpperCase();
  if (code === 'ALUNO10') {
    cupom = code;
    localStorage.setItem(LS_KEYS.CUPOM, cupom);
    calcularTotais();
    anunciar('Cupom aplicado com sucesso.');
  } else {
    anunciar('Cupom inválido.');
  }
});
elRemoverCupom?.addEventListener('click', () => {
  cupom = '';
  localStorage.setItem(LS_KEYS.CUPOM, cupom);
  if (elInputCupom) elInputCupom.value = '';
  calcularTotais();
  anunciar('Cupom removido.');
});

// Finalizar compra (API)
elFinalizar?.addEventListener('click', async () => {
  if (carrinho.length === 0) { alert('O carrinho está vazio!'); return; }

  const itens = carrinho.map(i => ({ produto_id: i.id, quantidade: i.qtd }));
  try {
    const res = await fetch(`${API}/carrinho/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens, cupom })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({detail:"Erro"}));
      alert(`Erro: ${err.detail || res.status}`);
      return;
    }
    const data = await res.json();
    anunciar('Pedido confirmado! Estoques atualizados pelo servidor.');
    alert(`Compra finalizada! Total: ${fmtBRL(data.total_final)}`);

    // Limpar estado local e recarregar
    carrinho = [];
    save(LS_KEYS.CARRINHO, carrinho);
    cupom = '';
    localStorage.setItem(LS_KEYS.CUPOM, cupom);
    produtos = await loadProdutosAPI();
    atualizarBadge();
    renderProdutos(); renderCarrinho(); calcularTotais();
  } catch (e) {
    alert('Não foi possível confirmar o pedido (API offline?).');
  }
});

// ---------- Exportações ----------
elBtnExportJSON?.addEventListener('click', () => {
  const data = filtrarOrdenar();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  baixarArquivo(blob, 'catalogo-filtrado.json');
});
elBtnExportCSV?.addEventListener('click', () => {
  const data = filtrarOrdenar();
  const header = ['id','nome','preco','estoque','categoria'];
  const linhas = [header.join(',')].concat(
    data.map(p => [p.id, `"${p.nome.replace(/"/g,'""')}"`, p.preco, p.estoque, `"${(p.categoria||'').replace(/"/g,'""')}"`].join(','))
  );
  const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
  baixarArquivo(blob, 'catalogo-filtrado.csv');
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

// ---------- Busca / Categoria / Ordenação / Paginação ----------
elOrdenar && (elOrdenar.value = localStorage.getItem(LS_KEYS.ORDENACAO) || 'nome-asc');
elOrdenar?.addEventListener('change', () => {
  localStorage.setItem(LS_KEYS.ORDENACAO, elOrdenar.value);
  pagina = 1; renderProdutos();
});

if (elCategoria) {
  elCategoria.value = localStorage.getItem(LS_KEYS.CATEGORIA) || '';
  elCategoria.addEventListener('change', () => {
    localStorage.setItem(LS_KEYS.CATEGORIA, elCategoria.value);
    pagina = 1; renderProdutos();
  });
}

elBusca?.addEventListener('input', () => { pagina = 1; renderProdutos(); });
elBtnMais?.addEventListener('click', () => { pagina += 1; renderProdutos(); });
elBtnLimpar?.addEventListener('click', () => {
  if (elBusca) elBusca.value = '';
  if (elOrdenar) { elOrdenar.value = 'nome-asc'; localStorage.setItem(LS_KEYS.ORDENACAO, 'nome-asc'); }
  if (elCategoria) { elCategoria.value = ''; localStorage.setItem(LS_KEYS.CATEGORIA, ''); }
  pagina = 1; renderProdutos();
});

// ---------- Feedback acessível ----------
function anunciar(msg) {
  elLive.textContent = '';
  setTimeout(() => elLive.textContent = msg, 10);
}

// ---------- API ----------
async function loadProdutosAPI() {
  try {
    // Daria para passar search/categoria/sort via query, mas buscamos tudo e filtramos no front
    const res = await fetch(`${API}/produtos`);
    if (!res.ok) throw new Error("Falha ao listar produtos");
    const data = await res.json();
    save(LS_KEYS.PRODUTOS, data);
    return data;
  } catch {
    // fallback local
    const salvo = load(LS_KEYS.PRODUTOS, null);
    return salvo ?? structuredClone(PRODUTOS_SEMENTE);
  }
}

// ---------- Inicialização ----------
async function init() {
  produtos = await loadProdutosAPI();
  atualizarBadge();
  renderProdutos();
  renderCarrinho();
  if (cupom && elInputCupom) elInputCupom.value = cupom;
  calcularTotais();
}
document.addEventListener('DOMContentLoaded', init);
