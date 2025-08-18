// Simulação de produtos (depois pode ser trocado por fetch na API)
const produtos = [
    { id: 1, nome: "Caderno", preco: 15.90, estoque: 10, categoria: "Papelaria" },
    { id: 2, nome: "Caneta Azul", preco: 2.50, estoque: 30, categoria: "Papelaria" },
    { id: 3, nome: "Mochila Escolar", preco: 89.90, estoque: 5, categoria: "Acessórios" }
];

let carrinho = [];

function renderProdutos() {
    const lista = document.getElementById('lista-produtos');
    lista.innerHTML = '';
    produtos.forEach(produto => {
        const div = document.createElement('div');
        div.className = 'produto-card';
        div.innerHTML = `
            <strong>${produto.nome}</strong><br>
            Preço: R$ ${produto.preco.toFixed(2)}<br>
            Estoque: ${produto.estoque}<br>
            <button ${produto.estoque === 0 ? 'disabled' : ''} onclick="adicionarCarrinho(${produto.id})">Adicionar ao Carrinho</button>
        `;
        lista.appendChild(div);
    });
}

function renderCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    lista.innerHTML = '';
    if (carrinho.length === 0) {
        lista.innerHTML = '<em>Carrinho vazio.</em>';
        return;
    }
    carrinho.forEach(item => {
        const div = document.createElement('div');
        div.className = 'carrinho-item';
        div.innerHTML = `
            ${item.nome} - R$ ${item.preco.toFixed(2)} 
            <button onclick="removerCarrinho(${item.id})">Remover</button>
        `;
        lista.appendChild(div);
    });
}

window.adicionarCarrinho = function(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto && produto.estoque > 0) {
        carrinho.push({ ...produto });
        produto.estoque -= 1;
        renderProdutos();
        renderCarrinho();
    }
};

window.removerCarrinho = function(id) {
    const index = carrinho.findIndex(item => item.id === id);
    if (index !== -1) {
        const produto = produtos.find(p => p.id === id);
        produto.estoque += 1;
        carrinho.splice(index, 1);
        renderProdutos();
        renderCarrinho();
    }
};

document.getElementById('finalizar-compra').onclick = function() {
    if (carrinho.length === 0) {
        alert('O carrinho está vazio!');
        return;
    }
    alert('Compra finalizada! (simulação)');
    carrinho = [];
    renderProdutos();
    renderCarrinho();
};

renderProdutos();
renderCarrinho();