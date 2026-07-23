"""
Serviço de email via SMTP (Google Gmail).
Configure as variáveis de ambiente SMTP_* para ativar o envio.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send(to: str | list[str], subject: str, html: str) -> bool:
    """Envia email. Retorna True se OK, False se SMTP não configurado ou falhou."""
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(f"[EMAIL SIMULADO] Para: {to} | Assunto: {subject}")
        return False

    recipients = [to] if isinstance(to, str) else to
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, recipients, msg.as_string())
        logger.info(f"[EMAIL ENVIADO] Para: {to} | Assunto: {subject}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL ERRO] {e}")
        return False


# ── Templates de email ─────────────────────────────────────────────────────

def _base_html(titulo: str, corpo: str) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#1e293b;padding:16px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;font-size:16px;margin:0">Gestão de Vínculos — SenseBike</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="color:#1e293b;font-size:18px">{titulo}</h2>
        {corpo}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#94a3b8;font-size:12px">Este é um email automático. Não responda.</p>
      </div>
    </div>
    """


def email_novo_pedido(para_comercial: str, numero_pedido: str, franquia_nome: str):
    """Novo pedido criado pela franquia → notifica comercial."""
    corpo = f"""
    <p style="color:#475569">A franquia <strong>{franquia_nome}</strong> abriu um novo pedido de vínculo.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#1e293b"><strong>Pedido:</strong> {numero_pedido}</p>
    </div>
    <p style="color:#475569">Acesse o dashboard Comercial para revisar e aprovar ou reprovar.</p>
    """
    _send(para_comercial, f"[SenseBike] Novo pedido de vínculo — {numero_pedido}", _base_html("Novo Pedido para Revisão", corpo))


def email_aprovado_financeiro(para_financeiro: str, numero_pedido: str):
    """Comercial aprovou e enviou para financeiro."""
    corpo = f"""
    <p style="color:#475569">O pedido <strong>{numero_pedido}</strong> foi aprovado pelo Comercial e aguarda validação financeira.</p>
    <p style="color:#475569">Acesse o dashboard Financeiro para revisar.</p>
    """
    _send(para_financeiro, f"[SenseBike] Pedido {numero_pedido} aguarda validação financeira", _base_html("Nova Tarefa — Financeiro", corpo))


def email_aprovado_ti(para_ti: str, numero_pedido: str):
    """Enviado para TI executar."""
    corpo = f"""
    <p style="color:#475569">O pedido <strong>{numero_pedido}</strong> foi aprovado e aguarda execução de TI.</p>
    <p style="color:#475569">Acesse o dashboard TI para executar.</p>
    """
    _send(para_ti, f"[SenseBike] Pedido {numero_pedido} aguarda execução TI", _base_html("Nova Tarefa — TI", corpo))


def email_vinculado(para_franquia: str, numero_pedido: str, nome_cliente: str):
    """Pedido finalizado — notifica franquia."""
    corpo = f"""
    <p style="color:#475569">O pedido de vínculo do cliente <strong>{nome_cliente}</strong> foi concluído com sucesso!</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#15803d"><strong>✓ Pedido:</strong> {numero_pedido} — <strong>Vinculado</strong></p>
    </div>
    """
    _send(para_franquia, f"[SenseBike] Pedido {numero_pedido} vinculado com sucesso!", _base_html("Vínculo Concluído", corpo))


def email_reprovado(para: str | list[str], numero_pedido: str, justificativa: str, origem: str):
    """Pedido reprovado — notifica destino com justificativa."""
    corpo = f"""
    <p style="color:#475569">O pedido <strong>{numero_pedido}</strong> foi reprovado por <strong>{origem}</strong>.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#991b1b"><strong>Motivo:</strong> {justificativa}</p>
    </div>
    <p style="color:#475569">Acesse o sistema para revisar e reenviar o pedido.</p>
    """
    _send(para, f"[SenseBike] Pedido {numero_pedido} reprovado", _base_html("Pedido Reprovado", corpo))
