import networkx as nx


def simulate_cascade(G, failed_node):

    if failed_node not in G:
        return {
            "error": f"Node '{failed_node}' not found"
        }

    affected_nodes = []
    cascade_paths = []

    # Find every downstream node
    descendants = nx.descendants(G, failed_node)

    # Find paths from failed node to every affected node
    for node in descendants:

        paths = nx.all_simple_paths(
            G,
            source=failed_node,
            target=node
        )

        for path in paths:

            cascade_paths.append(path)

        affected_nodes.append(node)

    return {
        "failed_node": failed_node,
        "affected_nodes": affected_nodes,
        "cascade_paths": cascade_paths
    }


# Alias for backward compatibility
simulate_failure = simulate_cascade
