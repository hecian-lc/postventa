import qrcode
from pathlib import Path
from ..config import settings

QR_DIR = Path(__file__).parent.parent.parent / "static" / "qr"
QR_DIR.mkdir(parents=True, exist_ok=True)


def generate_qr(ot_id: int, ot_number: str) -> str:
    url = f"{settings.frontend_url}/ots/{ot_id}"
    img = qrcode.make(url)
    filename = f"{ot_number}.png"
    path = QR_DIR / filename
    img.save(str(path))
    return f"/static/qr/{filename}"
