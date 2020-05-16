/*
        Circuit Design and Simulation
        By James Taylor
        Started 07/05/2020 14:44
        
        Time spent: > 10Hrs
        
        Notes:
         - First JavaScript project
         - Origionally tried making in Windows Form app but support for advanced rendering was minimal and slow
         - Fully functional and tested in Firefox 76.0.1, Brave 1.8.96, Chrome 81.0.4044.138 and Edge 44.18362.449.0
         - Partially functional in Internet Explorer 11.778.18362.0 due to CSS Grid not being fully supported in the standard way
         - Assumed not to be functional in Internet Explorer 9 due to a lack of support for modern technologies
*/

// Canvas stuff
var c = document.getElementById("MainCanvas");
var ctx = c.getContext("2d");
ctx.lineWidth = 3;
var cLeft = c.offsetLeft + c.clientLeft; // Set the canvas offsets
var cTop = c.offsetTop + c.clientTop;
var gridWidth = 6;

// User controls
var snapCheck = document.getElementById("gridSnap");
var wireButton = document.getElementById("wireButton");
var FPSSlider = document.getElementById("FPSSlider"); 
var FPSLabel = document.getElementById("FPSLabel");
var fileInput = document.getElementById("fileInput");

// Render stuff
var snapToGrid = false;
var offset = 20;
var imgx = 97; // Image sizes for hit detection
var imgy = 44; //
var interval = 50; // Set FPS timer
var gateImagesFN = ["ANDGATE.png", "ORGATE.png", "NOTGATE.png", "NANDGATE.png", "NORGATE.png", "XORGATE.png", "ONSWITCH.png", "OFFSWITCH.png", "ONBUTTON.png", "OFFBUTTON.png", "OFFLIGHT.png", "ONLIGHT.png", "NODEHIGHLIGHT.png"]
var gateImages = {};

// Mouse stuff
var lastKnownMousePos = {x: 0, y: 0}; // Track the mouse
var targetedElement; // Set if the user has mouse downed on a movable object
var selectedOffset;  // Set how far from top left corner of the targetedElement the user clicked
var wireEnabled = false; // To track wether the user is placing wires
var wireSelection = null;
var mouseWithoutMove = true; // Tracks wether the user has moved their mouse since the last mouse down

// Simulation stuff
var simulationPaused = false; // General circuit pause
var gates = [];
var connections = [];
var creationHistory = [];

for (var i = 0; i < gateImagesFN.length; ++i) {
    // Loads all of the file names into actual images for rendering
    gateImages[gateImagesFN[i]] = loadImage(gateImagesFN[i]);
}

function getConnectionFeeding(node) {
    // Gets the connections that ends at the given node
    for (var i = 0; i < connections.length; ++i) {
        var selectCon = connections[i];
        if (selectCon.toNode == node) {
            return selectCon;
        }
    }
}

function getFeedingConnections(node) {
    // Get all the connections that start at a given node
    var foundConnections = [];
    for (var i = 0; i < connections.length; ++i) {
        var selectCon = connections[i];
        if (selectCon.fromNode == node) {
            foundConnections.push(selectCon);
        }
    }
    return foundConnections;
}

function checkchange() {
    // Ran when the snap to grid check is altered
    snapToGrid = snapCheck.checked;
}

function array_move(arr, old_index, new_index) {
    // Move an element within an array to another point
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr;
};

function getMousePos(canvas, evt) {
    // Get the mouse position relative to the canvas from a click event
    var rect = canvas.getBoundingClientRect();
    return {x: evt.clientX - rect.left, y: evt.clientY - rect.top};
}

function getElementFromPoint(position) {
    // Gets the top most element that the position falls within
    var boxedElement = null;
    for (var i = 0; i < gates.length; ++i) {
        let gotGate = gates[i];
        let xbound = position.x - gotGate.position.x;
        let ybound = position.y - gotGate.position.y;
        if (xbound >= 0 && xbound <= imgx && ybound >= 0 && ybound <= imgy) {
            boxedElement = gotGate;
        }
    }
    return boxedElement;
}

function nodeIntersect(node, position) {
    // Checks if the position is on a given input or output node
    var nodeRoot = {x: node.parentNode.position.x + node.offset.x, y: node.parentNode.position.y + node.offset.y}
    var xdiff = position.x - (node.parentNode.position.x + node.offset.x);
    var ydiff = position.y - (node.parentNode.position.y + node.offset.y);
    return (xdiff >= 0 && xdiff <= 10 && ydiff >= 0 && ydiff <= 10);
}

function nearestInt(value, n) {
    // round the given value to the nearest n multiple
    return Math.round(value / n) * n;
}

c.onmousedown = function(evt) {
    var mousePos = getMousePos(c, evt);
    if (wireEnabled) {
        // Ran if the wire placement is enabled
        var onNode = null;
        for (var i = 0; i < gates.length; ++i) {
            // Iterate all gates
            var selectGate = gates[i];
            for (var x = 0; x < selectGate.inputs.length; ++x) {
                // Iterate all the gates inputs
                if (nodeIntersect(selectGate.inputs[x], mousePos)) {
                    // Check if the click position is within the given input
                    onNode = selectGate.inputs[x];
                }
            }
            for (var x = 0; x < selectGate.outputs.length; ++x) {
                // Iterate all the gates outputs
                if (nodeIntersect(selectGate.outputs[x], mousePos)) {
                    // Check if the click position is within the given output
                    onNode = selectGate.outputs[x];
                }
            }
        }
        if (onNode) {
            // If the user did click on an input or output
            if (wireSelection) {
                // Ran if the user has already selected the start point of a wire
                if (onNode.type != wireSelection.type) {
                    // Check if the user is connecting an input to an output
                    var newConnection;
                    if (wireSelection.type == "output") {
                        newConnection = new connection(wireSelection, onNode);
                    } else {
                        // Flip the order if the user started on an output
                        newConnection = new connection(onNode, wireSelection);
                    }
                    connections.push(newConnection);
                    creationHistory.push(newConnection);
                    wireSelection = null; // Reset the wire selection
                }
            } else {
                // If no input or output is selected then it is set
                wireSelection = onNode;
            }
        }
    } else {
        // Ran if the wire placement is not enabled
        mouseWithoutMove = true;
        targetedElement = getElementFromPoint(mousePos);
        if (targetedElement) {
            // Ran if the user has clicked on an element
            selectedOffset = {x: mousePos.x - targetedElement.position.x, y: mousePos.y - targetedElement.position.y}; // Track the point they clicked on
            array_move(gates, gates.indexOf(targetedElement), gates.length - 1) // Shift the element to the end of thr list
            if (targetedElement.mousedown) {
                // Run the elements mouse down event if it exists
                targetedElement.mousedown();
            }
        }
    }
}

c.onmouseup = function(evt) {
    var mousePos = getMousePos(c, evt);
    if (wireEnabled) {
        // Left incase i change the wires to drag between points
    } else {
        targetedElement = null;
        selectedOffset = null; // Reset the dragging data
        var mouseOver = getElementFromPoint(mousePos);
        if (mouseOver) {
            if (mouseOver.clickevent && mouseWithoutMove) {
                mouseOver.clickevent();
                // Run the click event if the element has one
            }
            if (mouseOver.mouseup) {
                mouseOver.mouseup();
                // Run the mouseup event if the element has one
            }
        }
    }
}

c.addEventListener("mousemove", function(evt) {
    mouseWithoutMove = false;
    var mousePosition = getMousePos(c, evt);
    lastKnownMousePos = mousePosition;
    if (targetedElement) {
        if (targetedElement.mouseup) {
            // Set buttons to off if the mouse is moved
            targetedElement.mouseup();
        }
        if (snapToGrid) {
            // Snap to the grid if its enabled
            targetedElement.position = {x: nearestInt(mousePosition.x - selectedOffset.x, gridWidth), y: nearestInt(mousePosition.y - selectedOffset.y, gridWidth)}
        } else {
            targetedElement.position = {x: mousePosition.x - selectedOffset.x, y: mousePosition.y - selectedOffset.y}
        }
    }
}, false);

function loadImage(fn) {
    // Load a given circuit part filename into a image object
    var img = new Image;
    img.src = "CircuitParts/" + fn;
    return img
}

function input(parentNode, offset) {
    // Used to connect the output of another gate to the parent node
    this.type = "input";
    this.parentNode = parentNode;
    this.state = false;
    this.offset = offset;
}

function output(parentNode, offset) {
    // Used to connect the output of the parent node to the input of another
    this.type = "output";
    this.parentNode = parentNode;
    this.state = false;
    this.offset = offset;
}

function connection(fromNode, toNode) {
    // Used to connect and input and an output
    this.type = "connection";
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.state = false;
}

function light(x, y) {
    // Used to visually display the output of a circuit
    this.type = "light";
    this.display = "OFFLIGHT.png";
    this.position = {x: x, y: y};
    this.inputs = [new input(this, {x: -3, y: 17})];
    this.outputs = [];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.logic = function () { if (this.inputs[0].state) {this.display = "ONLIGHT.png"} else {this.display = "OFFLIGHT.png"}};
}

function toggleSwitch(x, y) {
    // Basic user input for a togglable on and off
    this.type = "switch";
    this.display = "OFFSWITCH.png";
    this.position = {x: x, y: y};
    this.inputs = [];
    this.outputs = [new output(this, {x: 91, y: 17})];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.clickevent = function(){ 
        this.outputs[0].state = !this.outputs[0].state;
        if (this.outputs[0].state) {
            this.display = "ONSWITCH.png";
        } else {
            this.display = "OFFSWITCH.png";
        }
    }
    this.logic = function(){return true;}; // Placeholder to prevent error
}

function tempButton(x, y) {
    // User input that stays on while the mouse is pressed and stationary
    this.type = "button";
    this.display = "OFFBUTTON.png";
    this.position = {x: x, y: y};
    this.inputs = [];
    this.outputs = [new output(this, {x: 91, y: 17})];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.mousedown = function() {
        // Switch to the on state
        this.outputs[0].state = true;
        this.display = "ONBUTTON.png";
    }
    this.mouseup = function() {
        // Switch to the off state
        this.outputs[0].state = false;
        this.display = "OFFBUTTON.png";
    }
    this.logic = function(){return true;}; // Placeholder to prevent error
}

function andGate(x, y) {
    // Basic logical AND gate
    // A B Q
    // 0 0 0
    // 0 1 0
    // 1 0 0
    // 1 1 1
    this.type = "andGate";
    this.display = "ANDGATE.png";
    this.position = {x: x, y: y};
    this.inputs = [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})];
    this.outputs = [new output(this, {x: 91, y: 17})];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.logic = function(){ 
        this.outputs[0].state = this.inputs[0].state && this.inputs[1].state;
    };
}

function orGate(x, y) {
    // Basic logical OR gate
    // A B Q
    // 0 0 0
    // 0 1 1
    // 1 0 1
    // 1 1 1
    this.type = "orGate";
    this.display = "ORGATE.png";
    this.position = {x: x, y: y};
    this.inputs = [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})];
    this.outputs = [new output(this, {x: 91, y: 17})];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.logic = function(){ this.outputs[0].state = this.inputs[0].state || this.inputs[1].state};
}

function notGate(x, y) {
    // Basic logical OR gate
    // A Q
    // 0 1
    // 1 0
    this.type = "notGate";
    this.display = "NOTGATE.png";
    this.position = {x: x, y: y};
    this.inputs = [new input(this, {x: -3, y: 17})];
    this.outputs = [new output(this, {x: 91, y: 17})];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.logic = function(){ this.outputs[0].state = !this.inputs[0].state};
}

function nandGate(x, y) {
    // Basic logical OR gate
    // A B Q
    // 0 0 1
    // 0 1 1
    // 1 0 1
    // 1 1 0
    this.type = "nandGate";
    this.display = "NANDGATE.png";
    this.position = {x: x, y: y};
    this.inputs = [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})];
    this.outputs = [new output(this, {x: 91, y: 17})];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.logic = function(){ this.outputs[0].state = !(this.inputs[0].state && this.inputs[1].state) };
}

function norGate(x, y) {
    // Basic logical OR gate
    // A B Q
    // 0 0 1
    // 0 1 0
    // 1 0 0
    // 1 1 0
    this.type = "norGate";
    this.display = "NORGATE.png";
    this.position = {x: x, y: y};
    this.inputs = [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})];
    this.outputs = [new output(this, {x: 91, y: 17})];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.logic = function(){ this.outputs[0].state = !(this.inputs[0].state || this.inputs[1].state)};
}

function xorGate(x, y) {
    // Basic logical OR gate
    // A B Q
    // 0 0 0
    // 0 1 1
    // 1 0 1
    // 1 1 0
    this.type = "xorGate";
    this.display = "XORGATE.png";
    this.position = {x: x, y: y};
    this.inputs = [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})];
    this.outputs = [new output(this, {x: 91, y: 17})];
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
    this.logic = function(){ this.outputs[0].state = (this.inputs[0].state || this.inputs[1].state) && !((this.inputs[0].state && this.inputs[1].state))};
}

function createGate(type, position = null) {
    // Create an instance of the given type
    let newGate;
    if (position) {
        newGate = new window[type](position.x, position.y); // Bit hacky but works
    } else {
        newGate = new window[type](offset, offset); // Bit hacky but works
    }
    creationHistory.push(newGate);
    gates.push(newGate);
}

function drawLine(ax, ay, bx, by, color) {
    // Draw a basic line from point (ax, ay) to (bx, by)
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    var midPoint = {x: Math.floor((ax + bx) / 2), y: Math.floor((ay + by) / 2)};
    ctx.bezierCurveTo(midPoint.x, ay, midPoint.x, by, bx, by);
    ctx.stroke();
}

function drawImage(gatein) {
    // Draw the image that correlates to the given logic gate
    ctx.drawImage(gateImages[gatein.display], gatein.position.x, gatein.position.y);
}

function drawRing(node) {
    // Decide wether the given input or output node should have a ring and then draw other
    var gate = node.parentNode;
    if (node.type == "input") {
        var connectionNode = getConnectionFeeding(node);
        if (connectionNode) {
            // Dont draw if the input node is already used
            return;
        }
    }
    if (wireSelection) {
        if (wireSelection.type == node.type) {
            // Dont draw if the node type is the same as the start node if its selected
            return;
        }
    }
    ctx.drawImage(gateImages["NODEHIGHLIGHT.png"], gate.position.x + node.offset.x, gate.position.y + node.offset.y);
}

function wirePress() {
    // Ran when the wire button is pressed
    targetedElement = null;
    wireEnabled = !wireEnabled;
    if (wireEnabled) {
        // Add the active class to the button to visiually show the wire mode is active
        wireButton.classList.add("activeBtn");
    } else {
        // Remove the active class to the button to visiually show the wire mode is no longer active
        wireButton.classList.remove("activeBtn");
        wireSelection = null;
    }
}

function resetBoard() {
    // Clear the board and reset the wire selection
    wireSelection = null;
    gates = [];
    connections = [];
}

function clearCanvas() {
    // Clear all images from the canvas
    ctx.clearRect(0, 0, c.width, c.height);
}

function checkSelfConnections(checkGate) { // TODO: Make this work
    checkGate.selfInputsProcessed = true;
    for (var i = 0; i < checkGate.inputs.length; ++i) {
        var toCon = getConnectionFeeding(checkGate.inputs[i]);
        if (toCon) {
            if (toCon.fromNode.parentNode == checkGate) {
                // Self linked gate being toggled
                checkGate.inputs[i].state = toCon.fromNode.state;
                console.log("Setting input state to " + toCon.fromNode.state.toString());
                checkGate.inputsProcessed += 1;
            }
        }
    }
}

function renderLoop() {
    if (!wireEnabled && !simulationPaused) {
        // Reset all nodes and connections
        for (var i = 0; i < gates.length; ++i) {
            var selectGate = gates[i];
            /*for (var k = 0; k < selectGate.inputs; ++k) {
                selectGate.inputs[k].state = false;
            }
            for (var k = 0; k < selectGate.outputs; ++k) {
                selectGate.outputs[k].state = false;
            }*/
            selectGate.inputsProcessed = 0;
            selectGate.selfInputsProcessed = false;
            selectGate.logic();
        }
        
        // Disable all connections
        for (var i = 0; i < connections.length; ++i) {
            connections[i].state = false;
        }
        
        // Process logic
        var visitedNodes = [];
        for (var i = 0; i < gates.length; ++i) {
            // Start with all input nodes
            var selectGate = gates[i];
            if (selectGate.type == "switch" || selectGate.type == "button") {
                visitedNodes.push(selectGate);
            }
        }
        
        while (visitedNodes.length > 0) {
            var doneNodes = [];
            var passIncremented = false;
            for (var i = 0; i < visitedNodes.length; ++i) {
                // Process all the logic for the nodes
                var selectNode = visitedNodes[i];
                if (!selectNode.selfInputsProcessed) {
                    checkSelfConnections(selectNode);
                }
                if (selectNode.inputsProcessed >= selectNode.inputs.length) {
                    // Ran if all of the inputs for the node has been processed
                    passIncremented = true;
                    doneNodes.push(i); // Used to remove the node from the need to process node list
                    selectNode.logic();
                    for (var x = 0; x < selectNode.outputs.length; ++x) {
                        var selectOutput = selectNode.outputs[x];
                        var conns = getFeedingConnections(selectOutput);
                        // Get the connections that the output of the node feeds
                        for (var x = 0; x < conns.length; ++x) {
                            // Iterate all the connections
                            var conn = conns[x];
                            if (selectOutput.state) {
                                // Set the connection state to on
                                conn.state = true;
                                conn.toNode.state = true;
                            } else {
                                // Set the connections state to off
                                conn.state = false;
                                conn.toNode.state = false;
                            }
                            if (visitedNodes.indexOf(conn.toNode.parentNode) < 0) {
                                // Ran if the new gate isnt in the need to process list
                                visitedNodes.push(conn.toNode.parentNode);
                            }
                            conn.toNode.parentNode.inputsProcessed += 1; // Increment the process counter for the inputs
                        }
                    }
                }
            }
            for (var i = 0; i < doneNodes.length; ++i) {
                // Remove all proccessed nodes from the to process list
                visitedNodes.splice(doneNodes[i], 1);
            }
            if (!passIncremented) {
                // Break if the pass resulted in no calculations meaning that all viable connections have been proccessed
                break;
            }
        }
    }
    
    clearCanvas(); // Clear the canvas for render
    
    for (var i = 0; i < gates.length; ++i) {
        // Iterate all the logic gates that need to be rendered
        var selectGate = gates[i];
        drawImage(selectGate);
        if (wireEnabled) {
            // Draw rings around the nodes inputs and outputs if needed
            for (var x = 0; x < selectGate.inputs.length; ++x) {
                drawRing(selectGate.inputs[x]);
            }
            for (var x = 0; x < selectGate.outputs.length; ++x) {
                drawRing(selectGate.outputs[x]);
            }
        }
    }
    
    for (var i = 0; i < connections.length; ++i) {
        // Iterate all connections
        var selectCon = connections[i];
        var fromPoint = {x: selectCon.fromNode.parentNode.position.x + selectCon.fromNode.offset.x + 5, y: selectCon.fromNode.parentNode.position.y + selectCon.fromNode.offset.y + 5};
        var toPoint = {x: selectCon.toNode.parentNode.position.x + selectCon.toNode.offset.x + 5, y: selectCon.toNode.parentNode.position.y + selectCon.toNode.offset.y + 5};
        if (selectCon.state) {
            // Draw green line for active connection
            drawLine(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y, "#0F0");
        } else {
            // Draw black line for inactive connection
            drawLine(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y, "#000");
        }
    }
    
    if (wireSelection) {
        // Draw a line from the selected node to the mouse pointer if set
        var selectionPos = {x: wireSelection.parentNode.position.x + wireSelection.offset.x + 5, y: wireSelection.parentNode.position.y + wireSelection.offset.y + 5}
        drawLine(selectionPos.x, selectionPos.y, lastKnownMousePos.x, lastKnownMousePos.y);
    }
    
    setTimeout(renderLoop, interval); // Render again
}

function sliderUpdate() {
    // Ran when the FPS slider is changed to update the timer interval to run at the selected frame rate
    FPSLabel.innerHTML = FPSSlider.value + " FPS"; // Update the label
    interval = Math.floor(1000 / FPSSlider.value);
}

function dumpAll() {
    // Convert all the gates and connections into non cyclical objects in JSON and encoded in BASE64
    var gateList = [];
    var connectionList = [];
    for (var i = 0; i < gates.length; ++i) {
        var gateGet = gates[i];
        gateList.push({type: gateGet.type, x: gateGet.position.x, y: gateGet.position.y}) // Add a gate with nececarry data
        for (var x = 0; x < gateGet.inputs.length; ++x) {
            // Iterate the gates inputs
            var getInp = gateGet.inputs[x];
            var conn = getConnectionFeeding(getInp);
            if (conn) {
                connectionList.push({toNode: i, toNodeChild: gateGet.inputs.indexOf(getInp), fromNode: gates.indexOf(conn.fromNode.parentNode), fromNodeChild: conn.fromNode.parentNode.outputs.indexOf(conn.fromNode)});
            }
        }
    }
    return btoa(JSON.stringify([gateList, connectionList])); // Convert to BASE64
}

function loadAll(loadString) {
    resetBoard();
    try {
        var jsonObject = JSON.parse(atob(loadString));
        var getGates = jsonObject[0];
        var getConnections = jsonObject[1];
        
        for (var i = 0; i < getGates.length; ++i) {
            var gateData = getGates[i];
            // Switch out the invalid accessors with valid ones
            if (gateData.type == "switch") {
                gateData.type = "toggleSwitch";
            } else if (gateData.type == "button") {
                gateData.type = "tempButton";
            }
            var newGate = createGate(gateData.type, {x: gateData.x, y: gateData.y});
        }
        
        for (var i = 0; i < getConnections.length; ++i) {
            var conn = getConnections[i];
            var newConnection = new connection(gates[conn.fromNode].outputs[conn.fromNodeChild], gates[conn.toNode].inputs[conn.toNodeChild]);
            connections.push(newConnection);
        }
    } catch (error) {
        console.error("Invalid LDAS file");
    }
}

function saveCircuit() {
    var blob = new Blob([dumpAll()], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "circuit.ldas");
}

function fileUploaded() {
    var read = new FileReader();

    read.readAsText(fileInput.files[0]);

    read.onloadend = function(){
        loadAll(read.result);
    }
}

function undoCreation() {
    // Remove the latest gate or connection the user made
    if (creationHistory.length > 0) {
        var latestModification = creationHistory[creationHistory.length - 1];
        if (latestModification.type == "connection") {
            // Remove a connection
            connections.splice(connections.indexOf(latestModification), 1);
        } else {
            // Remove a gate
            gates.splice(gates.indexOf(latestModification), 1);
        }
    }
    creationHistory.splice(creationHistory.length -1, 1); // Remove from the creation history
}

sliderUpdate();
checkchange();
FPSSlider.oninput = sliderUpdate;

setTimeout(renderLoop, interval); // Start render loop
