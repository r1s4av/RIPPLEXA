from graph.graph.graph_builder import build_graph as build_dependency_graph
from graph.graph.failure_simulation import simulate_cascade
from optimization.recovery import run_recovery


def run_ripplexa(failed_node):

    # --------------------------------------------------
    # 1. Build dependency graph
    # --------------------------------------------------

    graph = build_dependency_graph()

    # --------------------------------------------------
    # 2. Simulate cascading failure
    # --------------------------------------------------

    cascade_result = simulate_cascade(
        graph,
        failed_node
    )

    # Handle invalid node
    if "error" in cascade_result:
        return {
            "failed_node": failed_node,
            "error": cascade_result["error"]
        }

    # --------------------------------------------------
    # 3. Find recovery strategy
    # --------------------------------------------------

    recovery_result = run_recovery(
        failed_node=failed_node
    )

    # --------------------------------------------------
    # 4. Combine results
    # --------------------------------------------------

    return {
        "failed_node": failed_node,
        "cascade": cascade_result,
        "recovery": recovery_result
    }