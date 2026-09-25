import sys

# Ensure UTF-8 output on Windows terminals
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from graph.graph_builder import build_graph
from graph.failure_simulation import simulate_cascade


def print_cascade(result):

    print("\n========== RIPPLEXA CASCADE ==========\n")

    print("FAILED NODE:")
    print(f"🔴 {result['failed_node']}")

    cascade_paths = result.get("cascade_paths", [])
    max_depth = max((len(path) for path in cascade_paths), default=1) - 1 if cascade_paths else 0

    print(f"\nAffected nodes: {len(result['affected_nodes'])}")
    print(f"Propagation paths: {len(cascade_paths)}")
    print(f"Cascade depth: {max_depth} levels")

    print("\nAFFECTED NODES:")
    for node in result["affected_nodes"]:
        print(f"  → {node}")

    print("\nPROPAGATION PATHS:")
    for path in cascade_paths:
        print("  " + " → ".join(path))


def main():
    graph = build_graph()

    failed_node = input(
        "\nEnter failed component: "
    ).strip()

    result = simulate_cascade(
        graph,
        failed_node
    )

    if "error" in result:
        print(result["error"])
    else:
        print_cascade(result)


if __name__ == "__main__":
    main()
