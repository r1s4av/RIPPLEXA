from graph.graph_builder import create_supply_chain_graph


G = create_supply_chain_graph()

print("\n========== RIPPLEXA SUPPLY CHAIN GRAPH ==========\n")

print("Total nodes:", G.number_of_nodes())
print("Total edges:", G.number_of_edges())

print("\nNodes:\n")

for node, data in G.nodes(data=True):
    print(
        node,
        "|",
        data["node_type"],
        "|",
        data["name"],
        "| capacity:",
        data["capacity"],
        "| reliability:",
        data["reliability"]
    )

print("\nEdges:\n")

for source, target, data in G.edges(data=True):
    print(
        source,
        "->",
        target,
        "| type:",
        data["dependency_type"],
        "| strength:",
        data["strength"],
        "| lead time:",
        data["lead_time_days"]
    )
