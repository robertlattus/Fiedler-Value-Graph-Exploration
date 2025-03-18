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

import gc
def compute_fiedler_value(G):
    """Computes the Fiedler value (2nd smallest eigenvalue of the Laplacian)."""
    if nx.number_of_edges(G) == 0:
        return 0  # No edges, Fiedler value is 0
    
    L = nx.laplacian_matrix(G).toarray()
    eigenvalues = np.linalg.eigvalsh(L)
    if len(eigenvalues) > 1:
        Fv = round(eigenvalues[1], 4)
    else:
        Fv = 0
    del L, eigenvalues
    gc.collect()
    return Fv

@app.route("/")
def index():
    """Renders the main HTML page."""
    return render_template("index.html")

@app.route("/initialize_graph", methods=["POST"])
def initialize_graph():
    """Handles graph initialization from the frontend."""
    global graph_type, num_nodes, edges, target_fiedler_value
    data = request.get_json()
    
    graph_type = data.get("graphType", "complete")
    num_nodes = data.get("numNodes", 5)
    required_toggles = data.get("requiredToggles", 1)  # Default to 1 if missing

    G = create_graph(graph_type, num_nodes)
    possible_edges = list(G.edges())

    # Ensure an initial graph where toggling 'required_toggles' edges will match the target
    temp_G = nx.Graph()
    temp_G.add_nodes_from(range(num_nodes))
    chosen_edges = random.sample(possible_edges, max(1, len(possible_edges) // 2))
    temp_G.add_edges_from(chosen_edges)
    
    # Compute a valid target Fiedler value
    while True:
        target_fiedler_value = compute_fiedler_value(temp_G)
        if target_fiedler_value > 0:
            break
    
    # Modify the graph to require exactly `required_toggles` edge changes
    initial_edges = chosen_edges[:]
    for _ in range(required_toggles):
        if initial_edges:
            initial_edges.pop()  # Remove edges to force the needed toggles
    new_G = nx.Graph()
    new_G.add_nodes_from(range(num_nodes))
    new_G.add_edges_from(initial_edges)

    return jsonify({
    	"possibleEdges": possible_edges,
    	"initialEdges": initial_edges,
    	"targetFiedlerValue": target_fiedler_value,
    	"initialFiedlerValue": compute_fiedler_value(new_G)  # Send the computed value
	})




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
