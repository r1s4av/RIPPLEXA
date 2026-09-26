from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
import zipfile

import pandas as pd
import networkx as nx

from ortools.linear_solver import pywraplp


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = PROJECT_ROOT / "data"

ZIP_FILE = DATA_DIR / "ripplexa_data.zip"

EXTRACTED_DATA_DIR = DATA_DIR / "_recovery_data"


# ============================================================
# OBJECTIVE WEIGHTS
# ============================================================

DISRUPTION_WEIGHT = 0.45
COST_WEIGHT = 0.20
DELAY_WEIGHT = 0.20
RISK_WEIGHT = 0.15


# ============================================================
# DATA CLASS
# ============================================================

@dataclass
class RecoveryStrategy:

    name: str

    route: List[str]

    feasible: bool

    capacity: float

    required_capacity: float

    demand: float

    disruption: float

    maximum_disruption: float

    capacity_feasible: bool

    disruption_feasible: bool

    feasibility_reasons: List[str]

    delay_days: float

    risk: float

    cost: float

    objective_value: float


# ============================================================
# DATA LOADING
# ============================================================

def prepare_data_directory():
    """
    Make sure the four CSV files are available.

    The current project stores them inside:
        data/ripplexa_data.zip

    If CSV files are not already extracted, this function
    extracts the ZIP automatically.
    """

    required_files = [
        "nodes.csv",
        "edges.csv",
        "demand_history.csv",
        "failure_history.csv",
    ]

    # Check if CSVs already exist directly in data/
    direct_files_exist = all(
        (DATA_DIR / filename).exists()
        for filename in required_files
    )

    if direct_files_exist:
        return DATA_DIR

    # Check extracted directory
    extracted_files_exist = all(
        (EXTRACTED_DATA_DIR / filename).exists()
        for filename in required_files
    )

    if extracted_files_exist:
        return EXTRACTED_DATA_DIR

    # Extract ZIP
    if not ZIP_FILE.exists():
        raise FileNotFoundError(
            f"Dataset ZIP not found: {ZIP_FILE}"
        )

    EXTRACTED_DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with zipfile.ZipFile(
        ZIP_FILE,
        "r"
    ) as zip_ref:

        zip_ref.extractall(
            EXTRACTED_DATA_DIR
        )

    # Sometimes ZIP contains a nested folder.
    # Search recursively for nodes.csv.
    nodes_file = next(
        EXTRACTED_DATA_DIR.rglob("nodes.csv"),
        None
    )

    if nodes_file is None:
        raise FileNotFoundError(
            "nodes.csv was not found inside ripplexa_data.zip"
        )

    return nodes_file.parent


def load_data():

    data_path = prepare_data_directory()

    nodes = pd.read_csv(
        data_path / "nodes.csv"
    )

    edges = pd.read_csv(
        data_path / "edges.csv"
    )

    demand = pd.read_csv(
        data_path / "demand_history.csv"
    )

    failures = pd.read_csv(
        data_path / "failure_history.csv"
    )

    return (
        nodes,
        edges,
        demand,
        failures
    )


# ============================================================
# BUILD SUPPLY CHAIN GRAPH
# ============================================================

def build_graph(
    edges: pd.DataFrame
) -> nx.DiGraph:

    graph = nx.DiGraph()

    for _, row in edges.iterrows():

        source = str(
            row["from_node"]
        )

        target = str(
            row["to_node"]
        )

        graph.add_edge(
            source,
            target,

            strength=float(
                row["strength"]
            ),

            lead_time_days=float(
                row["lead_time_days"]
            ),

            dependency_type=str(
                row["dependency_type"]
            )
        )

    return graph


# ============================================================
# NODE HELPERS
# ============================================================

def get_node(
    nodes: pd.DataFrame,
    node_id: str
):

    result = nodes[
        nodes["node_id"].astype(str)
        == str(node_id)
    ]

    if result.empty:
        return None

    return result.iloc[0]


def get_node_type(
    nodes: pd.DataFrame,
    node_id: str
) -> Optional[str]:

    node = get_node(
        nodes,
        node_id
    )

    if node is None:
        return None

    return str(
        node["type"]
    )


def get_capacity(
    nodes: pd.DataFrame,
    node_id: str
) -> float:

    node = get_node(
        nodes,
        node_id
    )

    if node is None:
        return 0.0

    return float(
        node["capacity"]
    )


def get_reliability(
    nodes: pd.DataFrame,
    node_id: str
) -> float:

    node = get_node(
        nodes,
        node_id
    )

    if node is None:
        return 1.0

    return float(
        node["reliability"]
    )


# ============================================================
# FAILURE
# ============================================================

def get_failure(
    failures: pd.DataFrame,
    failure_id: Optional[str] = None,
    failed_node: Optional[str] = None
) -> Dict[str, Any]:

    if failure_id is not None:

        matches = failures[
            failures["failure_id"].astype(str)
            == str(failure_id)
        ]

        if matches.empty:
            raise ValueError(
                f"Failure '{failure_id}' not found."
            )

        return matches.iloc[0].to_dict()

    if failed_node is not None:

        matches = failures[
            failures["node_id"].astype(str)
            == str(failed_node)
        ].copy()

        if matches.empty:
            raise ValueError(
                f"No failure found for {failed_node}."
            )

        matches["date"] = pd.to_datetime(
            matches["date"],
            errors="coerce"
        )

        matches = matches.sort_values(
            "date"
        )

        return matches.iloc[-1].to_dict()

    raise ValueError(
        "Provide failure_id or failed_node."
    )


# ============================================================
# DEMAND
# ============================================================

def get_average_demand(
    demand: pd.DataFrame,
    node_id: str
) -> float:

    values = demand[
        demand["node_id"].astype(str)
        == str(node_id)
    ]["demand"]

    if values.empty:
        return 0.0

    return float(
        values.mean()
    )


# ============================================================
# FIND ALTERNATIVE ROUTES
# ============================================================

def find_alternative_routes(
    graph: nx.DiGraph,
    nodes: pd.DataFrame,
    failed_node: str,
    target_production: Optional[str] = None,
    target_store: Optional[str] = None,
    max_routes: Optional[int] = None
) -> List[List[str]]:

    recovery_graph = graph.copy()
    if failed_node in recovery_graph:
        recovery_graph.remove_node(failed_node)

    # Find all suppliers.
    suppliers = [
        node for node in recovery_graph.nodes
        if get_node_type(nodes, node) == "supplier"
    ]
    routes = []

    for supplier in suppliers:
        for warehouse in recovery_graph.successors(supplier):
            if get_node_type(nodes, warehouse) != "warehouse":
                continue

            for production in recovery_graph.successors(warehouse):
                if get_node_type(nodes, production) != "production":
                    continue
                if target_production and production != target_production:
                    continue

                for store in recovery_graph.successors(production):
                    if get_node_type(nodes, store) != "store":
                        continue
                    if target_store and store != target_store:
                        continue

                    routes.append([supplier, warehouse, production, store])
                    if max_routes is not None and len(routes) >= max_routes:
                        return routes

    return routes


# ============================================================
# ROUTE METRICS
# ============================================================

def calculate_route_metrics(
    route: List[str],
    graph: nx.DiGraph,
    nodes: pd.DataFrame,
    demand: pd.DataFrame,
    target_production: Optional[str] = None,
    required_capacity: float = 0.0,
    disruption_threshold: float = 1.0
) -> Dict[str, float]:

    # --------------------------------------------------------
    # Demand
    # --------------------------------------------------------

    production_node = target_production or route[2]
    average_demand = get_average_demand(demand, production_node)

    # --------------------------------------------------------
    # Capacity
    # --------------------------------------------------------

    capacities = []

    for node in route:

        node_type = get_node_type(
            nodes,
            node
        )

        if node_type in {"supplier", "warehouse", "production"}:

            capacities.append(
                get_capacity(
                    nodes,
                    node
                )
            )

    if capacities:

        bottleneck_capacity = min(
            capacities
        )

    else:

        bottleneck_capacity = 0.0

    capacity_feasible = bottleneck_capacity >= required_capacity

    # --------------------------------------------------------
    # Reliability
    # --------------------------------------------------------

    reliabilities = [
        get_reliability(
            nodes,
            node
        )
        for node in route
    ]

    average_reliability = (
        sum(reliabilities)
        / len(reliabilities)
    )

    minimum_reliability = min(
        reliabilities
    )

    # --------------------------------------------------------
    # Edge information
    # --------------------------------------------------------

    strengths = []
    lead_times = []

    for source, target in zip(
        route,
        route[1:]
    ):

        edge = graph.get_edge_data(
            source,
            target
        )

        if edge is None:
            raise ValueError(
                f"Invalid route edge: "
                f"{source} -> {target}"
            )

        strengths.append(
            float(
                edge["strength"]
            )
        )

        lead_times.append(
            float(
                edge["lead_time_days"]
            )
        )

    average_strength = (
        sum(strengths)
        / len(strengths)
    )

    minimum_strength = min(
        strengths
    )

    total_delay = sum(
        lead_times
    )

    # --------------------------------------------------------
    # Risk
    # --------------------------------------------------------

    node_risk = (
        1.0 - average_reliability
    )

    route_risk = (
        1.0 - average_strength
    )

    risk = (
        0.5 * node_risk
        +
        0.5 * route_risk
    )

    # --------------------------------------------------------
    # Disruption
    # --------------------------------------------------------

    disruption = (
        0.5
        * (1.0 - minimum_reliability)
        +
        0.5
        * (1.0 - minimum_strength)
    )

    disruption_feasible = disruption <= disruption_threshold
    feasibility_reasons = [
        (
            f"Capacity {bottleneck_capacity:.2f} >= required {required_capacity:.2f}"
            if capacity_feasible
            else f"Capacity {bottleneck_capacity:.2f} < required {required_capacity:.2f}"
        ),
        (
            f"Disruption {disruption:.4f} <= maximum {disruption_threshold:.4f}"
            if disruption_feasible
            else f"Disruption {disruption:.4f} > maximum {disruption_threshold:.4f}"
        )
    ]

    # --------------------------------------------------------
    # Recovery cost proxy
    #
    # Dataset doesn't contain actual money cost.
    # Therefore this is NOT currency.
    # --------------------------------------------------------

    route_length_factor = min(
        len(route) / 10.0,
        1.0
    )

    cost = (
        0.5
        * (1.0 - average_strength)
        +
        0.5
        * route_length_factor
    )

    return {
        "feasible": capacity_feasible and disruption_feasible,
        "capacity": bottleneck_capacity,
        "required_capacity": required_capacity,
        "demand": average_demand,
        "disruption": disruption,
        "maximum_disruption": disruption_threshold,
        "capacity_feasible": capacity_feasible,
        "disruption_feasible": disruption_feasible,
        "feasibility_reasons": feasibility_reasons,
        "delay_days": total_delay,
        "risk": risk,
        "cost": cost
    }


# ============================================================
# NORMALIZATION
# ============================================================

def normalize(
    values: List[float]
) -> List[float]:

    if not values:
        return []

    minimum = min(values)
    maximum = max(values)

    if minimum == maximum:

        return [
            0.0
            for _ in values
        ]

    return [
        (value - minimum)
        /
        (maximum - minimum)

        for value in values
    ]


# ============================================================
# CREATE STRATEGIES
# ============================================================

def create_strategies(
    routes: List[List[str]],
    graph: nx.DiGraph,
    nodes: pd.DataFrame,
    demand: pd.DataFrame,
    target_production: Optional[str] = None,
    required_capacity: float = 0.0,
    disruption_threshold: float = 1.0
) -> List[RecoveryStrategy]:

    if not routes:
        return []

    metric_list = []

    for route in routes:

        metrics = calculate_route_metrics(
            route,
            graph,
            nodes,
            demand,
            target_production,
            required_capacity,
            disruption_threshold
        )

        metric_list.append(
            (route, metrics)
        )

    # Normalize delays because delay is measured in days,
    # while other metrics are between 0 and 1.
    delays = [
        metrics["delay_days"]
        for _, metrics in metric_list
    ]

    normalized_delays = normalize(
        delays
    )

    strategies = []

    for index, (
        route,
        metrics
    ) in enumerate(metric_list):

        normalized_delay = (
            normalized_delays[index]
        )

        objective = (
            DISRUPTION_WEIGHT
            * metrics["disruption"]

            +

            COST_WEIGHT
            * metrics["cost"]

            +

            DELAY_WEIGHT
            * normalized_delay

            +

            RISK_WEIGHT
            * metrics["risk"]
        )

        # Infeasible route gets a huge penalty.
        if not metrics["feasible"]:

            objective += 1000

        strategy = RecoveryStrategy(

            name=(
                "Route "
                + str(index + 1)
                + ": "
                + " -> ".join(route)
            ),

            route=route,

            feasible=metrics["feasible"],

            capacity=round(
                metrics["capacity"],
                2
            ),

            required_capacity=round(
                metrics["required_capacity"],
                2
            ),

            demand=round(
                metrics["demand"],
                2
            ),

            disruption=round(
                metrics["disruption"],
                4
            ),

            maximum_disruption=round(
                metrics["maximum_disruption"],
                4
            ),

            capacity_feasible=metrics["capacity_feasible"],

            disruption_feasible=metrics["disruption_feasible"],

            feasibility_reasons=metrics["feasibility_reasons"],

            delay_days=round(
                metrics["delay_days"],
                2
            ),

            risk=round(
                metrics["risk"],
                4
            ),

            cost=round(
                metrics["cost"],
                4
            ),

            objective_value=round(
                objective,
                6
            )
        )

        strategies.append(
            strategy
        )

    return strategies


# ============================================================
# GOOGLE OR-TOOLS
# ============================================================

def optimize_strategy(
    strategies: List[RecoveryStrategy]
):

    feasible_strategies = [
        strategy
        for strategy in strategies
        if strategy.feasible
    ]

    if not feasible_strategies:

        return (
            None,
            "No feasible strategy"
        )

    # --------------------------------------------------------
    # Create OR-Tools solver
    # --------------------------------------------------------

    solver = (
        pywraplp.Solver.CreateSolver(
            "SCIP"
        )
    )

    if solver is None:

        solver = (
            pywraplp.Solver.CreateSolver(
                "CBC"
            )
        )

    if solver is None:

        # Safety fallback.
        best = min(
            feasible_strategies,
            key=lambda x:
            x.objective_value
        )

        return (
            best,
            "Fallback"
        )

    # --------------------------------------------------------
    # Decision variables
    # --------------------------------------------------------

    variables = []

    for index, strategy in enumerate(
        strategies
    ):

        variable = solver.BoolVar(
            f"select_route_{index}"
        )

        variables.append(
            variable
        )

        # Infeasible routes cannot be selected.
        if not strategy.feasible:

            solver.Add(
                variable == 0
            )

    # Exactly ONE recovery strategy.
    solver.Add(
        sum(variables) == 1
    )

    # --------------------------------------------------------
    # Objective
    # --------------------------------------------------------

    objective = solver.Objective()

    for index, strategy in enumerate(
        strategies
    ):

        objective.SetCoefficient(
            variables[index],
            strategy.objective_value
        )

    objective.SetMinimization()

    # --------------------------------------------------------
    # Solve
    # --------------------------------------------------------

    status = solver.Solve()

    if status == pywraplp.Solver.OPTIMAL:

        for index, variable in enumerate(
            variables
        ):

            if variable.solution_value() > 0.5:

                return (
                    strategies[index],
                    "Google OR-Tools"
                )

    # Fallback if solver doesn't return optimal.
    best = min(
        feasible_strategies,
        key=lambda x:
        x.objective_value
    )

    return (
        best,
        "Fallback"
    )


# ============================================================
# COMPLETE RECOVERY ENGINE
# ============================================================

def run_recovery(
    failure_id: Optional[str] = None,
    failed_node: Optional[str] = None,
    target_production: Optional[str] = None,
    target_store: Optional[str] = None,
    required_capacity: float = 100.0,
    disruption_threshold: float = 0.45
):

    if required_capacity < 0:
        raise ValueError("Required capacity must be zero or greater.")

    if not 0 <= disruption_threshold <= 1:
        raise ValueError("Disruption threshold must be between 0 and 1.")

    # --------------------------------------------------------
    # 1. Load data
    # --------------------------------------------------------

    (
        nodes,
        edges,
        demand,
        failures
    ) = load_data()

    # --------------------------------------------------------
    # 2. Identify failure
    # --------------------------------------------------------

    failure = get_failure(
        failures,
        failure_id=failure_id,
        failed_node=failed_node
    )

    failed_node_id = str(
        failure["node_id"]
    )

    # --------------------------------------------------------
    # 3. Build graph
    # --------------------------------------------------------

    graph = build_graph(
        edges
    )

    # --------------------------------------------------------
    # 4. Validate target
    # --------------------------------------------------------

    if target_production is not None and target_production not in graph:

        raise ValueError(
            f"Production node "
            f"{target_production} "
            f"does not exist."
        )

    if target_store is not None:

        if target_store not in graph:

            raise ValueError(
                f"Store node "
                f"{target_store} "
                f"does not exist."
            )

    # --------------------------------------------------------
    # 5. Find alternative routes
    # --------------------------------------------------------

    routes = find_alternative_routes(

        graph=graph,

        nodes=nodes,

        failed_node=failed_node_id,

        target_production=target_production,

        target_store=target_store,

        max_routes=None
    )

    # --------------------------------------------------------
    # 6. Evaluate routes
    # --------------------------------------------------------

    strategies = create_strategies(

        routes=routes,

        graph=graph,

        nodes=nodes,

        demand=demand,

        target_production=target_production,

        required_capacity=required_capacity,

        disruption_threshold=disruption_threshold
    )

    # --------------------------------------------------------
    # 7. Optimize
    # --------------------------------------------------------

    selected, optimizer = optimize_strategy(
        strategies
    )

    # --------------------------------------------------------
    # 8. Prepare output
    # --------------------------------------------------------

    return {

        "failure": {

            "failure_id":
                failure.get(
                    "failure_id"
                ),

            "failed_node":
                failed_node_id,

            "failure_type":
                failure.get(
                    "failure_type"
                ),

            "duration_hours":
                failure.get(
                    "duration_hours"
                ),

            "impact_score":
                failure.get(
                    "impact_score"
                )
        },

        "target": {

            "production":
                target_production,

            "store":
                target_store
        },

            "constraints": {
                "required_capacity": required_capacity,
                "disruption_threshold": disruption_threshold
            },

        "strategies": [

            asdict(
                strategy
            )

            for strategy in strategies
        ],

        "recommended_strategy":

            (
                asdict(selected)
                if selected is not None
                else None
            ),

        "optimizer":
            optimizer
    }


# ============================================================
# DISPLAY
# ============================================================

def print_result(
    result: Dict[str, Any]
):

    print()
    print("=" * 70)
    print("RIPPLEXA - RECOVERY & ROUTE COMPARISON")
    print("=" * 70)

    failure = result["failure"]

    print(
        f"Failed Node : "
        f"{failure['failed_node']}"
    )

    print(
        f"Failure Type: "
        f"{failure['failure_type']}"
    )

    print(
        f"Impact Score: "
        f"{failure['impact_score']}"
    )

    print(
        f"Production  : "
        f"{result['target']['production']}"
    )

    print(
        f"Store       : "
        f"{result['target']['store']}"
    )

    print()
    print("-" * 70)
    print("AVAILABLE RECOVERY STRATEGIES")
    print("-" * 70)

    for index, strategy in enumerate(
        result["strategies"],
        start=1
    ):

        print()
        print(
            f"Strategy {index}"
        )

        print(
            "Route: "
            +
            " -> ".join(
                strategy["route"]
            )
        )

        print(
            f"Feasible   : "
            f"{strategy['feasible']}"
        )

        print(
            f"Capacity   : "
            f"{strategy['capacity']}"
        )

        print(
            f"Demand     : "
            f"{strategy['demand']}"
        )

        print(
            f"Disruption : "
            f"{strategy['disruption']}"
        )

        print(
            f"Delay      : "
            f"{strategy['delay_days']} days"
        )

        print(
            f"Risk       : "
            f"{strategy['risk']}"
        )

        print(
            f"Cost Proxy : "
            f"{strategy['cost']}"
        )

        print(
            f"Objective  : "
            f"{strategy['objective_value']}"
        )

    print()
    print("=" * 70)
    print("RECOMMENDED RECOVERY")
    print("=" * 70)

    recommended = (
        result["recommended_strategy"]
    )

    if recommended is None:

        print(
            "No feasible recovery strategy found."
        )

    else:

        print(
            " -> ".join(
                recommended["route"]
            )
        )

        print()
        print(
            f"Optimizer: "
            f"{result['optimizer']}"
        )

    print("=" * 70)


# ============================================================
# RUN DEMO
# ============================================================

if __name__ == "__main__":

    # Example scenario:
    #
    # Warehouse B has failed.
    # We want Production C to continue.
    # We want the route to reach Store D.
    #

    result = run_recovery(
        failed_node="WH_B",
        target_production="PROD_C",
        target_store="STORE_D"
    )

    print_result(
        result
    )