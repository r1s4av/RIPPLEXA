import os
import pickle

import networkx as nx
import pandas as pd

from ml.model import (
    load_data,
    build_graph,
    encode_type
)


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "ml",
    "models"
)


class RipplexaMLPredictor:

    def __init__(self):

        self.impact_model = None

        self.risk_model = None

        self.demand_model = None

        self.models_loaded = False

        self.nodes = None

        self.edges = None

        self.demand = None

        self.failures = None

        self.graph = None

    def load_models(self):

        try:

            with open(
                os.path.join(
                    MODEL_DIR,
                    "impact_predictor.pkl"
                ),
                "rb"
            ) as file:

                self.impact_model = pickle.load(
                    file
                )

            with open(
                os.path.join(
                    MODEL_DIR,
                    "risk_estimator.pkl"
                ),
                "rb"
            ) as file:

                self.risk_model = pickle.load(
                    file
                )

            with open(
                os.path.join(
                    MODEL_DIR,
                    "demand_forecaster.pkl"
                ),
                "rb"
            ) as file:

                self.demand_model = pickle.load(
                    file
                )

            (
                self.nodes,
                self.edges,
                self.demand,
                self.failures
            ) = load_data()

            self.graph = build_graph(
                self.nodes,
                self.edges
            )

            self.models_loaded = True

            return True

        except Exception as error:

            print(
                "ML model loading failed:",
                error
            )

            return False

    def get_node_features(
        self,
        node_id
    ):

        if node_id not in self.graph:

            return None

        node = self.graph.nodes[
            node_id
        ]

        betweenness = (
            nx.betweenness_centrality(
                self.graph
            )
        )

        downstream = list(
            nx.descendants(
                self.graph,
                node_id
            )
        )

        node_failures = self.failures[
            self.failures["node_id"]
            == node_id
        ]

        failure_count = len(
            node_failures
        )

        failure_rate = (
            failure_count /
            max(len(self.failures), 1)
        )

        node_demand = self.demand[
            self.demand["node_id"]
            == node_id
        ]

        if len(node_demand) > 0:

            avg_demand = float(
                node_demand["demand"].mean()
            )

            std_demand = float(
                node_demand["demand"].std()
            )

        else:

            avg_demand = (
                float(node.get("capacity", 0))
                * 0.7
            )

            std_demand = (
                float(node.get("capacity", 0))
                * 0.1
            )

        return {

            "node_id": node_id,

            "in_degree":
                self.graph.in_degree(
                    node_id
                ),

            "out_degree":
                self.graph.out_degree(
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
                std_demand
        }

    def predict_impact(
        self,
        node_data
    ):

        features = pd.DataFrame([{

            "in_degree":
                node_data["in_degree"],

            "out_degree":
                node_data["out_degree"],

            "downstream_count":
                node_data["downstream_count"],

            "betweenness_centrality":
                node_data[
                    "betweenness_centrality"
                ],

            "capacity":
                node_data["capacity"],

            "type_encoded":
                node_data["type_encoded"]

        }])

        prediction = float(
            self.impact_model.predict(
                features
            )[0]
        )

        prediction = max(
            0,
            min(
                100,
                prediction
            )
        )

        if prediction >= 70:

            severity = "CRITICAL"

        elif prediction >= 50:

            severity = "HIGH"

        elif prediction >= 20:

            severity = "MODERATE"

        else:

            severity = "LOW"

        return {

            "disruption_percentage":
                round(
                    prediction,
                    2
                ),

            "severity":
                severity,

            "model":
                "RandomForestRegressor"
        }

    def predict_risk(
        self,
        node_data
    ):

        features = pd.DataFrame([{

            "failure_count":
                node_data["failure_count"],

            "failure_rate":
                node_data["failure_rate"],

            "reliability":
                node_data["reliability"],

            "in_degree":
                node_data["in_degree"],

            "out_degree":
                node_data["out_degree"],

            "capacity":
                node_data["capacity"]

        }])

        probabilities = (
            self.risk_model.predict_proba(
                features
            )[0]
        )

        classification = int(
            self.risk_model.predict(
                features
            )[0]
        )

        risk_score = float(
            probabilities[1]
        )

        return {

            "risk_score":
                round(
                    risk_score,
                    3
                ),

            "risk_level":
                "HIGH"
                if classification == 1
                else "LOW",

            "classification":
                classification,

            "model":
                "LogisticRegression"
        }

    def predict_demand(
        self,
        node_data
    ):

        features = pd.DataFrame([{

            "avg_demand":
                node_data["avg_demand"],

            "std_demand":
                node_data["std_demand"],

            "capacity":
                node_data["capacity"],

            "type_encoded":
                node_data["type_encoded"]

        }])

        prediction = float(
            self.demand_model.predict(
                features
            )[0]
        )

        capacity = node_data[
            "capacity"
        ]

        if capacity > 0:

            utilization = (
                prediction /
                capacity
            )

        else:

            utilization = 0

        if utilization >= 0.95:

            status = "OVERLOAD"

        elif utilization >= 0.80:

            status = "NEAR_CAPACITY"

        else:

            status = "NORMAL"

        return {

            "predicted_peak_demand":
                round(
                    prediction,
                    2
                ),

            "utilization_rate":
                round(
                    utilization,
                    3
                ),

            "status":
                status,

            "model":
                "RandomForestRegressor"
        }

    def predict_node(
        self,
        node_id
    ):

        if not self.models_loaded:

            return {
                "error":
                    "ML models are not loaded"
            }

        node_data = (
            self.get_node_features(
                node_id
            )
        )

        if node_data is None:

            return {
                "error":
                    "Node not found"
            }

        impact = self.predict_impact(
            node_data
        )

        risk = self.predict_risk(
            node_data
        )

        demand = self.predict_demand(
            node_data
        )

        return {

            "node_id":
                node_id,

            "impact":
                impact,

            "risk":
                risk,

            "demand":
                demand
        }


predictor = RipplexaMLPredictor()