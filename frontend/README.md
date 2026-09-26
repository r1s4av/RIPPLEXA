# RIPPLEXA

### Predict the ripple. Prevent the collapse.

Ripplexa is a decision-support prototype for supply-chain disruption risk, impact propagation, recovery analysis, and operational decision support.

It models a supply network as a directed dependency graph, investigates disruption signals, simulates downstream ripple effects, evaluates recovery constraints, and presents the results through an operational dashboard.

> **Team:** Team Coffee & Code  
> **Hackathon:** HACK THE FUTURE 3.0 — National Hackathon 2026

---

## 1. Problem

A disruption in a supply network rarely remains isolated.

A supplier, warehouse, production unit, or store can be connected to many downstream operations. When one node fails, the difficult questions are:

- Which nodes are exposed?
- Which dependency paths can carry the disruption?
- How large could the downstream impact become?
- Which recovery routes are actually feasible?
- What should the operator investigate next?

Ripplexa brings network structure, failure history, simulation, and recovery analysis into one workflow.

---

## 2. What Ripplexa Does

The prototype follows this operational flow:

**MAP → RISK → SIMULATE → RECOVER → DECIDE**

### MAP

Build the supply-chain dependency network from operational nodes and directed relationships.

### RISK

Surface disruption signals using reliability, failure history, and network exposure.

### SIMULATE

Select a failed node and trace downstream dependencies through the graph.

### RECOVER

Compare candidate recovery routes against the available constraints.

### DECIDE

Present recommendations and an operational report so the user can investigate and act.

---

## 3. Network Model

The current prototype represents the supply chain as a directed graph.

- **34 nodes**
- **52 directed dependencies**
- Dependency types include supply, inventory, distribution, and retail relationships.
- Relationships contain **strength** and **lead-time** information.
- The dependency graph is generated from `nodes.csv` and `edges.csv`.

Network traversal is implemented with **NetworkX**.

When a node fails, the system identifies downstream nodes and possible cascade paths through the dependency graph.

---

## 4. AI / ML Layer

The prototype includes three model components.

### Impact Prediction

Estimates the potential disruption percentage for a selected node using network and node-level features.

### Risk Estimation

Estimates node-level failure risk using reliability, failure history, and network features.

### Demand Forecasting

Estimates peak demand and compares it with node capacity to derive a utilization signal.

The current models are prototype models trained from the supplied project dataset and derived labels. They should therefore be treated as decision-support components rather than claims of real-world predictive accuracy.

---

## 5. Recovery Analysis

Ripplexa evaluates candidate recovery strategies instead of assuming that every alternative route is possible.

The recovery layer considers operational constraints and reports whether candidate strategies are feasible.

If no strategy satisfies the current constraints, Ripplexa reports that result instead of fabricating a recommendation.

---

## 6. Dashboard

The frontend provides the following views:

1. **Dashboard** — overall network snapshot
2. **Network Graph** — dependency structure
3. **Disruption Analysis** — failure simulation and cascade tracing
4. **AI Risk & Impact** — risk, impact, and demand signals
5. **Recovery & Optimization** — recovery strategy analysis
6. **Recommendations** — suggested investigation points
7. **Reports** — operational summary

---

## 7. Screenshots

### Dashboard

![Ripplexa Dashboard](docs/screenshots/01-dashboard.jpg)

### Network Graph

![Ripplexa Network Graph](docs/screenshots/02-network-graph.jpg)

### AI Risk & Impact

![Ripplexa AI Risk and Impact](docs/screenshots/03-ai-risk-impact.jpg)

### Recovery & Optimization

![Ripplexa Recovery and Optimization](docs/screenshots/04-recovery-optimization.jpg)

### Recommendations

![Ripplexa Recommendations](docs/screenshots/05-recommendations.jpg)

### Operational Report

![Ripplexa Operational Report](docs/screenshots/06-operational-report.jpg)

---

## 8. Tech Stack

### Backend

- Python
- FastAPI
- Uvicorn
- Pandas
- NetworkX
- Scikit-learn
- OR-Tools

### Frontend

- React
- Vite
- CSS

### Data

- CSV-based prototype supply-chain data

---

## 9. Project Structure

```text
RIPPLEXA/
│
├── backend/
│   ├── api/
│   │   └── routes.py
│   ├── config.py
│   ├── main.py
│   └── pipeline.py
│
├── data/
│   ├── demand_history.csv
│   ├── edges.csv
│   ├── failure_history.csv
│   ├── nodes.csv
│   └── supply_chain.csv
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── graph/
│   ├── cascade_demo.py
│   ├── graph_demo.py
│   ├── test_all_failures.py
│   ├── test_failure.py
│   ├── test_graph.py
│   └── graph/
│       ├── failure_simulation.py
│       ├── graph_builder.py
│       └── __init__.py
│
├── ml/
│   ├── model.py
│   ├── predictor.py
│   ├── preprocessing.py
│   ├── train_models.py
│   └── models/
│       ├── demand_forecaster.pkl
│       ├── impact_predictor.pkl
│       └── risk_estimator.pkl
│
├── optimization/
│   └── recovery.py
│
├── tests/
│   ├── test_graph.py
│   ├── test_ml.py
│   ├── test_optimization.py
│   └── test_pipeline.py
│
├── docs/
│   └── screenshots/
│       ├── 01-dashboard.png
│       ├── 02-network-graph.png
│       ├── 03-ai-risk-impact.png
│       ├── 04-recovery-optimization.png
│       ├── 05-recommendations.png
│       └── 06-operational-report.png
│
├── .gitignore
├── README.md
└── requirements.txt

Yes — continuing directly from **Section 9**, here are the remaining README sections **10–17**, cleaned and ready to paste immediately after the Project Structure section.

````markdown
---

## 10. Setup

### Backend

Python **3.13** is recommended for the current prototype environment.

Create a virtual environment:

```powershell
py -3.13 -m venv .venv
````

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Run the backend:

```powershell
python -m uvicorn backend.main:app
```

The API runs at:

```text
http://127.0.0.1:8000
```

---

## 11. Frontend

Open a second terminal:

```powershell
cd frontend
```

Install frontend dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

If PowerShell blocks `npm.ps1`, use:

```powershell
npm.cmd run dev
```

The frontend normally runs at:

```text
http://localhost:5173
```

---

## 12. API

### Simulation

```text
POST /simulate
```

Request:

```json
{
  "failed_node": "SUP_B"
}
```

The endpoint returns the integrated result containing:

* Cascade analysis
* ML predictions
* Recovery analysis

The backend combines graph simulation, machine-learning predictions, and recovery analysis into a single response.

---

## 13. Example End-to-End Flow

A typical investigation can be performed as:

```text
Select failed node
        ↓
Build / load dependency graph
        ↓
Trace downstream cascade
        ↓
Calculate risk and impact signals
        ↓
Evaluate recovery strategies
        ↓
Display recommendation and report
```

For the current prototype's demonstrated `SUP_B` scenario, the system identifies downstream affected nodes and cascade paths, produces ML impact, risk, and demand signals, and evaluates recovery strategies against the available constraints.

---

## 14. Current Prototype Scope

The current implementation is a working prototype rather than a production deployment.

The present system demonstrates:

* Supply-chain dependency mapping
* Directed dependency graph construction
* Cascading failure simulation
* Downstream impact analysis
* Risk estimation
* Impact prediction
* Demand forecasting
* Recovery strategy evaluation
* Operational dashboard visualization

### Future Scope

Future development can include:

* Real-time operational data
* Larger and more dynamic networks
* Dynamic capacity and demand
* Richer what-if scenarios
* Additional recovery constraints
* Stronger validation with real historical disruption data
* Enterprise-scale deployment
* Multi-site and cross-domain resilience analysis

---

## 15. AI / Code Disclosure

AI-assisted development was used during the hackathon and is disclosed in accordance with the event requirements.

Team members reviewed, integrated, tested, and are responsible for explaining the submitted implementation.

---

## 16. Team

### Team Coffee & Code

**Project:** RIPPLEXA

**Tagline:** Predict the ripple. Prevent the collapse.

---

## 17. License

This project was developed as a hackathon prototype.

````