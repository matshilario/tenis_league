"""Normalização de números de WhatsApp (foco no Brasil)."""

import re


class PhoneError(ValueError):
    pass


def normalize_phone(raw: str | None) -> str | None:
    """'(92) 99999-9999' -> '5592999999999'. Vazio -> None. Inválido -> PhoneError."""
    if raw is None or not raw.strip():
        return None
    raw = raw.strip()
    has_country = raw.startswith("+") or raw.startswith("00")
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("00"):
        digits = digits[2:]
    if not has_country and len(digits) in (10, 11):  # DDD + número, sem país
        digits = "55" + digits
    if digits.startswith("55"):
        ok = len(digits) in (12, 13)
    else:
        ok = 10 <= len(digits) <= 15  # internacional com código do país
    if not ok:
        raise PhoneError("WhatsApp inválido. Use DDD + número, ex.: (92) 99999-9999.")
    return digits
