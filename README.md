# LDAS
Logic Design and Simulation
## Usage
You can either open the [index file](/index.html) file in you local browser will all other files adjacent or use the [live page](https://james11t.github.io/LDAS/). It has been tested and should work on most if not all modern mainstream browsers.
## Page
The page consists of two main sections, the canvas area where the user will design and simulate the circuit, and the toolbox - where they select input element, logic gates, output elements and other tools and settings. The page should be somewhat responsive and should react well to minor changes to the viewport however the page is not designed to support mobile use.
## Simulation
During building of the circuit and after its build the program will simulate outputs and logic of the circuit unless paused by the user (see settings).
## Control / Input
### Switch
The switch is a simple toggle on off switch that is changes with a mouse click.
### Button
The button is a simple hold on button that outputs on while pressed and off while "unpressed". If the user moves their cursor while pressing the button, then the button will turn off.
### Clock
The clock will rotate by one of its eight phases every eight frames, if the clock points to the right then the input is toggled from on to off or off to on.
## Output
### Light
There are 4 types of lights, the standard yellow, red, blue and green. They simply turn on like a normal light bulb when given an on signal.
### Beeper
The beeper will play a beeping on and off sound while given an on signal.
### 4-Bit Display
The 4-bit display takes 4 inputs each representing a bit in a binary string that is converted to hex and output on the display with the value of the inputs ascending as you go down the inputs.
## Logic gates
All logic gates behave as standard logic gates with 2 inputs are expected to.
## Modes
There are 3 basic modes of usage, normal, wire and delete mode. In normal mode your clicks and mouse movements will be used to interact with the different parts of the circuit, like moving them around and toggling switches and buttons on and off. In wire mode the same actions as normal are possible but blue circles will outline where connections can be made, upon clicking one the user will start a wire which they can then link to another output or input depending on the initially selected node. Once one has been selected the blue rings will only appear on the nodes that are valid for the user to connect to. Finally, in delete mode upon clicking an element in the circuit weather it's an input or an output node or a logic gate or switch it ill delete the clicked element and remove any connections that either connected to the input or output selected or connected to the selected element.
## Settings
As of the latest release there are 4 settings options, load, save, snap to grid and pause/play. The save and load will be expanded upon in the next section. The snap to grid option will allow the user to snap all elements upon being moved to the nearest multiple of 6 in the x and y coordinate, if enabled then the button will show a closed lock atop of small grid and if disabled the previously mentioned lock will be open. The play pause button will perform as expected, upon being paused it will cause all on/off states to remain constant while switches and buttons can be turned on and off.
## Saving and Loading
If the user wishes to save their circuit, for either future use or to share it with others, they can do so using the save icon. Upon pressing the button, the program will generate a non cyclical object to represent all the elements and connections and stringify it into JSON. It will then be encoded into BASE64 and put into a LDAS file and the user will be prompted to save the file in a location of their choosing. If the user then wants to load another circuit from an LDAS file they can do so by pressing the upload button, they will then be prompted to upload an LDAS file. Upon being uploaded the program will decode the BASE64 into JSON, the JSON is then parsed into usable objects and added to the workspace.

