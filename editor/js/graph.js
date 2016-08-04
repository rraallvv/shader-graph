(function(){

var ignoreConnectionEvents = false;
var batchRender = false;

Editor.polymerElement({
	properties: {
		scale: {
			type: Number,
			value: 1
		}
	},
	ready: function(){
		this._t = {sx: 1, sy: 1, tx: 0, ty: 0};
		this.state = {
			links: [],
			nodes: []
		};
		this.$.template.addEventListener("dom-change", this.domChange.bind(this));
	},
	addNode: function(e) {
		var b = graph.querySelector("#canvas").getBoundingClientRect();
		var pos = e.pos || [0, 0];
		pos[0] -= b.left;
		pos[1] -= b.top;
		pos[0] /= this._t.sx;
		pos[1] /= this._t.sy;
		e.pos = pos;
		this._addNode(e);
	},
	resize: function(w, h) {
		if (w && h) {
			this.style.width = w;
			this.style.height = h;
		}
	},
	setTransform: function( sx, sy, tx, ty ){
		tx = Math.round(tx + 0.5 * this.offsetWidth * (sx - 1));
		ty = Math.round(ty + 0.5 * this.offsetHeight * (sy - 1));
		this._t.sx = sx;
		this._t.sy = sy;
		this._t.tx = tx;
		this._t.ty = ty;
		// sx = 1, sy = 1, tx = 0, ty = 0;
		this.$.canvas.style.transform = "matrix(" +
			sx + ", 0, 0, " +
			sy + ", " +
			tx + ", " +
			ty + ")";
		this.scale = sx;
	},
	attached: function() {
		this._attachedDeferred();
	},
	_attachedDeferred: function() {
		if (!document.contains(this) || !this.offsetParent) {
			setTimeout(function(){
				this._attachedDeferred();
			}.bind(this), 100);
			return;
		}

		// Connect initial links
		this.initialize();

		console.log('Graph editor ready');

		if (this.onReady) {
			this.onReady();
		}
	},
	initialize: function(){
		batchRender = true;

		// Find the main node
		var fragColorNodeData = this.state.nodes.find(function(node){
			return node.type === 'fragColor';
		});

		this.shader = new ShaderGraph.GraphShader({
			fragMainNode: new ShaderGraph.FragColorNode({
				id: fragColorNodeData && fragColorNodeData.id
			})
		});

		// Add the main node
		this._addNode({
			type: ShaderGraph.FragColorNode.type,
			pos: [600, 300]
		});

		batchRender = false;
		this.setState(this.state);
	},
	loadGraph: function(graph) {
		batchRender = true;
		var nodes = graph.nodes;
		var ids = []
		for (var i = 0; i < nodes.length; i++) {
			var id = this._addNode(nodes[i]);
			ids.push(id);
		}
		var links = graph.links;
		for (var i = 0; i < links.length; i++) {
			var portA = this._splitPort(links[i][0]);
			var portB = this._splitPort(links[i][1]);
			this.connect(ids[portA[0]], portA[1], ids[portB[0]], portB[1]);
		}
		batchRender = false;
		this.setState(this.state);
	},
	clearGraph: function() {
		batchRender = true;
		var nodes = this.state.nodes.slice(0);
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			this.removeNode(node.id);
		}
		batchRender = false;
		this.setState(this.state);
	},
	setState: function(state) {
		this.state = state;

		this.updateShader();

		this._updateNodes();
		this._updateLinks();
	},
	_updateNodes: function() {
		var nodes = [];

		this.state.nodes.forEach(function(data) {
			var node = this.shader.fragmentGraph.getNodeById(data.id);
			if (node) {
				var extra;

				switch (data.type) {
				case 'value':
				case 'vec2':
				case 'vec3':
				case 'vec4':
					if (data.value.length > 1) {
						extra = [];
						for (var i = 0; i < data.value.length; i++) {
							extra.push(
								{
									value: data.value[i],
								}
							);
						}
					} else {
						extra = [
							{
								value: data.value,
							}
						];
					}
					break;
				}

				nodes[data.id] = {
					id: data.id,
					pos: data.pos,
					dataNodeId: data.id,
					key: data.id,
					type: data.type,
					className: "w",
					inputs: node.getInputPorts(),
					outputs: node.getOutputPorts(),
					extra: extra,
					removeNode: data.type !== 'fragColor' ? this.removeNode.bind(this) : undefined,
					updateData: this.updateData.bind(this),
					clickHandler: this.nodeClick.bind(this),
					portClickHandler: this.portClickHandler.bind(this)
				};
			}
		}, this);

		this.nodes = nodes;
	},
	_updateLinks: function() {
		var nodes = this.nodes;
		var missing = false;

		var links = [];

		this.state.links.forEach(function(link) {
			var portA = link.portA + link.nodeA;
			var portB = link.portB + link.nodeB;
			var ela = this.querySelector("#" + portA);
			var elb = this.querySelector("#" + portB);
			if (ela && elb) {
				var nodeA = nodes[link.nodeA];
				var nodeB = nodes[link.nodeB];
				links[link.id] = {
					id: link.id,
					portA: portA + "_",
					posA: [
						nodeA.pos[0] + ela.offsetLeft + ela.offsetWidth - 2,
						nodeA.pos[1] + ela.offsetTop + 0.5 * ela.offsetHeight + 2
					],
					portB: portB + "_",
					posB: [
						nodeB.pos[0] + elb.offsetLeft + 4,
						nodeB.pos[1] + elb.offsetTop + 0.5 * elb.offsetHeight + 2
					],
					clickHandler: this.wireClickHandler.bind(this)
				};
			} else {
				missing = true;
			}
		}, this);

		this.links = links;

		if (missing) {
			setTimeout(function() { this._updateLinks(); }.bind(this), 100);
		}
	},
	nodeTypes: function(){
		var types = Object.keys(ShaderGraph.Node.classes).sort().filter(function(type){
			// Should not list the main node
			return type !== 'fragColor' && type !== 'position';
		});
		return types.map(function (type) {
			return { type: type };
		});
	},
	updateShader: function(){
		// window._times = (window._times || 0) + 1, console.log(window._times);
		if (this.shader && this.onShaderUpdate) {
			this.onShaderUpdate(this.shader);
		}

		return this.shader
	},
	generateId: function(){
		if(this.idCounter === undefined){
			this.idCounter = 1;
		}
		return this.idCounter++;
	},
	_addNode: function(options, extra){
		var data = extra || {};
		if (typeof options === "string") {
			data.type = options;
		} else if (typeof options === "object") {
			for(var i in options) {
				data[i] = options[i];
			}
		} else {
			console.warn("Couldn't create node with options='" + options + "' and extra='" + extra + "'");
			return;
		}
		if (data.type === 'fragColor' || data.type === 'position') {
			// Find the main node
			var mainNode = this.state.nodes.find(function(node){
				return node.type === 'fragColor' || node.type === 'position';
			});
			// Only update its data
			if (mainNode) {
				data.id = 1;
				this.updateData(1, data);
				return data.id;
			}
		}
		if (typeof data.id === "undefined") {
			data.id = this.generateId();
		} else if (typeof data.id !== "number") {
			data.id = parseInt(data.id);
		}
		if (typeof data.pos === "undefined") {
			data.pos = [0, 0];
		}
		if (typeof data.value === "undefined") {
			switch(data.type){
			case 'value':
				data.value = 0;
				break;
			case 'vec2':
				data.value = [0,0];
				break;
			case 'vec3':
				data.value = [0,0,0];
				break;
			case 'vec4':
				data.value = [0,0,0,1];
				break;
			}
		}

		// Add nodes that are not main nodes
		if (data.type !== "fragColor") {
			var node = new ShaderGraph.Node.classes[data.type]({
				id: data.id
			});
			this.shader.fragmentGraph.addNode(node);
			switch(data.type){
			case 'value':
				var v = parseFloat(data.value);
				node.value = isNaN(v) ? 0 : v;
				break;
			case 'vec2':
			case 'vec3':
			case 'vec4':
				node.value = data.value.map(function(comp){
					var v = parseFloat(comp);
					return isNaN(v) ? 0 : v;
				});
				break;
			}

			//data.node = node;
		}

		var state = this.state;
		state.nodes.push(data);
		if (!batchRender) {
			this.setState(state);
		}

		// If there is a temporary link attach it to the new node
		if (this._tempWire) {
			var nodeA = this._tempWire.nodeA;
			var portA = this._tempWire.portA;
			var nodeB = data.id;
			if (this._tempWire.element.type === "out") {
				var portB = ShaderGraph.Node.classes[data.type].prototype.getInputPorts()[0];
				this.connect(nodeB, portB, nodeA, portA);
				// this.connect(nodeA, portA, nodeB, portB);
			} else if (this._tempWire.element.type === "in") {
				var portB = ShaderGraph.Node.classes[data.type].prototype.getOutputPorts()[0];
				this.connect(nodeB, portB, nodeA, portA);
			}
			this.clearTempWire();
		}

		return data.id;
	},
	removeNode: function(id){
		id = parseInt(id);

		var state = this.state;

		var nodeToRemove = state.nodes.find(function(node){
			return node.id === id;
		});
		if(!nodeToRemove || nodeToRemove.type === 'fragColor'){
			return false;
		}

		// Remove the links connected
		state.links.filter(function(link){
			return link.nodeA == id || link.nodeB == id;
		}).forEach(function(link){
			var nA = this.shader.fragmentGraph.getNodeById(link.nodeA);
			if(!nA) throw new Error('couldnt find node ' + link.nodeA);
			var nB = this.shader.fragmentGraph.getNodeById(link.nodeB);
			if(!nB) throw new Error('couldnt find node ' + link.nodeB);

			nA.disconnect(link.portA, nB, link.portB);

			var idx = state.links.indexOf(link);
			if(idx !== -1){
				state.links.splice(idx, 1);
			}
		}, this);

		var node = this.shader.fragmentGraph.getNodeById(id);
		if(!node) throw new Error('couldnt find node ' + id);
		this.shader.fragmentGraph.removeNode(node);

		var idx = state.nodes.indexOf(nodeToRemove);
		if(idx !== -1){
			 state.nodes.splice(idx, 1);
		}

		if (!batchRender) {
			this.setState(state);
		}

		return true;
	},
	updateData: function(id, data){
		if (!data) {
			return;
		}
		if (data.value && data.value.length === 1) {
			data.value = data.value[0];
		}
		var node = this.state.nodes.find(function(node){
			return node.id === id;
		});
		if(node){
			for(var key in data){
				node[key] = data[key];
			}

			// Update the value in the shader node 
			var n = this.shader.fragmentGraph.getNodeById(id);
			if (n) {
				n.value = node.value;
			}

			this.updateShader();
		}
	},
	_splitPort: function(port) {
		var string = port.toString();
		if (string.indexOf('.') === -1) {
			return [port, 0];
		}
		var split = string.split('.');
		return [parseInt(split[0]), parseInt(split[1])];
	},
	_getPortInfo: function(info) {
		var result = {};
		var reg = /([^\d]+)(\d+)/;
		var match;

		match = info.match(reg);
		result.node = match[2];
		result.port = match[1];

		return result;
	},
	_getWireInfo: function(info) {
		var result = {};
		var reg = /([^\d]+)(\d+)_/;
		var match;

		match = info.portA.match(reg);
		result.nodeA = match[2];
		result.portA = match[1];

		match = info.portB.match(reg);
		result.nodeB = match[2];
		result.portB = match[1];

		return result;
	},
	_getConnectionInfo: function(info) {
		var result = {};
		var reg = /([^\d]+)(\d+)/;
		if (typeof info.source !== "undefined") {
			var attributes = info.source.parentNode.parentNode.attributes['data-node-id'];
			if (attributes) {
				result.nodeA = attributes.value;
				result.portA = info.source.innerHTML;
			}
		} else {
			var m = info.sourceId.match(reg);
			result.nodeA = m[2];
			result.portA = m[1];
		}
		if (typeof info.target !== "undefined") {
			var attributes = info.target.parentNode.parentNode.attributes['data-node-id'];
			if (attributes) {
				result.nodeB = attributes.value;
				result.portB = info.target.innerHTML;
			}
		} else {
			var m = info.targetId.match(reg);
			result.nodeB = m[2];
			result.portB = m[1];
		}
		return result;
	},
	_isInput: function(node, port) {
		var id = port + node;
		var el = this.querySelector("#" + id);
		return el && el.classList.contains("in");
	},
	_isOutput: function(node, port) {
		var id = port + node;
		var el = this.querySelector("#" + id);
		return el && el.classList.contains("out");
	},
	_getExistingConnections: function(node, port) {
		node = node.toString();
		var id = port + node;
		var existing = [];
		this.links.forEach(function(link) {
			var info = this._getWireInfo(link);
			if (info.nodeB === node && info.portB === port) {
				existing.push(info);
			}
		}, this);
		return existing;
	},
	connect: function(nodeA, portA, nodeB, portB){
		if(arguments.length === 2) {
			var portA = this._splitPort(arguments[0]);
			var portB = this._splitPort(arguments[1]);

			nodeA = portA[0];
			portA = portA[1];

			nodeB = portB[0];
			portB = portB[1];
		} else {
			nodeA = Number(nodeA);
			nodeB = Number(nodeB);
		}

		var nA = this.shader.fragmentGraph.getNodeById(nodeA);
		var nB = this.shader.fragmentGraph.getNodeById(nodeB);
		if(!nA) throw new Error('couldnt find node ' + nodeA);
		if(!nB) throw new Error('couldnt find node ' + nodeB);

		if(typeof portA === "number") {
			portA = nA.getOutputPorts()[portA];
			if(typeof portA === "undefined") {
				console.warn("Output port A undefined");
				return false;
			}
		}

		if(typeof portB === "number") {
			portB = nB.getInputPorts()[portB];
			if(typeof portB === "undefined") {
				console.warn("Input port B undefined");
				return false;
			}
		}

		var state = this.state;

		var link;

		if(!nB.canConnect(portB, nA, portA)){
			if (!nA.canConnect(portA, nB, portB)) {
				console.warn(nB.errorMessage);
				return false;
			} else {
				// make the connetion in opposite direction
				nA.connect(portA, nB, portB);
				link = {
					nodeA: nodeB,
					nodeB: nodeA,
					portA: portB,
					portB: portA
				};
			}
		} else {
			// make the connetion as is
			nB.connect(portB, nA, portA);
			link = {
				nodeA: nodeA,
				nodeB: nodeB,
				portA: portA,
				portB: portB
			};
		}

		// remove existing links for input ports
		var inputs = this._getExistingConnections(nodeB, portB);
		var outputs = this._getExistingConnections(nodeA, portA);
		var existing = [];
		inputs.forEach(function(input){
			existing.push(input);
		});
		outputs.forEach(function(output){
			if (output.nodeA === nodeB.toString() &&
					output.portA === portB &&
					output.nodeB === nodeA.toString() &&
					output.portB === portA) {
				// Remove existing connection to the same output port
				existing.push(output);
			}
		});

		for (var i = 0; i < existing.length; i++) {
			var info = existing[i];
			this.disconnect(info.nodeA, info.portA, info.nodeB, info.portB);
		}

		link.id = this.generateId();

		state.links.push(link);

		if (!batchRender) {
			this.setState(state);
		}

		return true;
	},
	disconnect: function(nodeA, portA, nodeB, portB){
		nodeA = Number(nodeA);
		nodeB = Number(nodeB);

		var state = this.state;
		var connToRemove = state.links.find(function(link){
			return (
				link.nodeA === nodeA &&
				link.nodeB === nodeB &&
				link.portA === portA &&
				link.portB === portB
			);
		});
		var idx = state.links.indexOf(connToRemove);
		if(idx !== -1){
			state.links.splice(idx, 1);
		}

		// Test it!
		var nA = this.shader.fragmentGraph.getNodeById(nodeA);
		var nB = this.shader.fragmentGraph.getNodeById(nodeB);
		nB.disconnect(portB, nA, portA);

		// Delete any other invalid links
		/*
		var invalidConnections = this.shader.fragmentGraph.links.filter(function(link){
			return !link.isValid();
		}).forEach(function(link){
			console.log('removing', link)
			var connToRemove = state.links.find(function(connData){
				return (
					connData.nodeA === link.fromNode &&
					connData.nodeB === link.toNode &&
					connData.portA === link.fromPortKey &&
					connData.portB === link.toPortKey
				);
			});
			var idx = state.links.indexOf(connToRemove);
			if(idx !== -1){
				state.links.splice(idx, 1);
			}
		});
		*/

		if (!batchRender) {
			this.setState(state);
		}
	},
	updateSelectRect: function( left, top, width, height ) {
		if (!left || !top || !width || !height) {
			this.clearSelection();
			return;
		}

		var els = this.querySelectorAll("shader-node");

		// Apply the local transformation to the selection rect
		left -= this._t.tx - 0.5 * this.offsetWidth * (this._t.sx - 1);
		left /= this._t.sx;
		width /= this._t.sx;

		top -= this._t.ty - 0.5 * this.offsetHeight * (this._t.sy - 1);
		top /= this._t.sy;
		height /= this._t.sy;

		var right = left + width;
		var bottom = top + height;

		// Find and mark as selected all the nodes insersecting the selection rect
		this.selection = [];
		for (var i = 0; i < els.length; i++) {
			var el = els[i];
			var selected = el.offsetLeft <= right &&
				left <= el.offsetLeft + el.offsetWidth &&
				el.offsetTop <= bottom &&
				top <= el.offsetTop + el.offsetHeight;
			el.selected = selected;
			if (selected) {
				this.selection.push(el);
			}
		}
	},
	clearSelection: function() {
		this.selection = [];
		var els = this.querySelectorAll("shader-node");

		// Deselect all nodes if selection rect is undefined
		for (var i = 0; i < els.length; i++) {
			els[i].selected = false;
		}
	},
	removeSelection: function() {
		if (this.selection) {
			this.selection.forEach(function(el){
				this.removeNode(el.id);
			}, this);
		}
	},
	isInSelection: function(el) {
		return this.selection && this.selection.indexOf(el) !== -1;
	},
	addToSelection: function(el) {
		if (!this.selection) {
			this.selection = [];
		}
		if (!this.isInSelection(el)) {
			el.selected = true;
			this.selection.push(el)
		}
	},
	toggleSelection: function(el) {
		if (!this.selection) {
			this.selection = [];
		}
		if (!this.isInSelection(el)) {
			this.addToSelection(el);
		} else {
			this.selection.splice(this.selection.indexOf(el), 1);
			el.selected = false;
		}
	},
	domChange: function(event){
	},
	portClickHandler: function(e, el) {
		e.stopPropagation();

		// Clear temp wire before creating a new one
		this.clearTempWire();
		if (this.onConnectionStarted) {
			this.onConnectionStarted(e);
		}

		// Create a new temp wire
		var temp = document.createElement("shader-wire");
		temp.id = "temp";

		temp.portA = "portA";
		temp.portB = "portB";

		var eln = el.parentNode.parentNode;

		var elc;

		if (el.type == "in") {
			temp.B.pos = [
				eln.offsetLeft + el.offsetLeft + 4,
				eln.offsetTop + el.offsetTop + 0.5 * el.offsetHeight + 2
			];
			elc = temp.A;
		} else {
			temp.A.pos = [
				eln.offsetLeft + el.offsetLeft + el.offsetWidth - 2,
				eln.offsetTop + el.offsetTop + 0.5 * el.offsetHeight + 2
			];
			elc = temp.B;
		}

		var bounds = this.getBoundingClientRect();

		elc.pos = [
			((e.clientX - bounds.left) + 0.5 * this.offsetWidth * (this._t.sx - 1) - this._t.tx) / this._t.sx,
			((e.clientY - bounds.top) + 0.5 * this.offsetHeight * (this._t.sx - 1) - this._t.ty) / this._t.sy
		];

		Polymer.dom(this.$.canvas).appendChild(temp);

		// Find posible connectors to drop temp wire
		var filterType = el.type === "in" ? "out" : "in";
		var portAInfo = this._getPortInfo(el.id);
		var nodeA = portAInfo.node;
		var portA = portAInfo.port;
		var nA = this.shader.fragmentGraph.getNodeById(nodeA);

		var ports = [];
		Array.prototype.forEach.call(this.querySelectorAll("shader-port"), function(port) {
			if (port.type === filterType) {
				var portBInfo = this._getPortInfo(port.id);
				var nodeB = portBInfo.node;
				var portB = portBInfo.port;
				var nB = this.shader.fragmentGraph.getNodeById(nodeB);
				if (nA.canConnect(portA, nB, portB) || nB.canConnect(portB, nA, portA)) {
					ports.push({
						element: port,
						node: portBInfo.node,
						port: portBInfo.port
					});
				}
			}
		}, this);

		// Start dragging the temp wire
		var nodeB;
		var portB;
		Editor.UI.DomUtils.startDrag("default", e, function( e, dx, dy ) {
			var pos = [
				((e.clientX - bounds.left) + 0.5 * this.offsetWidth * (this._t.sx - 1) - this._t.tx) / this._t.sx,
				((e.clientY - bounds.top) + 0.5 * this.offsetHeight * (this._t.sx - 1) - this._t.ty) / this._t.sy
			];
			nodeB = undefined;
			portB = undefined;
			// Snap connector to ports
			ports.forEach(function(info) {
				var port = info.element;
				var n = port.parentNode.parentNode;
				var ppos;
				if (filterType === "in") {
					ppos = [
						n.offsetLeft + port.offsetLeft + 4,
						n.offsetTop + port.offsetTop + 0.5 * port.offsetHeight + 2
					];
				} else {
					ppos = [
						n.offsetLeft + port.offsetLeft + port.offsetWidth - 2,
						n.offsetTop + port.offsetTop + 0.5 * port.offsetHeight + 2
					];
				}
				if (pos[0] > ppos[0] - 20 &&
						pos[0] < ppos[0] + 20 &&
						pos[1] > n.offsetTop + port.offsetTop &&
						pos[1] < n.offsetTop + port.offsetTop + port.offsetHeight) {
					pos = ppos;
					nodeB = info.node;
					portB = info.port;
				}
			});
			elc.pos = pos;
		}.bind(this), function( e ) {
			if (nodeA, portA, nodeB, portB) {
				this.clearTempWire();
				this.connect(nodeA, portA, nodeB, portB);
			} else {
				this._tempWire = {
					element: el,
					nodeA: nodeA,
					portA: portA,
					nodeB: nodeB,
					portB: portB
				};
				this.connectionAborted(e);
			}
		}.bind(this));
	},
	clearTempWire: function() {
		this._tempWire = null;
		var el = this.querySelector("#temp")
		if (el) {
			this.$.canvas.removeChild(el);
		}
	},
	connectionAborted: function(e) {
		if (!ignoreConnectionEvents) {
			if (this.onConnectionReleased) {
				this.onConnectionReleased(e);
			} else {
				// If onConnectionReleased is not defined abort temp connection
				this.clearTempWire();
			}
		}
	},
	connectorClick: function( e, el) {
		if (3 === e.which || 2 === e.which) {
			return;
		}
		e.stopPropagation();
		el.classList.add("dragging");
		Editor.UI.DomUtils.startDrag(this.draggingCursor, e, function( e, dx, dy ) {
			el.pos = [el.pos[0] + dx / this.scale, el.pos[1] + dy / this.scale];
		}.bind(this), function( e ) {
			el.classList.remove("dragging");
			this.style.cursor = this.draggingCursor;
		}.bind(this));
	},
	wireClickHandler: function(e, el) {
		if(!ignoreConnectionEvents){
			var info = this._getWireInfo(this.links[el.id]);
			this.disconnect(info.nodeA, info.portA, info.nodeB, info.portB);
		}
	},
	nodeClick: function(e, el, capture) {
		if (3 === e.which || 2 === e.which) {
			return;
		}
		var isDraggable = e.target.classList.contains("draggable");
		if (capture) {
			this.bringToFront(el);
			if (e.shiftKey) {
				this.toggleSelection(el);
			} else {
				if (!this.isInSelection(el) || !isDraggable) {
					this.clearSelection();
					this.addToSelection(el);
				}
			}
		} else {
			if (isDraggable) {
				e.stopPropagation();
				Editor.UI.DomUtils.startDrag("move", e, function( e, dx, dy ) {
					this.selection.forEach(function(el){
						var pos = el.pos;
						pos[0] += dx / this.scale;
						pos[1] += dy / this.scale;
						el.set("pos.*", pos.slice(0));

						Array.prototype.forEach.call(el.outputs, function(label) {
							port = label + el.id;
							var elp = this.querySelector("#" + port);
							var elc = this.querySelector("#" + port + "_");
							if (elp && elc) {
								elc.pos = [
									el.offsetLeft + elp.offsetLeft + elp.offsetWidth - 2,
									el.offsetTop + elp.offsetTop + 0.5 * elp.offsetHeight + 2
								];
							}
						}, this);

						Array.prototype.forEach.call(el.inputs, function(label) {
							port = label + el.id;
							var elp = this.querySelector("#" + port);
							var elc = this.querySelector("#" + port + "_");
							if (elp && elc) {
								elc.pos = [
									el.offsetLeft + elp.offsetLeft + 4,
									el.offsetTop + elp.offsetTop + 0.5 * elp.offsetHeight + 2
								];
							}
						}, this);

					}, this);

				}.bind(this), function( e ) {
					this.style.cursor = "default";
				}.bind(this));
			}
		}
	},
	bringToFront: function(el) {
		if (!this.topz) {
			this.topz = 10;
		}
		el.style.zIndex = ++this.topz;
	}
});

})();
