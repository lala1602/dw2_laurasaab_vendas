from sqlalchemy import Column, Integer, String, Float
from .database import Base

class Produto(Base):
    __tablename__ = "produtos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(60), nullable=False)
    descricao = Column(String(255), nullable=True)
    preco = Column(Float, nullable=False)      # >= 0.01
    estoque = Column(Integer, nullable=False)  # >= 0
    categoria = Column(String(40), nullable=False)
    sku = Column(String(40), nullable=True)