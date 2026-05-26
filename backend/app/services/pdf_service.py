from fpdf import FPDF
from datetime import datetime


ITEM_TYPE_LABELS = {
    "mano_obra": "Mano de obra",
    "repuesto": "Repuesto",
    "servicio": "Servicio",
    "otro": "Otro",
}

STATUS_LABELS = {
    "borrador": "BORRADOR",
    "enviada": "ENVIADA",
    "aprobada": "APROBADA",
    "rechazada": "RECHAZADA",
}


class PostVentaPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.set_fill_color(37, 99, 235)
        self.set_text_color(255, 255, 255)
        self.cell(0, 12, "POST VENTA — Sistema de Gestión", fill=True, ln=True, align="C")
        self.set_text_color(0, 0, 0)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Pág. {self.page_no()} — Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", align="C")


def _section_title(pdf: PostVentaPDF, title: str):
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(239, 246, 255)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 8, f"  {title}", fill=True, ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(2)


def _field_row(pdf: PostVentaPDF, label: str, value: str, w1: int = 50, w2: int = 0):
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(w1, 6, f"{label}:", ln=False)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(w2 or (190 - w1), 6, str(value or "—"), ln=True)


def generate_quote_pdf(quote) -> bytes:
    pdf = PostVentaPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # ── Header del presupuesto ──────────────────────────────────────
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 10, f"PRESUPUESTO {quote.quote_number}", ln=True, align="C")

    status_label = STATUS_LABELS.get(quote.status, quote.status.upper())
    colors = {
        "BORRADOR": (156, 163, 175),
        "ENVIADA": (234, 179, 8),
        "APROBADA": (34, 197, 94),
        "RECHAZADA": (239, 68, 68),
    }
    r, g, b = colors.get(status_label, (156, 163, 175))
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(r, g, b)
    pdf.cell(0, 7, status_label, ln=True, align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    # ── Info general ──────────────────────────────────────────────
    _section_title(pdf, "Información General")
    ot = quote.work_order
    client = ot.client
    _field_row(pdf, "Título", quote.title)
    _field_row(pdf, "Orden de Trabajo", ot.ot_number)
    _field_row(pdf, "Cliente", client.name)
    if client.company:
        _field_row(pdf, "Empresa", client.company)
    _field_row(pdf, "Equipo", f"{ot.equipment_type} {ot.brand or ''} {ot.model or ''}".strip())
    _field_row(pdf, "Fecha emisión", quote.created_at.strftime("%d/%m/%Y"))
    if quote.valid_until:
        _field_row(pdf, "Válido hasta", quote.valid_until.strftime("%d/%m/%Y"))
    pdf.ln(4)

    # ── Ítems ─────────────────────────────────────────────────────
    _section_title(pdf, "Detalle de Ítems")

    # Tabla header
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(229, 231, 235)
    col_w = [90, 25, 25, 25, 25]
    headers = ["Descripción", "Tipo", "Cant.", "P. Unit.", "Subtotal"]
    for i, h in enumerate(headers):
        align = "L" if i == 0 else "R"
        pdf.cell(col_w[i], 7, h, border=1, fill=True, align=align)
    pdf.ln()

    total = 0.0
    pdf.set_font("Helvetica", "", 9)
    fill = False
    for item in quote.items:
        subtotal = item.quantity * item.unit_price
        total += subtotal
        pdf.set_fill_color(249, 250, 251) if fill else pdf.set_fill_color(255, 255, 255)
        vals = [
            item.description,
            ITEM_TYPE_LABELS.get(item.item_type, item.item_type),
            f"{item.quantity:g}",
            f"${item.unit_price:,.2f}",
            f"${subtotal:,.2f}",
        ]
        for i, v in enumerate(vals):
            align = "L" if i == 0 else "R"
            pdf.cell(col_w[i], 7, v, border=1, fill=True, align=align)
        pdf.ln()
        fill = not fill

    # Total row
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(37, 99, 235)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(sum(col_w[:4]), 8, "TOTAL", border=1, fill=True, align="R")
    pdf.cell(col_w[4], 8, f"${total:,.2f}", border=1, fill=True, align="R")
    pdf.ln()
    pdf.set_text_color(0, 0, 0)
    pdf.ln(6)

    # ── Notas ────────────────────────────────────────────────────
    if quote.notes:
        _section_title(pdf, "Notas y Condiciones")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 5, quote.notes)
        pdf.ln(4)

    return bytes(pdf.output())


def generate_invoice_pdf(invoice) -> bytes:
    STATUS_COLORS_INV = {
        "borrador": (156, 163, 175), "emitida": (234, 179, 8),
        "pagada": (34, 197, 94), "vencida": (239, 68, 68), "anulada": (107, 114, 128),
    }
    STATUS_LABELS_INV = {
        "borrador": "BORRADOR", "emitida": "EMITIDA",
        "pagada": "PAGADA", "vencida": "VENCIDA", "anulada": "ANULADA",
    }
    PM_LABELS = {
        "efectivo": "Efectivo", "transferencia": "Transferencia bancaria",
        "cheque": "Cheque", "tarjeta": "Tarjeta", "otro": "Otro",
    }

    pdf = PostVentaPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 10, f"FACTURA {invoice.invoice_number}", ln=True, align="C")

    r, g, b = STATUS_COLORS_INV.get(invoice.status, (156, 163, 175))
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(r, g, b)
    pdf.cell(0, 7, STATUS_LABELS_INV.get(invoice.status, invoice.status.upper()), ln=True, align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    _section_title(pdf, "Datos de la Factura")
    _field_row(pdf, "N° Factura", invoice.invoice_number)
    _field_row(pdf, "Cliente", invoice.client.name)
    if invoice.client.company:
        _field_row(pdf, "Empresa", invoice.client.company)
    if invoice.work_order:
        _field_row(pdf, "Orden de Trabajo", invoice.work_order.ot_number)
    _field_row(pdf, "Fecha emisión", invoice.issue_date.strftime("%d/%m/%Y"))
    if invoice.due_date:
        _field_row(pdf, "Vencimiento", invoice.due_date.strftime("%d/%m/%Y"))
    if invoice.payment_date:
        _field_row(pdf, "Fecha de pago", invoice.payment_date.strftime("%d/%m/%Y"))
    if invoice.payment_method:
        _field_row(pdf, "Forma de pago", PM_LABELS.get(invoice.payment_method, invoice.payment_method))
    pdf.ln(4)

    _section_title(pdf, "Detalle")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(229, 231, 235)
    col_w = [110, 25, 27, 28]
    for i, h in enumerate(["Descripción", "Cant.", "P. Unit.", "Subtotal"]):
        pdf.cell(col_w[i], 7, h, border=1, fill=True, align="L" if i == 0 else "R")
    pdf.ln()

    total = 0.0
    pdf.set_font("Helvetica", "", 9)
    fill = False
    for item in invoice.items:
        subtotal = item.quantity * item.unit_price
        total += subtotal
        pdf.set_fill_color(249, 250, 251) if fill else pdf.set_fill_color(255, 255, 255)
        vals = [item.description, f"{item.quantity:g}", f"${item.unit_price:,.2f}", f"${subtotal:,.2f}"]
        for i, v in enumerate(vals):
            pdf.cell(col_w[i], 7, v, border=1, fill=True, align="L" if i == 0 else "R")
        pdf.ln()
        fill = not fill

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(37, 99, 235)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(sum(col_w[:3]), 8, "TOTAL", border=1, fill=True, align="R")
    pdf.cell(col_w[3], 8, f"${total:,.2f}", border=1, fill=True, align="R")
    pdf.ln()
    pdf.set_text_color(0, 0, 0)
    pdf.ln(6)

    if invoice.notes:
        _section_title(pdf, "Notas")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 5, invoice.notes)

    return bytes(pdf.output())


def generate_report_pdf(ot, report_text: str) -> bytes:
    pdf = PostVentaPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 10, "INFORME TÉCNICO", ln=True, align="C")
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, ot.ot_number, ln=True, align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    _section_title(pdf, "Datos del Equipo")
    _field_row(pdf, "Cliente", ot.client.name)
    _field_row(pdf, "Tipo de equipo", ot.equipment_type)
    _field_row(pdf, "Marca / Modelo", f"{ot.brand or ''} {ot.model or ''}".strip() or "—")
    _field_row(pdf, "N° de serie", ot.serial_number or "—")
    _field_row(pdf, "Fecha recepción", ot.received_at.strftime("%d/%m/%Y"))
    pdf.ln(4)

    _section_title(pdf, "Problema Reportado")
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5, ot.reported_problem or "—")
    pdf.ln(4)

    _section_title(pdf, "Informe Técnico")
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5, report_text)
    pdf.ln(8)

    # Firma
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(80, 5, "_" * 30, ln=False, align="C")
    pdf.cell(30, 5, "", ln=False)
    pdf.cell(80, 5, "_" * 30, ln=True, align="C")
    pdf.cell(80, 5, "Técnico responsable", ln=False, align="C")
    pdf.cell(30, 5, "", ln=False)
    pdf.cell(80, 5, "Recibido conforme", ln=True, align="C")

    return bytes(pdf.output())
