import networkx as nx
import pandas as pd


def build_graph():

    nodes_df = pd.read_csv("data/nodes.csv")
    edges_df = pd.read_csv("data/edges.csv")

    G = nx.DiGraph()

    # Add nodes
    for _, row in nodes_df.iterrows():

        G.add_node(
            row["node_id"],
            node_type=row["type"],
            name=row["name"],
            capacity=float(row["capacity"]),
            location=row["location"],
            reliability=float(row["reliability"])
        )

    # Add dependencies
    for _, row in edges_df.iterrows():

        G.add_edge(
            row["from_node"],
            row["to_node"],
            dependency_type=row["dependency_type"],
            strength=float(row["strength"]),
            lead_time_days=int(row["lead_time_days"])
        )

    return G


# Alias for backward compatibility
create_supply_chain_graph = build_graph
