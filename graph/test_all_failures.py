from graph.graph_builder import build_graph
from graph.failure_simulation import simulate_cascade


G = build_graph()

important_nodes = [
    node
    for node, data in G.nodes(data=True)
    if data["node_type"] != "customer"
]


print("\n========== RIPPLEXA CASCADE TEST ==========\n")

for node in important_nodes:

    result = simulate_cascade(G, node)

    assert node not in result["affected_nodes"]

    print(
        f"{node:8} | "
        f"Affected nodes: {len(result['affected_nodes']):2} | "
        f"Cascade paths: {len(result['cascade_paths']):2}"
    )

print("\nAll cascade tests passed!")
