# PetroPulse AI

**Integrated Hydrocarbon Production Forecasting and Asset Prioritization Engine**

A decision-support platform for Indian petroleum operations that combines 
machine learning forecasting, real-time anomaly detection, and explainable 
AI to prioritize production-enhancing interventions.

## Features

- **Dynamic Production Forecasting** (XGBoost + LSTM)
- **Intelligent Decline Analysis** (Automated curve fitting)
- **Unsupervised Anomaly Detection** (Isolation Forest)
- **Explainable Attribution** (SHAP values)
- **Asset Intervention Priority Scoring** (AIPS algorithm)
- **Real-Time Simulation Engine** (Synthetic data streaming)

## Architecture
Historical Data (OGD, PPAC, DGH) ↓ Ingestion Layer (Python ETL) ↓ Data Lake (PostgreSQL + TimescaleDB) ↓ Modeling Engine (XGBoost, LSTM, Isolation Forest, SHAP) ↓ Decision Layer (AIPS Scoring) ↓ Frontend (React Dashboard) ↓ Real-Time Simulation

## Tech Stack

- **Backend**: Python 3.10+, FastAPI
- **ML**: scikit-learn, XGBoost, PyTorch, SHAP
- **Database**: PostgreSQL + TimescaleDB
- **Frontend**: React.js, Plotly.js, Tailwind CSS
- **Deployment**: Docker, Vercel

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.10+
- PostgreSQL 13+

### Installation

```bash
# Clone repo
git clone https://github.com/[team]/petropulse-ai.git

# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## Demo Flow

1. **Command Center**: View portfolio health &amp; active anomalies
2. **Asset Leaderboard**: Sort by AIPS priority score
3. **Production Forecast**: View historical, expected, and forecasted production
4. **Anomaly Detection**: See detected deviations with severity
5. **SHAP Attribution**: Understand why production deviated
6. **Decision Panel**: Get ranked prioritization recommendations
7. **Real-Time Simulation**: Inject scenarios and watch system respond live

## Data Sources

- **OGD** (data.gov.in): National production statistics
- **PPAC** (ppac.gov.in): Monthly production reports
- **DGH** (dghindia.gov.in): Hydrocarbon activity reports
- **Synthetic**: Simulator for real-time demonstration

## Disclaimer

This prototype uses publicly available data and synthetic simulations. 
Authorized ONGC SCADA feeds integration available upon approval.

## Team

[SIH 2026 Cohort]

## License

[MIT / Apache 2.0]
