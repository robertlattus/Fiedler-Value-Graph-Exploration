from flask import Flask, render_template, request, jsonify
import networkx as nx
import numpy as np
import random

app = Flask(__name__)

# Global variables to store graph state
graph_type = "complete"
num_nodes = 5
edges = []
target_fiedler_value = 0

def create_graph(graph_type, num_nodes):
    """Generates an initial graph based on the type selected by the user."""
    G = nx.Graph()
    G.add_nodes_from(range(num_nodes))

    if graph_type == "complete":
        G.add_edges_from([(i, j) for i in range(num_nodes) for j in range(i + 1, num_nodes)])
    elif graph_type == "cycle":
        G.add_edges_from([(i, (i + 1) % num_nodes) for i in range(num_nodes)])
    elif graph_type == "star":
        G.add_edges_from([(0, i) for i in range(1, num_nodes)])

    return G

def compute_fiedler_value(G):
    """Computes the Fiedler value (2nd smallest eigenvalue of the Laplacian)."""
    if nx.number_of_edges(G) == 0:
        return 0  # No edges, Fiedler value is 0
    
    L = nx.laplacian_matrix(G).toarray()
    eigenvalues = np.linalg.eigvalsh(L)
    return round(eigenvalues[1], 4) if len(eigenvalues) > 1 else 0

@app.route("/")
def index():
    """Renders the main HTML page."""
    return render_template("index.html")

@app.route("/initialize_graph", methods=["POST"])
def initialize_graph():
    """Handles graph initialization from the frontend."""
    global graph_type, num_nodes, edges, target_fiedler_value
    data = request.get_json()
    graph_type = data["graphType"]
    num_nodes = data["numNodes"]

    G = create_graph(graph_type, num_nodes)
    edges = []  # Start with no real edges
    possible_edges = list(G.edges())

    # Ensure the selected target Fiedler value is greater than 0
    while True:
        temp_G = nx.Graph()
        temp_G.add_nodes_from(range(num_nodes))
        chosen_edges = random.sample(possible_edges, max(1, len(possible_edges) // 2))
        temp_G.add_edges_from(chosen_edges)
        target_fiedler_value = compute_fiedler_value(temp_G)
        
        if target_fiedler_value > 0:
            break  # Only accept positive target Fiedler values

    return jsonify({"possibleEdges": possible_edges, "targetFiedlerValue": target_fiedler_value})


@app.route("/update_graph", methods=["POST"])
def update_graph():
    """Handles edge updates from the frontend."""
    global edges
    data = request.get_json()
    edges = [tuple(edge) for edge in data["edges"]]  # ✅ Store full updated edge list

    G = nx.Graph()
    G.add_nodes_from(range(num_nodes))
    G.add_edges_from(edges)
    fiedler_value = compute_fiedler_value(G)

    return jsonify({"currentFiedlerValue": fiedler_value})

if __name__ == "__main__":
    app.run(debug=True)
