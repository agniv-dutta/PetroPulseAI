"""Seed the PetroPulse AI database with a small demo portfolio.

All seeded content is SYNTHETIC: deterministic Arps-seeded reconstructions for
demonstration. This script never claims the data is real operator telemetry
(e.g. ONGC SCADA); see the data_sources catalogue it installs for how REAL
public datasets are classified.

Usage:
    python scripts/seed_demo.py [--force] [--months 36] [--no-derive]
"""

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DISCLAIMER = (
    "NOTICE: All seeded assets, history and metrics are SYNTHETIC demonstration "
    "data generated deterministically by PetroPulse. They do NOT represent real "
    "operator telemetry (including ONGC or any other producer)."
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Wipe existing rows before seeding")
    parser.add_argument("--months", type=int, default=None, help="History length in months")
    parser.add_argument(
        "--no-derive",
        action="store_true",
        help="Skip derived model outputs (forecasts/anomalies/AIPS) generation",
    )
    args = parser.parse_args()

    from app.core.config import settings
    from app.core.database import SessionLocal
    from app.ingestion.seed import seed_database

    if args.months is not None:
        settings.seed_history_months = max(args.months, 12)

    db = SessionLocal()
    try:
        result = seed_database(db, force=args.force)
        if not result.get("seeded"):
            print(f"[seed_demo] skipped: {result.get('reason')}")
            print("[seed_demo] re-run with --force to rebuild the demo dataset.")
            return 0

        print("[seed_demo] seeded SYNTHETIC demo dataset:")
        for key, value in result.items():
            if key != "seeded":
                print(f"  {key:16s}: {value}")

        if not args.no_derive:
            from app.intelligence.pipeline import get_portfolio_analysis

            ranked = get_portfolio_analysis(db)
            print(f"[seed_demo] derived outputs persisted for {len(ranked)} assets "
                  f"(forecast / anomaly / aips_scores / model_metrics).")
    finally:
        db.close()

    print(DISCLAIMER)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
