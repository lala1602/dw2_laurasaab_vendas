from fastapi import APIRouter

router = APIRouter()

@router.get("/produtos")
async def listar_produtos():
    return {"produtos": []}

@router.post("/produtos")
async def criar_produto(produto: dict):
    return {"mensagem": "Produto criado com sucesso", "produto": produto}

@router.get("/produtos/{produto_id}")
async def obter_produto(produto_id: int):
    return {"produto_id": produto_id}

@router.put("/produtos/{produto_id}")
async def atualizar_produto(produto_id: int, produto: dict):
    return {"mensagem": "Produto atualizado com sucesso", "produto_id": produto_id, "produto": produto}

@router.delete("/produtos/{produto_id}")
async def deletar_produto(produto_id: int):
    return {"mensagem": "Produto deletado com sucesso", "produto_id": produto_id}