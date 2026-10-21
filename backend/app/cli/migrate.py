"""Run database migrations directly from CLI."""
from __future__ import annotations

import argparse
import sys
from ..config import get_settings
from ..migrations import run_migrations


def main() -> None:
    parser = argparse.ArgumentParser(description="Run TitleLock PostgreSQL migrations.")
    parser.add_argument("--url", help="Database connection URL (defaults to DATABASE_URL in environment)")
    args = parser.parse_args()

    url = args.url or get_settings().database_url
    if not url:
        print("Error: No database URL provided or configured in DATABASE_URL.", file=sys.stderr)
        sys.exit(1)

    print("Running database migrations...")
    run_migrations(url)
    print("Done!")


if __name__ == "__main__":
    main()
