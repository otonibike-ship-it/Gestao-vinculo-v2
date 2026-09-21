from fastapi import APIRouter, Depends
from app.core.security import get_current_user, require_perfis
from app.api.v1.endpoints import vinculo, auth, empresas, dashboard, upload, usuarios, configuracoes, troca_pedido, link_pagamento, carta_correcao, solicitacao_estorno, cancelamento_venda

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", dependencies=[Depends(get_current_user)], tags=["dashboard"])
api_router.include_router(vinculo.router, prefix="/vinculos", dependencies=[Depends(get_current_user)], tags=["vinculos"])
api_router.include_router(empresas.router, prefix="/empresas", dependencies=[Depends(get_current_user)], tags=["empresas"])
api_router.include_router(upload.router, prefix="/upload", dependencies=[Depends(get_current_user)], tags=["upload"])
api_router.include_router(usuarios.router, prefix="/usuarios", dependencies=[Depends(require_perfis("admin"))], tags=["usuarios"])
api_router.include_router(configuracoes.router, prefix="/configuracoes", dependencies=[Depends(require_perfis("admin"))], tags=["configuracoes"])
api_router.include_router(troca_pedido.router, prefix="/trocas-pedido", dependencies=[Depends(get_current_user)], tags=["trocas-pedido"])
api_router.include_router(link_pagamento.router, prefix="/links-pagamento", dependencies=[Depends(get_current_user)], tags=["links-pagamento"])
api_router.include_router(carta_correcao.router, prefix="/cartas-correcao", dependencies=[Depends(get_current_user)], tags=["cartas-correcao"])
api_router.include_router(solicitacao_estorno.router, prefix="/solicitacoes-estorno", dependencies=[Depends(get_current_user)], tags=["solicitacoes-estorno"])
api_router.include_router(cancelamento_venda.router, prefix="/cancelamentos-venda", dependencies=[Depends(get_current_user)], tags=["cancelamentos-venda"])
