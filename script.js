let possibleEdges = [];
let selectedEdges = [];
let nodes = [];

function initializeGraph() {
    let numNodes = document.getElementById("numNodes").value;

    fetch("/initialize_graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            graphType: "complete",
            numNodes: parseInt(numNodes)
        })
    })
    .then(response => response.json())
    .then(data => {
        possibleEdges = data.possibleEdges;
        selectedEdges = [];
        document.getElementById("targetValue").innerText = data.targetFiedlerValue;
        document.getElementById("currentValue").innerText = "0"; // Reset to 0
        document.getElementById("congratsMessage").innerText = ""; // Clear message
        generateNodePositions();
        drawGraph();
    });
}

function generateNodePositions() {
    let numNodes = document.getElementById("numNodes").value;
    nodes = Array.from({ length: numNodes }, (_, i) => ({
        id: i,
        x: Math.cos((2 * Math.PI * i) / numNodes),
        y: Math.sin((2 * Math.PI * i) / numNodes)
    }));
}

function drawGraph() {
    console.log("📌 drawGraph() called!");

    let traces = [];

    // Draw edges (solid or dashed)
    possibleEdges.forEach(edge => {
        let [source, target] = edge;
        let isSelected = selectedEdges.some(e => e[0] === source && e[1] === target);

        traces.push({
            x: [nodes[source].x, nodes[target].x],
            y: [nodes[source].y, nodes[target].y],
            mode: "lines",
            line: { dash: isSelected ? "solid" : "dot", width: 2, color: isSelected ? "black" : "gray" },
            hoverinfo: "none",
            customdata: [[source, target]],
            name: "" // Hides legend
        });

        // Compute midpoint
let midX = (nodes[source].x + nodes[target].x) / 2;
let midY = (nodes[source].y + nodes[target].y) / 2;

// Add slight variation while keeping the marker on the line
let offsetFactor = (Math.random() * 0.1 - 0.14); // Vary between -0.05 and 0.05
let dx = nodes[target].x - nodes[source].x;
let dy = nodes[target].y - nodes[source].y;
let length = Math.sqrt(dx * dx + dy * dy);

// Normalize direction vector and apply small offset along the line
let variedX = midX + offsetFactor * dx / length;
let variedY = midY + offsetFactor * dy / length;

traces.push({
    x: [variedX],
    y: [variedY],
    mode: "markers",
    marker: { size: 10, color: "gray", symbol: "diamond" },
    hoverinfo: "text",
    text: `Click to toggle edge: (${source}, ${target})`,
    customdata: [[source, target]]
});

    });

    // Draw nodes
    traces.push({
        x: nodes.map(n => n.x),
        y: nodes.map(n => n.y),
        mode: "markers",
        marker: { size: 20, color: "blue" },
        hoverinfo: "none",
        name: "" // Hides legend
    });

    let graphDiv = document.getElementById("graph");

    Plotly.newPlot(graphDiv, traces, {
        hovermode: "closest",
        xaxis: { showgrid: false, zeroline: false, visible: false },
        yaxis: { showgrid: false, zeroline: false, visible: false },
        clickmode: "event+select",
        showlegend: false // Removes "trace 0"
    }).then(() => {
        console.log("📌 Attaching click event to Plotly graph...");

        graphDiv.on("plotly_click", function (data) {
            console.log("🎯 Click detected on graph!");
            console.log("📝 Full click event data:", data);

            if (data.points.length > 0) {
                data.points.forEach(point => {
                    console.log("📌 Clicked Point:", point);
                    console.log("🔵 Clicked Edge Data (customdata):", point.customdata);

                    if (point.customdata && Array.isArray(point.customdata) && point.customdata.length === 2) {
                        let clickedEdge = point.customdata;

                        let index = selectedEdges.findIndex(e => e[0] === clickedEdge[0] && e[1] === clickedEdge[1]);

                        if (index === -1) {
                            console.log("✅ Selecting edge:", clickedEdge);
                            selectedEdges.push(clickedEdge);
                        } else {
                            console.log("❌ Deselecting edge:", clickedEdge);
                            selectedEdges.splice(index, 1);
                        }

                        updateGraph(clickedEdge);
                    } else {
                        console.error("❌ Error: Invalid edge format received:", point.customdata);
                    }
                });
            }
        });
    });
}


function updateGraph() {
    fetch("/update_graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edges: selectedEdges })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("currentValue").innerText = data.currentFiedlerValue;

        if (data.currentFiedlerValue == document.getElementById("targetValue").innerText) {
            document.getElementById("congratsMessage").innerText =
                "🎉 Congratulations! The Fiedler values match. Please choose a new graph.";
        } else {
            document.getElementById("congratsMessage").innerText = "";
        }

        drawGraph();
    });
}
