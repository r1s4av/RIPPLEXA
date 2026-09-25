import networkx as nx

from optimization.recovery import (
    load_data,
    build_graph,
    get_failure,
    get_average_demand,
    find_alternative_routes,
    calculate_route_metrics,
    create_strategies,
    optimize_strategy,
    run_recovery,
)


def test_data_loads():

    nodes, edges, demand, failures = load_data()

    assert len(nodes) == 34
    assert len(edges) == 52
    assert len(demand) == 1710
    assert len(failures) == 20


def test_graph_is_directed():

    nodes, edges, demand, failures = load_data()

    graph = build_graph(edges)

    assert isinstance(
        graph,
        nx.DiGraph
    )

    assert graph.has_edge(
        "SUP_B",
        "WH_A"
    )

    assert graph.has_edge(
        "WH_A",
        "PROD_C"
    )

    assert graph.has_edge(
        "PROD_C",
        "STORE_D"
    )


def test_failure_lookup():

    nodes, edges, demand, failures = load_data()

    failure = get_failure(
        failures,
        failure_id="FAIL_006"
    )

    assert failure["node_id"] == "SUP_B"

    assert failure["failure_type"] == "equipment"


def test_demand_exists():

    nodes, edges, demand, failures = load_data()

    average_demand = get_average_demand(
        demand,
        "PROD_C"
    )

    assert average_demand > 0


def test_recovery_routes_bypass_failed_node():

    nodes, edges, demand, failures = load_data()

    graph = build_graph(
        edges
    )

    routes = find_alternative_routes(

        graph=graph,

        nodes=nodes,

        failed_node="WH_B",

        target_production="PROD_C",

        target_store="STORE_D",

        max_routes=20
    )

    assert len(routes) > 0

    for route in routes:

        # Failed warehouse must not be used.
        assert "WH_B" not in route

        # Production must be reached.
        assert "PROD_C" in route

        # Store must be reached.
        assert "STORE_D" in route


def test_routes_use_real_edges():

    nodes, edges, demand, failures = load_data()

    graph = build_graph(
        edges
    )

    routes = find_alternative_routes(

        graph=graph,

        nodes=nodes,

        failed_node="WH_B",

        target_production="PROD_C",

        target_store="STORE_D",

        max_routes=20
    )

    for route in routes:

        for source, target in zip(
            route,
            route[1:]
        ):

            assert graph.has_edge(
                source,
                target
            )


def test_route_metrics():

    nodes, edges, demand, failures = load_data()

    graph = build_graph(
        edges
    )

    routes = find_alternative_routes(

        graph=graph,

        nodes=nodes,

        failed_node="WH_B",

        target_production="PROD_C",

        target_store="STORE_D",

        max_routes=20
    )

    assert len(routes) > 0

    metrics = calculate_route_metrics(

        route=routes[0],

        graph=graph,

        nodes=nodes,

        demand=demand,

        target_production="PROD_C"
    )

    assert "capacity" in metrics

    assert "demand" in metrics

    assert "disruption" in metrics

    assert "delay_days" in metrics

    assert "risk" in metrics

    assert "cost" in metrics


def test_strategy_creation():

    nodes, edges, demand, failures = load_data()

    graph = build_graph(
        edges
    )

    routes = find_alternative_routes(

        graph=graph,

        nodes=nodes,

        failed_node="WH_B",

        target_production="PROD_C",

        target_store="STORE_D",

        max_routes=20
    )

    strategies = create_strategies(

        routes=routes,

        graph=graph,

        nodes=nodes,

        demand=demand,

        target_production="PROD_C"
    )

    assert len(strategies) > 0

    for strategy in strategies:

        assert len(
            strategy.route
        ) >= 2

        assert (
            "WH_B"
            not in strategy.route
        )

        assert strategy.delay_days >= 0

        assert 0 <= strategy.risk <= 1

        assert 0 <= strategy.disruption <= 1

        assert 0 <= strategy.cost <= 1


def test_or_tools_selection():

    nodes, edges, demand, failures = load_data()

    graph = build_graph(
        edges
    )

    routes = find_alternative_routes(

        graph=graph,

        nodes=nodes,

        failed_node="WH_B",

        target_production="PROD_C",

        target_store="STORE_D",

        max_routes=20
    )

    strategies = create_strategies(

        routes=routes,

        graph=graph,

        nodes=nodes,

        demand=demand,

        target_production="PROD_C"
    )

    selected, optimizer = optimize_strategy(
        strategies
    )

    feasible = [
        strategy
        for strategy in strategies
        if strategy.feasible
    ]

    if feasible:

        assert selected is not None

        assert selected.feasible is True

        assert optimizer in [
            "Google OR-Tools",
            "Fallback"
        ]


def test_complete_recovery():

    result = run_recovery(

        failed_node="WH_B",

        target_production="PROD_C",

        target_store="STORE_D"
    )

    assert (
        result["failure"]["failed_node"]
        == "WH_B"
    )

    assert (
        result["target"]["production"]
        == "PROD_C"
    )

    assert (
        result["target"]["store"]
        == "STORE_D"
    )

    assert len(
        result["strategies"]
    ) > 0

    for strategy in result["strategies"]:

        assert (
            "WH_B"
            not in strategy["route"]
        )


def test_unknown_failure():

    nodes, edges, demand, failures = load_data()

    try:

        get_failure(
            failures,
            failure_id="UNKNOWN_FAILURE"
        )

        assert False

    except ValueError:

        assert True