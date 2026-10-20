import hashlib
import hmac


def officer_fingerprint(secret, officer_id):
    if not secret:
        raise ValueError('SECRET_KEY is required for officer identity storage')
    if not isinstance(officer_id,str):
        raise ValueError('Officer ID is required for approval')
    normalized = ' '.join(officer_id.strip().upper().split())
    if len(normalized) < 3 or len(normalized) > 100:
        raise ValueError('Officer ID must contain 3–100 characters')
    return hmac.new(secret.encode(), ('titlelock:officer-id:' + normalized).encode(), hashlib.sha256).hexdigest()


def officer_suffix(officer_id):
    normalized = ' '.join(officer_id.strip().upper().split())
    return normalized[-4:] if len(normalized) >= 8 else None
