import os
import pickle

import networkx as nx
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "data"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "ml",
    "models"
)


def load_data():

    nodes = pd.read_csv(
        os.path.join(
            DATA_DIR,
            "nodes.csv"
        )
    )

    edges = pd.read_csv(
        os.path.join(
            DATA_DIR,
            "edges.csv"
        )
    )

    demand = pd.read_csv(
        os.path.join(
            DATA_DIR,
            "demand_history.csv"
        )
    )

    failures = pd.read_csv(
        os.path.join(
            DATA_DIR,
            "failure_history.csv"
        )
    )

    return (
        nodes,
        edges,
        demand,
        failures
    )


def encode_type(node_type):

    type_map = {
        "SUPPLIER": 0,
        "WAREHOUSE": 1,
        "PRODUCTION": 2,
        "STORE": 3,
        "CUSTOMER": 4
    }

    return type_map.get(
        str(node_type).upper(),
        0
    )


def build_graph(
    nodes,
    edges
):

    G = nx.DiGraph()

    for _, row in nodes.iterrows():

        G.add_node(
            row["node_id"],
            node_type=row["type"],
            name=row["name"],
            capacity=float(
                row["capacity"]
            ),
            location=row["location"],
            reliability=float(
                row["reliability"]
            )
        )

    for _, row in edges.iterrows():

        G.add_edge(
            row["from_node"],
            row["to_node"],
            dependency_type=row[
                "dependency_type"
            ],
            strength=float(
                row["strength"]
            ),
            lead_time_days=int(
                row["lead_time_days"]
            )
        )

    return G


def prepare_features():

    (
        nodes,
        edges,
        demand,
        failures
    ) = load_data()

    graph = build_graph(
        nodes,
        edges
    )

    betweenness = (
        nx.betweenness_centrality(
            graph
        )
    )

    rows = []

    for node_id in graph.nodes:

        node = graph.nodes[
            node_id
        ]

        downstream = list(
            nx.descendants(
                graph,
                node_id
            )
        )

        node_failures = failures[
            failures["node_id"]
            == node_id
        ]

        failure_count = len(
            node_failures
        )

        failure_rate = (
            failure_count /
            max(len(failures), 1)
        )

        node_demand = demand[
            demand["node_id"]
            == node_id
        ]

        if len(node_demand) > 0:

            avg_demand = float(
                node_demand["demand"].mean()
            )

            std_demand = float(
                node_demand["demand"].std()
            )

            if pd.isna(std_demand):
                std_demand = 0.0

        else:

            avg_demand = (
                float(
                    node.get(
                        "capacity",
                        0
                    )
                ) * 0.7
            )

            std_demand = (
                float(
                    node.get(
                        "capacity",
                        0
                    )
                ) * 0.1
            )

        disruption_pct = (
            min(
                100,
                len(downstream) * 4
            )
        )

        high_risk = (
            1
            if (
                failure_rate > 0.05
                or float(
                    node.get(
                        "reliability",
                        0.95
                    )
                ) < 0.90
            )
            else 0
        )

        peak_demand = (
            avg_demand + std_demand
        )

        rows.append({

            "node_id":
                node_id,

            "in_degree":
                graph.in_degree(
                    node_id
                ),

            "out_degree":
                graph.out_degree(
                    node_id
                ),

            "downstream_count":
                len(downstream),

            "betweenness_centrality":
                betweenness.get(
                    node_id,
                    0
                ),

            "capacity":
                float(
                    node.get(
                        "capacity",
                        0
                    )
                ),

            "type_encoded":
                encode_type(
                    node.get(
                        "node_type",
                        ""
                    )
                ),

            "failure_count":
                failure_count,

            "failure_rate":
                failure_rate,

            "reliability":
                float(
                    node.get(
                        "reliability",
                        0.95
                    )
                ),

            "avg_demand":
                avg_demand,

            "std_demand":
                std_demand,

            "disruption_pct":
                disruption_pct,

            "high_risk":
                high_risk,

            "peak_demand":
                peak_demand
        })

    return pd.DataFrame(rows)


def train_all_models():

    print("Loading supply chain data...")

    data = prepare_features()

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    # --------------------------------------------------
    # 1. Impact Model
    # --------------------------------------------------

    impact_features = [
        "in_degree",
        "out_degree",
        "downstream_count",
        "betweenness_centrality",
        "capacity",
        "type_encoded"
    ]

    X_impact = data[
        impact_features
    ]

    y_impact = data[
        "disruption_pct"
    ]

    impact_model = RandomForestRegressor(
        n_estimators=100,
        random_state=42
    )

    impact_model.fit(
        X_impact,
        y_impact
    )

    with open(
        os.path.join(
            MODEL_DIR,
            "impact_predictor.pkl"
        ),
        "wb"
    ) as file:

        pickle.dump(
            impact_model,
            file
        )

    print(
        "Impact model trained."
    )

    # --------------------------------------------------
    # 2. Risk Model
    # --------------------------------------------------

    risk_features = [
        "failure_count",
        "failure_rate",
        "reliability",
        "in_degree",
        "out_degree",
        "capacity"
    ]

    X_risk = data[
        risk_features
    ]

    y_risk = data[
        "high_risk"
    ]

    risk_model = LogisticRegression(
        random_state=42,
        max_iter=1000
    )

    risk_model.fit(
        X_risk,
        y_risk
    )

    with open(
        os.path.join(
            MODEL_DIR,
            "risk_estimator.pkl"
        ),
        "wb"
    ) as file:

        pickle.dump(
            risk_model,
            file
        )

    print(
        "Risk model trained."
    )

    # --------------------------------------------------
    # 3. Demand Model
    # --------------------------------------------------

    demand_features = [
        "avg_demand",
        "std_demand",
        "capacity",
        "type_encoded"
    ]

    X_demand = data[
        demand_features
    ]

    y_demand = data[
        "peak_demand"
    ]

    demand_model = RandomForestRegressor(
        n_estimators=100,
        random_state=42
    )

    demand_model.fit(
        X_demand,
        y_demand
    )

    with open(
        os.path.join(
            MODEL_DIR,
            "demand_forecaster.pkl"
        ),
        "wb"
    ) as file:

        pickle.dump(
            demand_model,
            file
        )

    print(
        "Demand model trained."
    )

    print()
    print(
        "All ML models trained successfully."
    )

    print(
        "Models saved in:",
        MODEL_DIR
    )