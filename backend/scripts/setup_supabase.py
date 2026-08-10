"""One-off connectivity check / clear for Supabase. Run: python -m scripts.setup_supabase"""

from __future__ import annotations

import socket
from urllib.parse import unquote, urlparse

import psycopg2
from sqlalchemy.engine import make_url

from app.config import get_settings


def load_creds():
    get_settings.cache_clear()
    from app.config import get_settings as gs

    settings = gs()
    url = make_url(settings.database_url)
    return {
        "user": url.username,
        "password": unquote(url.password or ""),
        "dbname": url.database or "postgres",
        "host": url.host,
        "port": url.port or 5432,
    }


def try_connect(label: str, **kwargs):
    print(f"TRY {label} host={kwargs.get('host')}")
    try:
        conn = psycopg2.connect(sslmode="require", connect_timeout=20, **kwargs)
        cur = conn.cursor()
        cur.execute("select current_database(), current_user")
        print(f"OK  {label}", cur.fetchone())
        conn.close()
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL {label}: {type(exc).__name__}: {exc}")
        return False


def main() -> None:
    creds = load_creds()
    host = creds["host"]
    print("configured host:", host)

    # DNS via system
    try:
        infos = socket.getaddrinfo(host, 5432, proto=socket.IPPROTO_TCP)
        print("getaddrinfo:", infos)
    except OSError as exc:
        print("getaddrinfo failed:", exc)
        infos = []

    ipv6 = None
    ipv4 = None
    for fam, _, _, _, sockaddr in infos:
        if fam == socket.AF_INET6 and not ipv6:
            ipv6 = sockaddr[0]
        if fam == socket.AF_INET and not ipv4:
            ipv4 = sockaddr[0]

    # Known AAAA from Windows DNS for this project (fallback)
    if not ipv6:
        ipv6 = "2406:da18:1691:a200::a804"

    base = {
        "user": creds["user"],
        "password": creds["password"],
        "dbname": creds["dbname"],
        "port": creds["port"],
    }

    if ipv6 and try_connect("ipv6-literal", host=ipv6, **base):
        return
    if ipv4 and try_connect("ipv4-literal", host=ipv4, **base):
        return
    if try_connect("hostname", host=host, **base):
        return

    # Supabase IPv4 pooler (session mode :5432). Try common AP regions.
    project = "rvjdrdbibundebrggsjw"
    pool_user = f"postgres.{project}"
    for region in (
        "ap-southeast-1",
        "ap-south-1",
        "ap-southeast-2",
        "ap-northeast-1",
        "eu-west-1",
        "eu-central-1",
        "us-east-1",
        "us-west-1",
    ):
        pool_host = f"aws-0-{region}.pooler.supabase.com"
        if try_connect(
            f"pooler-{region}",
            host=pool_host,
            user=pool_user,
            password=creds["password"],
            dbname=creds["dbname"],
            port=5432,
        ):
            print("USE_POOLER_URL:")
            print(
                f"postgresql+psycopg2://{pool_user}:PASSWORD@{pool_host}:5432/postgres?sslmode=require"
            )
            return
        # transaction pooler port
        if try_connect(
            f"pooler6543-{region}",
            host=pool_host,
            user=pool_user,
            password=creds["password"],
            dbname=creds["dbname"],
            port=6543,
        ):
            print("USE_POOLER_URL:")
            print(
                f"postgresql+psycopg2://{pool_user}:PASSWORD@{pool_host}:6543/postgres?sslmode=require"
            )
            return

    print("ALL_CONNECTION_ATTEMPTS_FAILED")


if __name__ == "__main__":
    main()
