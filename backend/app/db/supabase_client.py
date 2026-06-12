"""
Supabase client — initialized from env settings.
Uses the service-role key for server-side operations.
"""
from supabase import create_client, Client
from app.core.config import get_settings
from functools import lru_cache


@lru_cache()
def get_supabase() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)


@lru_cache()
def get_supabase_anon() -> Client:
    """Anon client for auth operations."""
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_anon_key)
