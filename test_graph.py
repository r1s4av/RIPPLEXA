from graph.graph_builder import create_supply_chain_graph
from graph.failure_simulation import simulate_failure


G = create_supply_chain_graph()

result = simulate_failure(G, "Supplier A")

print(result)
