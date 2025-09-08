from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, conint, confloat
from typing import Optional, List
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from .models import Produto

# cria tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Loja de Roupas")

# CORS para o front local (ajuste se precisar)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # em produção, restrinja
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# dependência de sessão DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "ok"}

# -------- Schemas --------
class ProdutoIn(BaseModel):
    nome: str = Field(..., min_length=3, max_length=60)
    descricao: Optional[str] = Field(None, max_length=255)
    preco: confloat(ge=0.01)
    estoque: conint(ge=0)
    categoria: str = Field(..., min_length=3, max_length=40)
    sku: Optional[str] = Field(None, max_length=40)

class ProdutoOut(ProdutoIn):
    id: int
    class Config:
        orm_mode = True

# -------- Produtos --------
@app.get("/produtos", response_model=List[ProdutoOut])
def listar_produtos(search: str = "", categoria: str = "", db: Session = Depends(get_db)):
    q = db.query(Produto)
    if search:
        like = f"%{search}%"
        q = q.filter(Produto.nome.ilike(like))
    if categoria:
        q = q.filter(Produto.categoria == categoria)
    return q.order_by(Produto.nome.asc()).all()

@app.post("/produtos", response_model=ProdutoOut, status_code=201)
def criar_produto(data: ProdutoIn, db: Session = Depends(get_db)):
    novo = Produto(**data.dict())
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@app.put("/produtos/{pid}", response_model=ProdutoOut)
def atualizar_produto(pid: int, data: ProdutoIn, db: Session = Depends(get_db)):
    prod = db.query(Produto).get(pid)
    if not prod:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    for k, v in data.dict().items():
        setattr(prod, k, v)
    db.commit()
    db.refresh(prod)
    return prod

@app.delete("/produtos/{pid}", status_code=204)
def deletar_produto(pid: int, db: Session = Depends(get_db)):
    prod = db.query(Produto).get(pid)
    if not prod:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    db.delete(prod)
    db.commit()
    return

# -------- Carrinho / Pedido --------
class ItemCarrinho(BaseModel):
    produto_id: int
    quantidade: conint(ge=1)

class ConfirmarPedidoIn(BaseModel):
    itens: List[ItemCarrinho]
    cupom: Optional[str] = None

class ConfirmarPedidoOut(BaseModel):
    mensagem: str
    total_final: float

@app.post("/carrinho/confirmar", response_model=ConfirmarPedidoOut)
def confirmar_pedido(payload: ConfirmarPedidoIn, db: Session = Depends(get_db)):
    total = 0.0
    prods = {}
    for item in payload.itens:
        prod = db.query(Produto).get(item.produto_id)
        if not prod:
            raise HTTPException(status_code=404, detail=f"Produto {item.produto_id} não encontrado.")
        if prod.estoque < item.quantidade:
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {prod.nome}.")
        prods[item.produto_id] = prod
        total += prod.preco * item.quantidade

    if payload.cupom and payload.cupom.upper() == "ALUNO10":
        total *= 0.9

    for item in payload.itens:
        prod = prods[item.produto_id]
        prod.estoque -= item.quantidade
    db.commit()

    return {"mensagem": "Pedido confirmado", "total_final": round(total, 2)}
