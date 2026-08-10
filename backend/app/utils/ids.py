import secrets
import string
from sqlalchemy.orm import Session


def generate_id(prefix: str, width: int = 8) -> str:
    alphabet = string.ascii_lowercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(width))
    return f"{prefix}_{suffix}"


def next_sequential_id(db: Session, model, prefix: str, pad: int = 2) -> str:
    """Generate sequential-ish IDs like sch_13 by scanning existing prefixed ids."""
    rows = db.query(model.id).all()
    max_n = 0
    for (row_id,) in rows:
        if not isinstance(row_id, str) or not row_id.startswith(f"{prefix}_"):
            continue
        suffix = row_id[len(prefix) + 1 :]
        if suffix.isdigit():
            max_n = max(max_n, int(suffix))
    return f"{prefix}_{str(max_n + 1).zfill(pad)}"


def generate_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))
