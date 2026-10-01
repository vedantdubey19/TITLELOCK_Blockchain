"""Users, login, mandatory TOTP 2FA, step-up 2FA, sessions and role checks.

Owner: Vedant. Exposes FastAPI dependencies (current user, require_role,
require_step_up) that other features use to protect their routes.
"""
