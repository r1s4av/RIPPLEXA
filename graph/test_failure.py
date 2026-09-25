import json

from graph.graph_builder import build_graph
from graph.failure_simulation import simulate_cascade


G = build_graph()

print("\nAvailable nodes:\n")

for node in G.nodes:
    print("-", node)


failed_node = input(
    "\nEnter failed component: "
).strip()


result = simulate_cascade(
    G,
    failed_node
)


print("\n========== CASCADE RESULT ==========\n")

print(
    json.dumps(
        result,
        indent=4
    )
)
