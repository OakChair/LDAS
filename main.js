/*
        Circuit Design and Simulation
        By James Taylor
        Started 07/05/2020 14:44
        
        Time spent: > 30Hrs
        
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
var cLeft = c.offsetLeft + c.clientLeft; // Set the canvas offsets
var cTop = c.offsetTop + c.clientTop;
var gridWidth = 6;

// DOM elements
var fromId = (x) => document.getElementById(x);
var snapCheck = fromId("gridSnap");
var wireButton = fromId("wireButton");
var fileInput = fromId("fileInput");
var pausePlayBtn = fromId("pausePlayBtn");
var gridLockBtn = fromId("gridLockBtn");
var uploadImage = fromId("uploadImage");
var customUploader = fromId("customUploader");

// Render stuff
var cats = [];
var toolsets = [];
var snapToGrid = true;
var offset = 24;
var imgx = 97; // Image sizes for hit detection
var imgy = 44; //
var interval = 10; // Set FPS timer
var gateImagesFN = ["ANDGATE.png", "ORGATE.png", "NOTGATE.png", "NANDGATE.png", "NORGATE.png", "XORGATE.png", "ONSWITCH.png", "OFFSWITCH.png", "ONBUTTON.png", "OFFBUTTON.png", "OFFLIGHT.png", "ONLIGHT.png", "NODEHIGHLIGHT.png", "DISPLAY.png", "CLOCKP1.png", "CLOCKP2.png", "CLOCKP3.png", "CLOCKP4.png", "CLOCKP5.png", "CLOCKP6.png", "CLOCKP7.png", "CLOCKP8.png", "BUZZER.png", "REDLIGHT.png", "GREENLIGHT.png", "BLUELIGHT.png"];
var gateImages = {};
var modeIndent = 130;
var modeHeight = 25;

// Mouse stuff
var lastKnownMousePos = {x: 0, y: 0}; // Track the mouse
var targetedElement; // Set if the user has mouse downed on a movable object
var selectedOffset;  // Set how far from top left corner of the targetedElement the user clicked
var wireEnabled = false; // To track wether the user is placing wires
var wireSelection = null;
var mouseWithoutMove = true; // Tracks wether the user has moved their mouse since the last mouse down

// Simulation stuff
var simulationPaused = false; // General circuit pause
var deleteEnable = false;
var gates = [];
var connections = [];
var actionHistory = [];

// Initialising HTML stuff
uploadImage.ondragstart = function() { return false; };

customUploader.addEventListener("mousedown", function(){ 
    customUploader.classList.add("buttonDown");
});

function buttonUnPress() {
    customUploader.classList.remove("buttonDown");
}

customUploader.addEventListener("mouseup", buttonUnPress);
customUploader.addEventListener("mouseleave", buttonUnPress);

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

for (var i = 1; i < 6; ++i) {
    var getCat = document.getElementById("cat" + i.toString());
    let thisCat = i;
    getCat.addEventListener("click", function(){
        catClick(thisCat);
    });
    cats.push(getCat);
}

for (var i = 1; i < 6; ++i) {
    var getTs = document.getElementById("ts" + i.toString());
    toolsets.push(getTs);
}

function catClick(catNumber) {
    // Called when a category is clicked on
    for (var i = 0; i < cats.length; ++i) {
        cats[i].classList.remove("activeCat");
    }
    cats[catNumber - 1].classList.add("activeCat");
    for (var i = 0; i < toolsets.length; ++i) {
        toolsets[i].classList.remove("activeToolset");
    }
    toolsets[catNumber - 1].classList.add("activeToolset");
}

function snapChange() {
    // Called when snap to grid id toggled on or off
    snapToGrid = !snapToGrid;
    if (snapToGrid) {
        gridLockBtn.classList.add("gridLocked");
        gridLockBtn.classList.remove("gridUnlocked");
    } else {
        gridLockBtn.classList.add("gridUnlocked");
        gridLockBtn.classList.remove("gridLocked");
    }
}

function pausePlay() {
    // Called when the simulation is paused or played
    simulationPaused = !simulationPaused;
    if (simulationPaused) {
        pausePlayBtn.classList.add("playBtn");
        pausePlayBtn.classList.remove("pauseBtn");
    } else {
        pausePlayBtn.classList.add("pauseBtn");
        pausePlayBtn.classList.remove("playBtn");
    }
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

function getClickContext(mousePos) {
    var getElement = getElementFromPoint(mousePos);
    
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
        return onNode;
    } else {
        return getElement;
    }
}

function connectionClean(conn) {
    conn.toNode.state = false;
    connections.splice(connections.indexOf(conn), 1);
}

c.onmousedown = function(evt) {
    var mousePos = getMousePos(c, evt);
    var clickContext = getClickContext(mousePos);
    if (!clickContext) { return; }
    if (clickContext.type == "output" || clickContext.type == "input") {
        if (wireEnabled) {
            // If the user did click on an input or output
            if (wireSelection) {
                // Ran if the user has already selected the start point of a wire
                if (clickContext.type != wireSelection.type) {
                    // Check if the user is connecting an input to an output
                    if (clickContext.type == "input" && getConnectionFeeding(clickContext)) {
                        return;
                    }
                    
                    var newConnection;
                    if (wireSelection.type == "output") {
                        newConnection = new connection(wireSelection, clickContext);
                    } else {
                        // Flip the order if the user started on an output
                        newConnection = new connection(clickContext, wireSelection);
                    }
                    connections.push(newConnection);
                    actionHistory.push(newConnection);
                    wireSelection = null; // Reset the wire selection
                }
            } else {
                // If no input or output is selected then it is set
                if (clickContext.type == "input" && getConnectionFeeding(clickContext)) {
                    return;
                }
                wireSelection = clickContext;
            }
        } else if (deleteEnable) {
            if (clickContext.type == "output" ) {
                var outFed = getFeedingConnections(clickContext);
                for (var i = 0; i < outFed.length; ++i) {
                    connectionClean(outFed[i]);
                }
            } else {
                var getConn = getConnectionFeeding(clickContext);
                if (getConn) {
                    connectionClean(getConn);
                }
            }
        }
    } else {
        if (deleteEnable) {
            for (var i = 0; i < clickContext.inputs.length; ++i) {
                var getFeeder = getConnectionFeeding(clickContext.inputs[i]);
                if (getFeeder) {
                    connectionClean(getFeeder);
                }
            }
            for (var i = 0; i < clickContext.outputs.length; ++i) {
                var deadConns = getFeedingConnections(clickContext.outputs[i]);
                for (var x = 0; x < deadConns.length; ++x) {
                    connectionClean(deadConns[x]);
                }
            }
            gates.splice(gates.indexOf(clickContext), 1);
        } else {
            // Ran if the wire placement is not enabled
            mouseWithoutMove = true;
            targetedElement = clickContext;
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
    targetedElement = null;
    selectedOffset = null; // Reset the dragging data
    var mouseOver = getClickContext(mousePos);
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

function gate(type, display, position, inputs, outputs) {
    this.type = type;
    this.display = display;
    this.position = position;
    this.inputs = inputs;
    this.outputs = outputs;
    this.inputsProcessed = 0;
    this.selfInputsProcessed = false;
}

function light(x, y) {
    // Used to visually display the output of a circuit
    gate.call(this, "light", "OFFLIGHT.png", {x: x, y: y}, [new input(this, {x: -3, y: 17})], []);
    this.logic = function () { if (this.inputs[0].state) {this.display = "ONLIGHT.png"} else {this.display = "OFFLIGHT.png"}};
}

function redLight(x, y) {
    // Used to visually display the output of a circuit
    gate.call(this, "redLight", "OFFLIGHT.png", {x: x, y: y}, [new input(this, {x: -3, y: 17})], []);
    this.logic = function () { if (this.inputs[0].state) {this.display = "REDLIGHT.png"} else {this.display = "OFFLIGHT.png"}};
}

function greenLight(x, y) {
    // Used to visually display the output of a circuit
    gate.call(this, "greenLight", "OFFLIGHT.png", {x: x, y: y}, [new input(this, {x: -3, y: 17})], []);
    this.logic = function () { if (this.inputs[0].state) {this.display = "GREENLIGHT.png"} else {this.display = "OFFLIGHT.png"}};
}

function blueLight(x, y) {
    // Used to visually display the output of a circuit
    gate.call(this, "blueLight", "OFFLIGHT.png", {x: x, y: y}, [new input(this, {x: -3, y: 17})], []);
    this.logic = function () { if (this.inputs[0].state) {this.display = "BLUELIGHT.png"} else {this.display = "OFFLIGHT.png"}};
}

function toggleSwitch(x, y) {
    // Basic user input for a togglable on and off
    gate.call(this, "switch", "OFFSWITCH.png", {x: x, y: y}, [], [new output(this, {x: 91, y: 17})]);
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
    gate.call(this, "button", "OFFBUTTON.png", {x: x, y: y}, [], [new output(this, {x: 91, y: 17})]);
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

function clock(x, y) {
    // Runs every 64 frames
    gate.call(this, "clock", "CLOCKP1.png", {x: x, y: y}, [], [new output(this, {x: 91, y: 17})]);
    this.renderCount = 0;
    this.clockcount = 1;
    this.renderLimit = 8;
    this.logic = function() {
        this.renderCount++
        if (this.renderCount % this.renderLimit == 0) {
            this.clockcount++;
        }
        if (this.clockcount > 8) {
            this.clockcount = 1;
            this.renderCount = 1;
            this.outputs[0].state = !this.outputs[0].state;
        }
        this.display = "CLOCKP" + this.clockcount.toString() + ".png";
    }
}

function beeper(x, y) {
    // Plays a short tone while powered
    gate.call(this, "beeper", "BUZZER.png", {x: x, y: y}, [new input(this, {x: -3, y: 17})], []);
    this.audioLooped = false;
    this.buzzerSound = new Audio("Sounds/BUZZER.wav");
    this.buzzerSound.loop = true;
    this.logic = function() { 
        if (this.inputs[0].state) {
            if (!this.audioLooped) {
                this.audioLooped = true;
                this.buzzerSound.currentTime = 0;
                this.buzzerSound.play();
            }
        } else {
            this.audioLooped = false;
            this.buzzerSound.pause();
        }
    }
    this.onDelete = function() {
        this.audioLooped = false;
        this.buzzerSound.pause();
    }
}

function andGate(x, y) {
    // Basic logical AND gate
    // A B Q
    // 0 0 0
    // 0 1 0
    // 1 0 0
    // 1 1 1
    gate.call(this, "andGate", "ANDGATE.png", {x: x, y: y}, [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})], [new output(this, {x: 91, y: 17})]);
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
    gate.call(this, "orGate", "ORGATE.png", {x: x, y: y}, [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})], [new output(this, {x: 91, y: 17})]);
    this.logic = function(){ this.outputs[0].state = this.inputs[0].state || this.inputs[1].state};
}

function notGate(x, y) {
    // Basic logical OR gate
    // A Q
    // 0 1
    // 1 0
    gate.call(this, "notGate", "NOTGATE.png", {x: x, y: y}, [new input(this, {x: -3, y: 17})], [new output(this, {x: 91, y: 17})]);
    this.logic = function(){ this.outputs[0].state = !this.inputs[0].state};
}

function nandGate(x, y) {
    // Basic logical OR gate
    // A B Q
    // 0 0 1
    // 0 1 1
    // 1 0 1
    // 1 1 0
    gate.call(this, "nandGate", "NANDGATE.png", {x: x, y: y}, [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})], [new output(this, {x: 91, y: 17})]);
    this.logic = function(){ this.outputs[0].state = !(this.inputs[0].state && this.inputs[1].state) };
}

function norGate(x, y) {
    // Basic logical OR gate
    // A B Q
    // 0 0 1
    // 0 1 0
    // 1 0 0
    // 1 1 0
    gate.call(this, "norGate", "NORGATE.png", {x: x, y: y}, [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})], [new output(this, {x: 91, y: 17})]);
    this.logic = function(){ this.outputs[0].state = !(this.inputs[0].state || this.inputs[1].state)};
}

function xorGate(x, y) {
    // Basic logical OR gate
    // A B Q
    // 0 0 0
    // 0 1 1
    // 1 0 1
    // 1 1 0
    gate.call(this, "xorGate", "XORGATE.png", {x: x, y: y}, [new input(this, {x: -3, y: 7}), new input(this, {x: -3, y: 27})], [new output(this, {x: 91, y: 17})]);
    this.logic = function(){ this.outputs[0].state = (this.inputs[0].state || this.inputs[1].state) && !((this.inputs[0].state && this.inputs[1].state))};
}

function display(x, y) {
    // Four bit hex output
    gate.call(this, "display", "DISPLAY.png", {x: x, y: y}, [new input(this, {x: -3, y: 2}), new input(this, {x: -3, y: 12}), new input(this, {x: -3, y: 22}), new input(this, {x: -3, y: 32})], []);
    this.displayOutput = "";
    this.logic = function() {
        var binaryCount = 0;
        for (var i = 0; i < this.inputs.length; ++i) {
            if (this.inputs[i].state) {
                binaryCount += Math.pow(2, i);
            }
        }
        this.displayOutput = binaryCount.toString(16).toUpperCase();
    };
}

function createGate(gtype, position = null) {
    // Create an instance of the given type
    let newGate;
    if (position) {
        newGate = new window[gtype](position.x, position.y); // Bit hacky but works
    } else {
        newGate = new window[gtype](offset, offset); // Bit hacky but works
    }
    actionHistory.push(newGate);
    gates.push(newGate);
}

function drawLine(ax, ay, bx, by, color) {
    // Draw a bezier curve from point (ax, ay) to (bx, by)
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
    if (gatein.type == "display") {
        ctx.fillText(gatein.displayOutput, gatein.position.x + 38, gatein.position.y + 35);
    }
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
    deleteEnable = false;
    targetedElement = null;
    wireSelection = null;
    wireEnabled = !wireEnabled;
}

function resetBoard() {
    // Clear the board and reset the wire selection
    wireSelection = null;
    for (var i = 0; i < gates.length; ++i) {
        var getGate = gates[i];
        if (getGate.onDelete) {
            getGate.onDelete();
        }
    }
    gates = [];
    connections = [];
}

function clearCanvas() {
    // Clear all images from the canvas
    ctx.clearRect(0, 0, c.width, c.height);
}

function checkSelfConnections(checkGate) {
    checkGate.selfInputsProcessed = true;
    for (var i = 0; i < checkGate.inputs.length; ++i) {
        var toCon = getConnectionFeeding(checkGate.inputs[i]);
        if (toCon) {
            if (toCon.fromNode.parentNode == checkGate) {
                // Self linked gate being toggled
                checkGate.inputs[i].state = toCon.fromNode.state;
                checkGate.inputsProcessed += 1;
            }
        }
    }
}

function renderLoop() {
    var canvasSize = c.getBoundingClientRect();
    c.width = canvasSize.width;
    c.height = canvasSize.height;
    ctx.lineWidth = 3;
    ctx.font = "38px Tahoma";
    if (!simulationPaused) {
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
            if (selectGate.type == "switch" || selectGate.type == "button" || selectGate.type == "clock") {
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
    
    if (wireSelection) {
        // Draw a line from the selected node to the mouse pointer if set
        var selectionPos = {x: wireSelection.parentNode.position.x + wireSelection.offset.x + 5, y: wireSelection.parentNode.position.y + wireSelection.offset.y + 5}
        drawLine(selectionPos.x, selectionPos.y, lastKnownMousePos.x, lastKnownMousePos.y);
    }
    
    ctx.font = "20px Tahoma";
    topl = canvasSize.width - modeIndent;
    ctx.fillText("Mode: ", topl, modeHeight);
    if (wireEnabled) {
        ctx.fillStyle = "blue";
        ctx.fillText("wire", topl + 60, modeHeight);
    } else if (deleteEnable) {
        ctx.fillStyle = "red";
        ctx.fillText("delete", topl + 60, modeHeight);
    } else {
        ctx.fillText("normal", topl + 60, modeHeight);
    }
    
    setTimeout(renderLoop, interval); // Render again
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
    // Compile the circuit data into utf-8 byte data for a file
    var blob = new Blob([dumpAll()], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "circuit.ldas");
}

function fileUploaded() {
    // Read data from an uploaded file
    var read = new FileReader();

    read.readAsText(fileInput.files[0]);

    read.onloadend = function(){
        loadAll(read.result);
    }
}

function undoCreation() {
    // Remove the latest gate or connection the user made
    if (actionHistory.length > 0) {
        var latestModification = actionHistory[actionHistory.length - 1];
        if (latestModification.type == "connection") {
            // Remove a connection
            connectionClean(latestModification);
        } else {
            // Remove a gate
            if (latestModification.onDelete) {
                latestModification.onDelete();
            }
            gates.splice(gates.indexOf(latestModification), 1);
        }
    }
    actionHistory.splice(actionHistory.length -1, 1); // Remove from the creation history
}

function deletePress() {
    deleteEnable = !deleteEnable;
    wireEnabled = false;
    wireSelection = null;
}

setTimeout(renderLoop, interval); // Start render loop
