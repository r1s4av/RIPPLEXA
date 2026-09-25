import json

from graph.graph_builder import create_supply_chain_graph
from graph.failure_simulation import simulate_failure


def main():

    G = create_supply_chain_graph()

    print("\nAvailable components:")

    for node in G.nodes:
        print("-", node)

    failed_node = input("\nEnter failed component: ").strip()

    result = simulate_failure(G, failed_node)

    print("\nSimulation Result:")
    print(json.dumps(result, indent=4))


if __name__ == "__main__":
    main()
