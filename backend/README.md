# PetroPulse AI Backend

A production-ready FastAPI backend for oil and gas asset intelligence, featuring ML-powered forecasting, anomaly detection, and real-time simulation capabilities.

## Technology Stack

- **Python 3.11+**
- **FastAPI** - Modern, fast web framework for building APIs
- **Pydantic v2** - Data validation using Python type annotations
- **SQLAlchemy 2.x** - SQL toolkit and ORM
- **SQLite** - Database (PostgreSQL support available)
- **Alembic** - Database migration tool
- **Redis** - Caching and message broker (optional)
- **Celery** - Distributed task queue (optional)
- **NumPy/Pandas** - Data manipulation
- **scikit-learn** - Machine learning library
- **XGBoost** - Gradient boosting framework
- **PyTorch** - Deep learning framework
- **SHAP** - Model interpretability
- **Uvicorn** - ASGI server

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # Application entry point
│   ├── config.py               # Configuration settings
│   ├── middleware.py           # Custom middleware
│   │
│   ├── api/v1/                 # API endpoints
│   │   ├── assets.py          # Asset management
│   │   ├── forecast.py        # Production forecasting
│   │   ├── anomaly.py         # Anomaly detection
│   │   ├── aips.py            # Asset Intelligence Priority System
│   │   ├── shap.py            # SHAP explanations
│   │   ├── metrics.py         # Performance metrics
│   │   ├── simulation.py      # Simulation management
│   │   ├── health.py          # Health checks
│   │   └── websocket.py       # WebSocket endpoints
│   │
│   ├── models/                 # Data models
│   │   ├── database.py        # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   └── enums.py           # Enumerations
│   │
│   ├── services/               # Business logic layer
│   │   ├── asset_service.py
│   │   ├── forecast_service.py
│   │   ├── anomaly_service.py
│   │   ├── aips_service.py
│   │   ├── shap_service.py
│   │   ├── simulation_service.py
│   │   └── data_service.py
│   │
│   ├── ml/                     # Machine learning models
│   │   ├── arps_model.py      # Arps decline curve
│   │   ├── forecast_model.py  # Forecasting model
│   │   ├── anomaly_model.py   # Anomaly detection
│   │   ├── shap_explainer.py  # SHAP explanations
│   │   ├── model_manager.py   # Model lifecycle
│   │   └── performance_metrics.py
│   │
│   ├── ml_tasks/              # ML task orchestration
│   │   ├── training.py
│   │   ├── inference.py
│   │   └── evaluation.py
│   │
│   ├── data/                  # Data layer
│   │   ├── data_loader.py
│   │   ├── preprocessor.py
│   │   └── sample_assets.py
│   │
│   └── utils/                 # Utilities
│       ├── logger.py
│       ├── cache.py
│       ├── validators.py
│       └── converters.py
│
├── tests/                     # Test suite
├── migrations/                # Database migrations
├── requirements.txt           # Production dependencies
├── requirements-dev.txt       # Development dependencies
├── .env.example              # Environment variables template
├── Dockerfile                # Docker configuration
├── docker-compose.yml        # Docker Compose configuration
└── README.md                # This file
```

## Features

### Core Capabilities

- **Asset Management**: CRUD operations for oil and gas assets
- **Production Forecasting**: ML-powered production forecasting with confidence intervals
- **Anomaly Detection**: Real-time anomaly detection using Isolation Forest
- **AIPS Scoring**: Asset Intelligence Priority System for asset prioritization
- **SHAP Explanations**: Model interpretability using SHAP values
- **Performance Metrics**: Comprehensive asset and portfolio metrics
- **Simulation**: Real-time production simulation scenarios
- **WebSocket Support**: Real-time updates for simulation sessions

### ML Models

- **Arps Decline Curve**: Hyperbolic decline curve modeling
- **Gradient Boosting**: Ensemble forecasting with lag features
- **Isolation Forest**: Unsupervised anomaly detection
- **SHAP**: Model explainability and feature importance

## Installation

### Prerequisites

- Python 3.11 or higher
- pip package manager
- (Optional) Docker and Docker Compose
- (Optional) Redis server

### Local Setup

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # For development
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   # The database will be auto-initialized on first run
   # Or manually:
   python -c "from app.core.database import init_db; init_db()"
   ```

### Docker Setup

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **The application will be available at**
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Redis: localhost:6379

## Configuration

Key environment variables (see `.env.example`):

- `DATABASE_URL`: Database connection string (default: SQLite)
- `REDIS_URL`: Redis connection string (optional)
- `CELERY_BROKER_URL`: Celery broker URL (optional)
- `SEED_ON_STARTUP`: Auto-seed database with sample data (default: True)
- `API_V1_PREFIX`: API version prefix (default: /api/v1)
- `CORS_ORIGINS`: Allowed CORS origins

## Running the Application

### Development Server

```bash
# Direct run
python -m app.main

# Or with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker

```bash
docker-compose up -d
```

## API Endpoints

### Health Check
- `GET /api/v1/health` - Health check with database and Redis status

### Assets
- `GET /api/v1/assets` - List all assets
- `GET /api/v1/assets/{asset_id}` - Get asset details
- `POST /api/v1/assets` - Create new asset
- `PUT /api/v1/assets/{asset_id}` - Update asset
- `DELETE /api/v1/assets/{asset_id}` - Delete asset

### Forecasting
- `POST /api/v1/forecast` - Generate production forecast
- `GET /api/v1/forecast/{asset_id}/history` - Get forecast history

### Anomaly Detection
- `POST /api/v1/anomaly/detect` - Detect anomalies
- `GET /api/v1/anomaly/asset/{asset_id}` - Get asset anomalies
- `PATCH /api/v1/anomaly/{anomaly_id}/acknowledge` - Acknowledge anomaly

### AIPS Scoring
- `POST /api/v1/aips/score` - Calculate AIPS score
- `GET /api/v1/aips/asset/{asset_id}/history` - Get AIPS history

### SHAP Explanations
- `POST /api/v1/shap/explain` - Generate SHAP explanation

### Metrics
- `POST /api/v1/metrics/asset` - Get asset metrics
- `GET /api/v1/metrics/portfolio` - Get portfolio metrics

### Simulation
- `POST /api/v1/simulation/start` - Start simulation
- `PATCH /api/v1/simulation/{session_id}` - Update simulation
- `DELETE /api/v1/simulation/{session_id}` - Stop simulation
- `GET /api/v1/simulation/{session_id}` - Get simulation details
- `GET /api/v1/simulation/scenarios` - List available scenarios

### WebSocket
- `WS /ws/simulation/{session_id}` - Real-time simulation updates

## Database Migrations

### Create Migration
```bash
alembic revision --autogenerate -m "description"
```

### Apply Migration
```bash
alembic upgrade head
```

### Rollback Migration
```bash
alembic downgrade -1
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api.py
```

## Development

### Code Style
```bash
# Format code
black app/

# Lint code
ruff check app/

# Type checking
mypy app/
```

### Adding New Features

1. **Add models** in `app/models/database.py`
2. **Add schemas** in `app/models/schemas.py`
3. **Add services** in `app/services/`
4. **Add API endpoints** in `app/api/v1/`
5. **Add tests** in `tests/`

## Architecture Principles

- **Clean Architecture**: Separation of concerns with distinct layers
- **Service Layer**: Business logic isolated from API routes
- **Dependency Injection**: FastAPI dependency system for database sessions
- **Async Support**: Asynchronous operations where beneficial
- **Type Safety**: Full type hints with Pydantic validation
- **Error Handling**: Centralized exception handling
- **Logging**: Structured logging with log levels
- **Testing**: Independent, testable services

## ML Pipeline

1. **Data Loading**: Load production data from database
2. **Preprocessing**: Clean and transform data
3. **Feature Engineering**: Create lag features and derived metrics
4. **Model Training**: Train models on historical data
5. **Inference**: Generate predictions and anomaly scores
6. **Evaluation**: Calculate performance metrics
7. **Explainability**: Generate SHAP explanations

## Monitoring

- Health checks at `/api/v1/health`
- Structured logging to `logs/petropulse.log`
- Redis monitoring (if configured)
- Database connection status in health endpoint

## Troubleshooting

### Database Issues
- Check `DATABASE_URL` in `.env`
- Ensure database directory is writable
- Verify SQLite file permissions

### Redis Issues
- Redis is optional; application works without it
- Check `REDIS_URL` configuration
- Verify Redis server is running

### ML Model Issues
- Ensure sufficient historical data (min 8 months)
- Check model training logs
- Verify feature engineering pipeline

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team.
