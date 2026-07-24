import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.configuracao import Configuracao

logger = logging.getLogger(__name__)


async def _get_configs() -> dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Configuracao))
        return {row.chave: row.valor for row in result.scalars().all()}


def _render(template: str, **kwargs) -> str:
    try:
        return template.format(**kwargs)
    except KeyError:
        return template


def _send(cfg: dict, destinatario: str, assunto: str, corpo: str):
    host = cfg.get("smtp_host", "smtp.gmail.com")
    port = int(cfg.get("smtp_port", 587))
    user = cfg.get("smtp_user", "")
    password = cfg.get("smtp_password", "")
    tls = cfg.get("smtp_tls", "true").lower() == "true"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = assunto
    msg["From"] = f"Gestão de Vínculo <{user}>"
    msg["To"] = destinatario
    msg.attach(MIMEText(corpo, "plain", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            if tls:
                server.starttls()
            server.login(user, password)
            server.sendmail(user, [destinatario], msg.as_string())
        logger.info("Email enviado para %s | %s", destinatario, assunto)
    except Exception as e:
        logger.error("Falha ao enviar email para %s: %s", destinatario, str(e))


async def notificar_novo_pedido(numero_pedido: str, nome_cliente: str, franquia_nome: str):
    cfg = await _get_configs()
    destinatario = cfg.get("email_comercial", "")
    if not destinatario:
        return
    corpo = _render(cfg.get("tpl_novo_pedido", "Novo pedido: {numero_pedido}"),
                    numero_pedido=numero_pedido, nome_cliente=nome_cliente, franquia_nome=franquia_nome)
    _send(cfg, destinatario, f"Novo pedido para análise: {numero_pedido}", corpo)


async def notificar_aprovado_financeiro(numero_pedido: str, nome_cliente: str, franquia_nome: str):
    cfg = await _get_configs()
    destinatario = cfg.get("email_financeiro", "")
    if not destinatario:
        return
    corpo = _render(cfg.get("tpl_aprovado_financeiro", "Novo pedido financeiro: {numero_pedido}"),
                    numero_pedido=numero_pedido, nome_cliente=nome_cliente, franquia_nome=franquia_nome)
    _send(cfg, destinatario, f"Pedido para análise financeira: {numero_pedido}", corpo)


async def notificar_aprovado_ti(numero_pedido: str, nome_cliente: str, franquia_nome: str):
    cfg = await _get_configs()
    destinatario = cfg.get("email_ti", "")
    if not destinatario:
        return
    corpo = _render(cfg.get("tpl_aprovado_ti", "Novo pedido TI: {numero_pedido}"),
                    numero_pedido=numero_pedido, nome_cliente=nome_cliente, franquia_nome=franquia_nome)
    _send(cfg, destinatario, f"Pedido para execução TI: {numero_pedido}", corpo)


async def notificar_reprovado(numero_pedido: str, motivo: str, email_destino: str):
    cfg = await _get_configs()
    if not email_destino:
        return
    corpo = _render(cfg.get("tpl_reprovado", "Pedido reprovado: {numero_pedido}. Motivo: {motivo}"),
                    numero_pedido=numero_pedido, motivo=motivo or "—")
    _send(cfg, email_destino, f"Pedido reprovado: {numero_pedido}", corpo)


async def notificar_vinculado(numero_pedido: str, nome_cliente: str, email_franquia: str):
    cfg = await _get_configs()
    if not email_franquia:
        return
    corpo = _render(cfg.get("tpl_vinculado", "Pedido vinculado: {numero_pedido}"),
                    numero_pedido=numero_pedido, nome_cliente=nome_cliente)
    _send(cfg, email_franquia, f"Pedido vinculado com sucesso: {numero_pedido}", corpo)


async def notificar_novo_pedido_troca(numero_pedido_cancelar: str, nome_vendedor: str, franquia_nome: str):
    cfg = await _get_configs()
    destinatario = cfg.get("email_comercial", "")
    if not destinatario:
        return
    corpo = _render(cfg.get("tpl_novo_pedido_troca", "Nova troca de pedido: {numero_pedido_cancelar}"),
                    numero_pedido_cancelar=numero_pedido_cancelar, nome_vendedor=nome_vendedor, franquia_nome=franquia_nome)
    _send(cfg, destinatario, f"Nova troca de pedido para análise: {numero_pedido_cancelar}", corpo)


async def notificar_triagem_troca(numero_pedido_cancelar: str, nome_vendedor: str, franquia_nome: str, email_destino: str):
    cfg = await _get_configs()
    if not email_destino:
        return
    corpo = _render(cfg.get("tpl_triagem_troca", "Troca de pedido para análise: {numero_pedido_cancelar}"),
                    numero_pedido_cancelar=numero_pedido_cancelar, nome_vendedor=nome_vendedor, franquia_nome=franquia_nome)
    _send(cfg, email_destino, f"Troca de pedido para análise: {numero_pedido_cancelar}", corpo)


async def notificar_concluido_troca(numero_pedido_cancelar: str, nome_vendedor: str, email_franquia: str):
    cfg = await _get_configs()
    if not email_franquia:
        return
    corpo = _render(cfg.get("tpl_concluido_troca", "Troca de pedido concluída: {numero_pedido_cancelar}"),
                    numero_pedido_cancelar=numero_pedido_cancelar, nome_vendedor=nome_vendedor)
    _send(cfg, email_franquia, f"Troca de pedido concluída: {numero_pedido_cancelar}", corpo)


async def notificar_novo_pedido_link(numero_pedido: str, vendedor: str, franquia_nome: str):
    cfg = await _get_configs()
    destinatario = cfg.get("email_comercial", "")
    if not destinatario:
        return
    corpo = _render(cfg.get("tpl_novo_pedido_link", "Novo link de pagamento solicitado: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor, franquia_nome=franquia_nome)
    _send(cfg, destinatario, f"Novo link de pagamento para análise: {numero_pedido}", corpo)


async def notificar_triagem_link(numero_pedido: str, vendedor: str, franquia_nome: str, email_destino: str):
    cfg = await _get_configs()
    if not email_destino:
        return
    corpo = _render(cfg.get("tpl_triagem_link", "Link de pagamento para análise: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor, franquia_nome=franquia_nome)
    _send(cfg, email_destino, f"Link de pagamento para análise: {numero_pedido}", corpo)


async def notificar_concluido_link(numero_pedido: str, vendedor: str, email_franquia: str):
    cfg = await _get_configs()
    if not email_franquia:
        return
    corpo = _render(cfg.get("tpl_concluido_link", "Link de pagamento concluído: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor)
    _send(cfg, email_franquia, f"Link de pagamento concluído: {numero_pedido}", corpo)


async def notificar_novo_pedido_carta(numero_pedido: str, nome_cliente: str, franquia_nome: str):
    cfg = await _get_configs()
    destinatario = cfg.get("email_comercial", "")
    if not destinatario:
        return
    corpo = _render(cfg.get("tpl_novo_pedido_carta", "Nova carta de correção solicitada: {numero_pedido}"),
                    numero_pedido=numero_pedido, nome_cliente=nome_cliente, franquia_nome=franquia_nome)
    _send(cfg, destinatario, f"Nova carta de correção para análise: {numero_pedido}", corpo)


async def notificar_triagem_carta(numero_pedido: str, nome_cliente: str, franquia_nome: str, email_destino: str):
    cfg = await _get_configs()
    if not email_destino:
        return
    corpo = _render(cfg.get("tpl_triagem_carta", "Carta de correção para análise: {numero_pedido}"),
                    numero_pedido=numero_pedido, nome_cliente=nome_cliente, franquia_nome=franquia_nome)
    _send(cfg, email_destino, f"Carta de correção para análise: {numero_pedido}", corpo)


async def notificar_concluido_carta(numero_pedido: str, nome_cliente: str, email_franquia: str):
    cfg = await _get_configs()
    if not email_franquia:
        return
    corpo = _render(cfg.get("tpl_concluido_carta", "Sua carta de correção foi concluída: {numero_pedido}"),
                    numero_pedido=numero_pedido, nome_cliente=nome_cliente)
    _send(cfg, email_franquia, f"Carta de correção concluída: {numero_pedido}", corpo)


async def notificar_novo_pedido_estorno(numero_pedido: str, vendedor: str, franquia_nome: str):
    cfg = await _get_configs()
    destinatario = cfg.get("email_comercial", "")
    if not destinatario:
        return
    corpo = _render(cfg.get("tpl_novo_pedido_estorno", "Nova solicitação de estorno: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor, franquia_nome=franquia_nome)
    _send(cfg, destinatario, f"Nova solicitação de estorno para análise: {numero_pedido}", corpo)


async def notificar_triagem_estorno(numero_pedido: str, vendedor: str, franquia_nome: str, email_destino: str):
    cfg = await _get_configs()
    if not email_destino:
        return
    corpo = _render(cfg.get("tpl_triagem_estorno", "Solicitação de estorno para análise: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor, franquia_nome=franquia_nome)
    _send(cfg, email_destino, f"Solicitação de estorno para análise: {numero_pedido}", corpo)


async def notificar_concluido_estorno(numero_pedido: str, vendedor: str, email_franquia: str):
    cfg = await _get_configs()
    if not email_franquia:
        return
    corpo = _render(cfg.get("tpl_concluido_estorno", "Sua solicitação de estorno foi concluída: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor)
    _send(cfg, email_franquia, f"Solicitação de estorno concluída: {numero_pedido}", corpo)


async def notificar_novo_pedido_cancelamento(numero_pedido: str, vendedor: str, franquia_nome: str):
    cfg = await _get_configs()
    destinatario = cfg.get("email_comercial", "")
    if not destinatario:
        return
    corpo = _render(cfg.get("tpl_novo_pedido_cancelamento", "Novo cancelamento de venda solicitado: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor, franquia_nome=franquia_nome)
    _send(cfg, destinatario, f"Novo cancelamento de venda para análise: {numero_pedido}", corpo)


async def notificar_triagem_cancelamento(numero_pedido: str, vendedor: str, franquia_nome: str, email_destino: str):
    cfg = await _get_configs()
    if not email_destino:
        return
    corpo = _render(cfg.get("tpl_triagem_cancelamento", "Cancelamento de venda para análise: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor, franquia_nome=franquia_nome)
    _send(cfg, email_destino, f"Cancelamento de venda para análise: {numero_pedido}", corpo)


async def notificar_concluido_cancelamento(numero_pedido: str, vendedor: str, email_franquia: str):
    cfg = await _get_configs()
    if not email_franquia:
        return
    corpo = _render(cfg.get("tpl_concluido_cancelamento", "Seu cancelamento de venda foi concluído: {numero_pedido}"),
                    numero_pedido=numero_pedido, vendedor=vendedor)
    _send(cfg, email_franquia, f"Cancelamento de venda concluído: {numero_pedido}", corpo)


async def notificar_reset_senha(email_destino: str, nome: str, link: str):
    cfg = await _get_configs()
    if not email_destino:
        return
    tpl_default = (
        "Ola, {nome}! Voce solicitou a redefinicao de senha.\n\n"
        "Clique no link abaixo para criar uma nova senha (valido por 1 hora):\n{link}\n\n"
        "Se nao foi voce, ignore este e-mail."
    )
    corpo = _render(cfg.get("tpl_reset_senha", tpl_default), nome=nome, link=link)
    _send(cfg, email_destino, "Redefinicao de senha - Gestao de Vinculo", corpo)
