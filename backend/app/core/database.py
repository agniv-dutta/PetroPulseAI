"""Database engine + session management.

The application is built on the *synchronous* SQLAlchemy 2.0 stack
(``SessionLocal`` / ``get_db``) which powers every router, the intelligence
pipeline and the simulation service. An async engine/session pair is provided
for future use when the database URL points at PostgreSQL; with the default
SQLite URL only the sync stack is created.
"""

from collections.abc import AsyncGenerator, Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _sqlite_connect_args(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def _pool_args(url: str) -> dict:
    if url.startswith("sqlite"):
        # SQLite (file or memory) does not benefit from a sized pool here and
        # :memory: requires StaticPool so all sessions share one connection.
        if ":memory:" in url:
            from sqlalchemy.pool import StaticPool

            return {"poolclass": StaticPool}
        return {}
    return {"pool_size": 10, "max_overflow": 20, "pool_pre_ping": True}


engine = create_engine(
    settings.database_url,
    connect_args=_sqlite_connect_args(settings.database_url),
    **_pool_args(settings.database_url),
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped synchronous session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables (idempotent). Models must be imported first."""
    if settings.database_url.startswith("sqlite"):
        db_path = settings.database_url.split("///")[-1]
        if db_path and db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    # Import for metadata registration side-effects.
    from app.models import Base as _registered_base  # noqa: F401

    Base.metadata.create_all(bind=engine)


def close_db() -> None:
    engine.dispose()


# ---------------------------------------------------------------------------
# Optional async stack (only materialised for PostgreSQL URLs)
# ---------------------------------------------------------------------------
if settings.database_url.startswith("postgresql+asyncpg"):
    async_engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
        async with async_session_maker() as session:
            try:
                yield session
            finally:
                await session.close()

    async def init_db_async() -> None:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close_db_async() -> None:
        await async_engine.dispose()
else:  # pragma: no cover - async stack unused under sqlite
    async_engine = None
    async_session_maker = None

    async def get_async_session():  # type: ignore[misc]
        raise RuntimeError("async sessions require a postgresql+asyncpg DATABASE_URL")

    async def init_db_async():  # type: ignore[misc]
        raise RuntimeError("async init requires a postgresql+asyncpg DATABASE_URL")

    async def close_db_async():  # type: ignore[misc]
        return None
