# **PetroPulse AI: Integrated Hydrocarbon Production Forecasting and Asset Prioritization Engine**

# **1\. Problem Statement**

Hydrocarbon production in mature Indian oilfields faces significant challenges due to natural decline and operational inefficiencies. Current monitoring strategies often rely on retrospective, descriptive reporting rather than proactive predictive intelligence. The Ministry of Petroleum & Natural Gas and organizations like ONGC require a unified mechanism to address the following:

* **Production Decline Management:** Difficulty in distinguishing between natural reservoir decline and avoidable operational losses.  
* **Response Latency:** Delayed detection of production anomalies leads to significant cumulative volume losses.  
* **Prioritization Ambiguity:** With thousands of active assets, technical teams lack a data-driven framework to prioritize interventions based on "Recovery Potential" rather than just the magnitude of the drop.  
* **Analytical Fragmentation:** Existing systems operate in silos, separating forecasting from anomaly detection and root-cause analysis.

# **2\. Existing Challenge**

Traditional petroleum asset management relies on standard statistical control charts and fragmented dashboards. These methods are insufficient because:

* **Descriptive, Not Predictive:** Most systems tell "what happened" last month but fail to forecast "what will happen" or "what should happen" under normal conditions.  
* **Lack of Contextual Anomaly Detection:** Sudden drops are flagged, but gradual, subtle drifts caused by equipment fatigue or wellbore loading often go undetected for weeks.  
* **The "Insight Gap":** While a production drop is identified, its contribution analysis (attributing loss to specific features) remains a manual, expert-intensive task.  
* **Static Resource Allocation:** Operational resources are often deployed to the largest assets by volume, potentially ignoring smaller assets where an intervention could yield a 100% recovery rate.

# **3\. Proposed Solution**

**PetroPulse AI** is a software-only, decision-support platform designed to revolutionize hydrocarbon asset optimization.  
**Value Proposition:** Converting historical production trends and high-frequency simulated data into a prioritized intervention roadmap for field engineers.

# **4\. Key Features**

* **Dynamic Production Forecasting:** Accurate prediction of future asset yield using a combination of gradient-boosted trees and temporal neural networks.  
* **Intelligent Decline Analysis:** Automated calculation of decline curves to differentiate between expected and unexpected production trends.  
* **Unsupervised Anomaly Detection:** Real-time identification of production deviations using outlier detection models.  
* **Production Attribution (Explainable AI):** Utilizing SHAP to quantify the contribution of various parameters (pressure, temperature, flow-rates) to a production deviation.  
* **Asset Intervention Priority Score (AIPS):** A proprietary ranking algorithm that identifies assets with the highest potential for production recovery.  
* **Synthetic Stream Engine:** A sophisticated simulator for demonstrating real-time inference capabilities during the hackathon marathon.

# **5\. End-to-End Architecture**

The platform is designed with a modular, cloud-ready architecture capable of scaling from local prototype to enterprise production.

* **Ingestion Layer:** Python-based ETL pipelines to process CSV/NetCDF files from GOI platforms and generate synthetic streams.  
* **Data Lake:** PostgreSQL optimized for time-series data storage.  
* **Modeling Engine:**  
  * *Predictive:* XGBoost, LSTM.  
  * *Diagnostic:* Isolation Forest, Autoencoders.  
  * *Explanatory:* SHAP (SHapley Additive exPlanations).  
* **Decision Layer:** Custom AIPS scoring logic.  
* **Interface:** A React-based interactive dashboard with a FastAPI backend.

# **6\. AI/ML Methodology**

| Capability | Model Selection | Rationale |
| :---- | :---- | :---- |
| **Forecasting** | **XGBoost** (for tabular features), **LSTM** (for temporal patterns) | XGBoost handles non-linear relationships with high interpretability. LSTM captures long-term seasonal dependencies. |
| **Anomaly Detection** | **Isolation Forest** | Unsupervised approach ideal for high-dimensional petroleum data where labeled failure data is scarce. |
| **Attribution** | **SHAP** | Provides model-agnostic feature contribution analysis to explain *why* production deviated from the forecast. |
| **Evaluation** | **MAE / RMSE / F1** | Mean Absolute Error for forecasts; F1-score for anomaly detection performance. |

# **7\. Dataset & Data Pipeline Strategy**

This proposal avoids the use of proprietary ONGC data, relying instead on official public sources and statistically grounded simulation.

| Dataset Name | Source | Time Period | Module |
| :---- | :---- | :---- | :---- |
| **Crude Oil & Gas Production** | [OGD (data.gov.in)](https://data.gov.in) | 2018 \- 2024 | Historical Trends |
| **Monthly Production Reports** | [PPAC (ppac.gov.in)](https://ppac.gov.in) | 2020 \- 2024 | Forecast Training |
| **Hydrocarbon Activity Reports** | [DGH (dghindia.gov.in)](https://dghindia.gov.in) | Annual | Decline Analysis |
| **Synthetic Asset Stream** | **PetroPulse Simulator** | Real-time | SIH Demo Engine |

# **8\. Synthetic Real-Time Simulation**

To demonstrate real-time capabilities without authorized API access, we will use the **PetroPulse Simulator**:

1. **Distribution Fitting:** Learns mean, standard deviation, and seasonal trend components from real PPAC/OGD datasets.  
2. **Sequence Generation:** Generates high-frequency sequential observations (e.g., every 10 seconds for the demo).  
3. **Anomaly Injection:** Programmatic insertion of controlled events: "Sudden Valve Failure" (sudden drop), "Paraffin Buildup" (gradual decay), or "Restored Flow" (recovery).  
4. **Live Ingestion:** Data is pushed via WebSockets to the dashboard, triggering the inference engine.

# **9\. Asset Priority Score (AIPS)**

The system calculates a **Priority Score** ($P$) to guide operational decisions:

$P \= (w\_1 \\cdot \\text{Production Loss}) \+ (w\_2 \\cdot \\text{Anomaly Severity}) \+ (w\_3 \\cdot \\text{Recovery Potential}) \- (w\_4 \\cdot \\text{Assumed Complexity})$

* **Production Loss:** $Actual \- Expected$.  
* **Recovery Potential:** Estimated volume regained if the asset returns to its 30-day forecast.  
* **Complexity:** A configurable weight based on historical intervention time.

# **10\. Dashboard & User Experience**

The dashboard provides a "drill-down" experience for decision-makers:

1. **Portfolio Overview:** Geospatial view of assets with heatmaps indicating high-priority zones.  
2. **Asset Leaderboard:** Ranked list based on AIPS.  
3. **Prediction Canvas:** Overlay of Forecast vs. Actual production with confidence intervals.  
4. **Root Cause Panel:** SHAP-based bar charts showing the "Production Deviation Attribution."  
5. **Simulation Control:** Panel to "Inject Anomaly" and watch the system adapt in real-time.

# **11\. SIH Demo Flow (3-5 Minutes)**

1. **Initialization:** Load historical PPAC datasets to show model training and $R^2$ validation metrics.  
2. **Steady State:** Start the live simulator. Show the "Expected Production" line tracking with the incoming stream.  
3. **Anomaly Event:** Use the control panel to inject a "Gradual Clogging" anomaly.  
4. **Detection & Attribution:** The dashboard flags a "Yellow Alert." SHAP values show that "Pressure Drop" is the leading contributor to the deviation.  
5. **Re-Prioritization:** The asset moves from Rank \#12 to Rank \#2 on the Priority List due to high recovery potential.  
6. **Resolution:** Simulate a successful intervention; watch the AIPS score reset.

# **12\. Innovation & Impact**

* **Integrated Chain:** Moves from simple detection to actionable prioritization—bridging the gap between data science and field operations.  
* **Explainability:** Unlike "black-box" models, PetroPulse AI explains the drivers behind every anomaly, building trust with engineers.  
* **Resource Optimization:** Target KPIs include a **15-20% improvement** in anomaly response time and optimized allocation of technical manpower.

# **13\. Scalability & Limitations**

* **Mitigating Data Limits:** The architecture is "well-agnostic," meaning once authorized ONGC SCADA feeds are available, the models can be fine-tuned to specific well-level physics.  
* **Modular Ingestion:** The system supports Future Integration via REST APIs or OPC-UA protocols for enterprise deployment.  
* **Risks:** Model drift over long periods. *Mitigation:* Automated periodic retraining pipelines (MLOps).

# **14\. Technology Stack**

* **Core:** Python 3.10+, FastAPI.  
* **Storage:** PostgreSQL (TimescaleDB extension).  
* **ML:** Scikit-learn, XGBoost, SHAP, PyTorch (for LSTM).  
* **Frontend:** React.js with Tailwind CSS & Plotly.  
* **Deployment:** Docker (for rapid SIH environment setup).

# **15\. Final SIH Pitch**

* **Problem:** Fragmented analytics and delayed response to hydrocarbon production decline.  
* **Solution:** PetroPulse AI—A unified decision-support platform for forecasting and prioritized asset intervention.  
* **Innovation:** Bridging unsupervised anomaly detection with SHAP-based attribution and recovery-driven prioritization.  
* **Impact:** Drastic reduction in "Time-to-Action" and optimized resource allocation for national energy assets.  
* **Scalability:** Modular design ready for future integration with authorized real-time SCADA/NDR feeds.

