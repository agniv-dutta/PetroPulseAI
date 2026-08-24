"""Redis cache management for PetroPulse AI (optional dependency)."""

from typing import Any, Optional

try:
    import redis
except ImportError:  # redis is optional; cache degrades to no-op
    redis = None

from app.core.config import settings
from app.utils.logger import logger

redis_client: Optional["redis.Redis"] = None


def init_redis() -> Optional["redis.Redis"]:
    """Initialize Redis client if configured."""
    global redis_client

    if redis is None or not settings.redis_url:
        logger.info("Redis not configured, caching disabled")
        return None
    
    try:
        redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        redis_client.ping()
        logger.info("Redis connection established")
        return redis_client
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return None


def get_redis() -> Optional[redis.Redis]:
    """Get Redis client instance."""
    if redis_client is None:
        return init_redis()
    return redis_client


def cache_get(key: str) -> Optional[str]:
    """Get value from cache."""
    client = get_redis()
    if client is None:
        return None
    try:
        return client.get(key)
    except Exception as e:
        logger.error(f"Cache get error for key {key}: {e}")
        return None


def cache_set(key: str, value: str, ttl: int = 3600) -> bool:
    """Set value in cache with TTL."""
    client = get_redis()
    if client is None:
        return False
    try:
        return client.setex(key, ttl, value)
    except Exception as e:
        logger.error(f"Cache set error for key {key}: {e}")
        return False


def cache_delete(key: str) -> bool:
    """Delete value from cache."""
    client = get_redis()
    if client is None:
        return False
    try:
        return client.delete(key) > 0
    except Exception as e:
        logger.error(f"Cache delete error for key {key}: {e}")
        return False


def cache_exists(key: str) -> bool:
    """Check if key exists in cache."""
    client = get_redis()
    if client is None:
        return False
    try:
        return client.exists(key) > 0
    except Exception as e:
        logger.error(f"Cache exists error for key {key}: {e}")
        return False
