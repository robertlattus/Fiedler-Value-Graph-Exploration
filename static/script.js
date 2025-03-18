let possibleEdges = [];
let selectedEdges = [];
let nodes = [];
let requiredToggles = 1;  // Number of toggles required to match target

function resetGraph() {
    requiredToggles = 1;  // Reset difficulty when node count changes
    initializeGraph();
}

function getEventListenerCount() {
    let graphDiv = document.getElementById("graph");
    return (graphDiv.__plotlyEventListeners || {}).plotly_click?.length || 0;
}

function initializeGraph() {
    console.log("🔄 Generating new graph... Current event listeners:", getEventListenerCount());

    let numNodes = document.getElementById("numNodes").value;

    fetch("/initialize_graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            graphType: "complete",
            numNodes: parseInt(numNodes),
            requiredToggles: requiredToggles // Ensure difficulty level is sent
        })
    })
    .then(response => response.json())
    .then(data => {
        possibleEdges = data.possibleEdges;
        selectedEdges = data.initialEdges || [];  // Ensure selectedEdges is initialized
        document.getElementById("targetValue").innerText = data.targetFiedlerValue;
        document.getElementById("currentValue").innerText = data.initialFiedlerValue; 
        document.getElementById("congratsMessage").innerText = "";
        document.getElementById("nextButton").disabled = true;  // Disable "Next" initially
        generateNodePositions();
        drawGraph();
    })
    .catch(error => console.error("Error initializing graph:", error));
}


function generateNextGraph() {
    if (requiredToggles < 3) {
        requiredToggles++;  
        initializeGraph();
    }
    
    if (requiredToggles === 3) {
	document.getElementById("congratsMessage").innerText = "Challenge Complete!";
        document.getElementById("nextButton").disabled = true;  // Disable after third iteration
    }
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
    let traces = [];

    if (!nodes.length || !possibleEdges.length) {
        console.error("Graph data is missing!"); // Debugging output
        return;
    }

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
            name: ""
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

    traces.push({
        x: nodes.map(n => n.x),
        y: nodes.map(n => n.y),
        mode: "markers",
        marker: { size: 20, color: "blue" },
        hoverinfo: "none",
        name: ""
    });

    let graphDiv = document.getElementById("graph");

    Plotly.newPlot(graphDiv, traces, {
        hovermode: "closest",
        xaxis: { showgrid: false, zeroline: false, visible: false },
        yaxis: { showgrid: false, zeroline: false, visible: false },
        clickmode: "event+select",
        showlegend: false
    }).then(() => {
        graphDiv.on("plotly_click", function (data) {
    if (data.points.length > 0) {
        data.points.forEach(point => {
            if (point.customdata) {
                let clickedEdge = point.customdata;
                let index = selectedEdges.findIndex(e => e[0] === clickedEdge[0] && e[1] === clickedEdge[1]);

                if (index === -1) {
                    selectedEdges.push(clickedEdge);
                } else {
                    selectedEdges.splice(index, 1);
                }

                // Update only the clicked edge instead of redrawing everything
                updateGraph();
            }
        });
    }
});

    });
}


function updateGraph() {
    console.log("🔍 updateGraph() called!");

    document.getElementById("currentValue").innerText = "Updating...";

    fetch("/update_graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edges: selectedEdges })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("currentValue").innerText = data.currentFiedlerValue;

        if (data.currentFiedlerValue == document.getElementById("targetValue").innerText) {
            document.getElementById("congratsMessage").innerText = "🎉 Congratulations! Press Next to continue.";
            document.getElementById("nextButton").disabled = false;  
        } else {
            document.getElementById("congratsMessage").innerText = "";
        } 
	drawGraph();
    })
    .catch(error => console.error("Error updating graph:", error));
}
