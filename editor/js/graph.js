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
		if (this.instance) {
			this.instance.setZoom(sx);
		}
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

		var component = this;

		var curviness = function(v){
			// link going forward
			var df = 100;
			const sf = 2;
			// link going backwards
			var db = 600;
			const sb = 4;
			// transition threshold
			const th = 300;
			// distance percentage
			const c = 0.25;

			var d0 = v[ 0 ];
			var d1 = v[ 1 ];
			var d = Math.sqrt( d0 * d0 + d1 * d1 );
			// var d = v[0];

			// fix distance
			df = df + (d - df) / sf;
			db = db + (d - db) / sb;

			if ( v[ 0 ] > 0 ) { // forward
				d = df;
			} else if ( v[ 0 ] < -th  ) { // backwards
				d = db;
			} else { // transition
				var t = v[ 0 ] / th;
				d = (1 + t) * df - t * db;
			}
			// console.log(c * d);
			return c * d;
		};

		// setup some defaults for jsPlumb.
		var instance = jsPlumb.getInstance({
			Endpoint: ["Dot", {radius: 3}],
            EndpointStyle: { fillStyle: "white" },
			Connector: ["Bezier", {curviness: curviness, snapThreshold: 0.00001}],
            PaintStyle: {
				strokeStyle: "white",
				lineWidth: 2
			},
			HoverPaintStyle: {
				strokeStyle: "#ddd",
				lineWidth: 2
			},
			ConnectionOverlays: [
				/*
				[ "Arrow", {
					location: 0.5,
					id: "arrow",
					length: 10,
					width: 10,
					foldback: 1
				} ]
				*/
			],
			Container: "canvas"
		});

		this.jsPlumbInstance = instance;

		var anchorMargin = 3;
		instance.leftAnchor = [0, 0.5, -1, 0, 1 + anchorMargin, 2];
		instance.rightAnchor = [1, 0.5, 1, 0, 1 - anchorMargin, 2];

		instance.registerConnectionType("basicRL", {
			anchors: [instance.rightAnchor, instance.leftAnchor],
			connector: "Bezier"
		});

		instance.registerConnectionType("basicLR", {
			anchors: [instance.leftAnchor, instance.rightAnchor],
			connector: "Bezier"
		});

/*
		instance.bind("click", function (c) {
			if(!ignoreConnectionEvents){
				var info = component._getConnectionInfo(c);
				component.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
				//instance.detach(c);
			}
		});
*/

		instance.bind("beforeDrop", function (c) {
			if (!ignoreConnectionEvents) {
				var info = component._getConnectionInfo(c);
				component.connect(info.nodeA, info.outputA, info.nodeB, info.inputB);
			}
		});

		instance.bind("connectionAborted", function (c, e) {
			if (!ignoreConnectionEvents) {
				var info = component._tempLink = component._getConnectionInfo(c);

				// If it was droped on a node just abort
				if (typeof info.nodeB !== "undefined") {
					component.clearTempConnection();
					return;
				}

				// If onConnectionReleased is not defined abort too
				if (!component || !component.onConnectionReleased) {
					return;
				}

				// Ask the callback if the temporary connection should be aborted 
				var aborted = component.onConnectionReleased(e);
				if (typeof aborted === "undefined" || aborted) {
					return;
				}

				// Create or reuse the temporarty link node
				var nodeA = info.outputA;
				var outputA = info.nodeA;
				var isInput = component._isInput(outputA, nodeA);
				var container = instance.getContainer();
				var el = component.querySelector("#temp");
				if (el) {
					component.instance.detachAllConnections(el);
				} else {
					el = document.createElement("span");
					el.className = "temp " + isInput ? "in" : "out";
					el.id = "temp";
					el.style.position = "absolute";
					el.style.width = 0;
					el.style.height = 20;
					Polymer.dom(container).appendChild(el);
				}

				// Get the click coordinates relative to the container
				var zoom = component.instance.getZoom();
				var bounds = container.getBoundingClientRect();
				el.style.left = (e.clientX - bounds.left) / zoom;
				el.style.top = (e.clientY - bounds.top) / zoom;

				// Create the temporary link
				instance.connect({
					source: nodeA + outputA,
					target: el.id,
					type: isInput ? "basicLR" : "basicRL"
				});
				instance.revalidate(el);
			}
		});

		instance.bind("beforeDrag", function (c, e) {
			component.clearTempConnection();
			if (component && component.onConnectionStarted) {
				component.onConnectionStarted(e);
			}
		});

		// suspend drawing and initialize.
		instance.batch(function () {
			// Connect initial links
			this.initialize(instance);

		}.bind(this));

		console.log('Graph editor ready');

		if (this.onReady) {
			this.onReady();
		}
	},
	initialize: function(instance){
		this.instance = instance;
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
		this.instance.batch(function () {
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
		}.bind(this));
	},
	clearGraph: function() {
		this.instance.batch(function () {
			batchRender = true;
			var nodes = this.state.nodes.slice(0);
			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				this.removeNode(node.id);
			}
			batchRender = false;
			this.setState(this.state);
		}.bind(this));
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
					instance: this.instance,
					extra: extra,
					removeNode: data.type !== 'fragColor' ? this.removeNode.bind(this) : undefined,
					updateData: this.updateData.bind(this),
					clickHandler: this.nodeClick.bind(this)
				};
			}
		}, this);

		this.nodes = nodes;
	},
	_updateLinks: function() {
		var nodes = this.nodes;
		var missing = false;

		var links = [];
		var linkId = 0;

		this.state.links.forEach(function(link) {
			var portA = link.outputA + link.nodeA;
			var portB = link.inputB + link.nodeB;
			var ela = this.querySelector("#" + portA);
			var elb = this.querySelector("#" + portB);
			if (ela && elb) {
				var nodeA = nodes[link.nodeA];
				var nodeB = nodes[link.nodeB];
				links[linkId] = {
					id: linkId,
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
					clickHandler: this.connectorClick.bind(this),
					wireClickHandler: this.wireClickHandler.bind(this)
				};
				linkId++;
			} else {
				missing = true;
			}
		}, this);

		this.links = links;

		if (missing) {
			setTimeout(function() { this._updateLinks(); }.bind(this), 100);
		}
	},
	clearTempConnection: function() {
		this._tempLink = null;
		var el = this.querySelector("#temp")
		if (el) {
			this.instance.detachAllConnections(el);
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
	updateConnections: function(){
		if(this.instance){
			this.instance.batch(function () {
				var instance = this.instance;
				ignoreConnectionEvents = true;
				var missing = false;
				var connections = [];
				this.state.links.forEach(function(link){
					var srcId = link.outputA + link.nodeA;
					var src = this.querySelector("#" + srcId);
					var tarId = link.inputB + link.nodeB;
					var tar = this.querySelector("#" + tarId);
					//if (document.contains(src) && document.contains(tar)) {
					if (src && tar) {
						connections.push({source: srcId, target: tarId, type: "basicRL"});
					} else {
						missing = true;
					}
				}, this);
				if (missing) {
					setTimeout(function() { this.updateConnections(); }.bind(this), 100);
				} else {
					instance.detachEveryConnection();
					connections.forEach(function(link) {
						instance.connect(link);
					}, this);
				}
				ignoreConnectionEvents = false;
			}.bind(this));
		}
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
		if (this._tempLink) {
			var nodeA = this._tempLink.nodeA;
			var portA = this._tempLink.outputA;
			var nodeB = data.id;
			if (this._isOutput(nodeA, portA)) {
				var portB = ShaderGraph.Node.classes[data.type].prototype.getInputPorts()[0];
				this.connect(nodeB, portB, nodeA, portA);
				// this.connect(nodeA, portA, nodeB, portB);
			} else if (this._isInput(nodeA, portA)) {
				var portB = ShaderGraph.Node.classes[data.type].prototype.getOutputPorts()[0];
				this.connect(nodeB, portB, nodeA, portA);
			}
			this.clearTempConnection();
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

			nA.disconnect(link.outputA, nB, link.inputB);

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
	_getWireInfo: function(info) {
		var result = {};
		var reg = /([^\d]+)(\d+)_/;
		var match;

		match = info.portA.match(reg);
		result.nodeA = match[2];
		result.outputA = match[1];

		match = info.portB.match(reg);
		result.nodeB = match[2];
		result.inputB = match[1];

		return result;
	},
	_getConnectionInfo: function(info) {
		var result = {};
		var reg = /([^\d]+)(\d+)/;
		if (typeof info.source !== "undefined") {
			var attributes = info.source.parentNode.parentNode.attributes['data-node-id'];
			if (attributes) {
				result.nodeA = attributes.value;
				result.outputA = info.source.innerHTML;
			}
		} else {
			var m = info.sourceId.match(reg);
			result.nodeA = m[2];
			result.outputA = m[1];
		}
		if (typeof info.target !== "undefined") {
			var attributes = info.target.parentNode.parentNode.attributes['data-node-id'];
			if (attributes) {
				result.nodeB = attributes.value;
				result.inputB = info.target.innerHTML;
			}
		} else {
			var m = info.targetId.match(reg);
			result.nodeB = m[2];
			result.inputB = m[1];
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
		var id = port + node;
		var con = this.instance.getConnections({target:id});
		var existing = [];
		if (con.length!=0 && this._isInput(node, port)) {
			for (var i = 0; i < con.length; i++) {
				existing.push(this._getConnectionInfo(con[i]));
			}
		}
		return existing;
	},
	connect: function(nodeA, outputA, nodeB, inputB){
		if(arguments.length === 2) {
			var portA = this._splitPort(arguments[0]);
			var portB = this._splitPort(arguments[1]);

			nodeA = portA[0];
			outputA = portA[1];

			nodeB = portB[0];
			inputB = portB[1];
		} else {
			nodeA = Number(nodeA);
			nodeB = Number(nodeB);
		}

		var nA = this.shader.fragmentGraph.getNodeById(nodeA);
		var nB = this.shader.fragmentGraph.getNodeById(nodeB);
		if(!nA) throw new Error('couldnt find node ' + nodeA);
		if(!nB) throw new Error('couldnt find node ' + nodeB);

		if(typeof outputA === "number") {
			outputA = nA.getOutputPorts()[outputA];
			if(typeof outputA === "undefined") {
				console.warn("Output port A undefined");
				return false;
			}
		}

		if(typeof inputB === "number") {
			inputB = nB.getInputPorts()[inputB];
			if(typeof inputB === "undefined") {
				console.warn("Input port B undefined");
				return false;
			}
		}

		var state = this.state;

		var link;

		if(!nB.canConnect(inputB, nA, outputA)){
			if (!nA.canConnect(outputA, nB, inputB)) {
				console.warn(nB.errorMessage);
				return false;
			} else {
				// make the connetion in opposite direction
				nA.connect(outputA, nB, inputB);
				link = {
					nodeA: nodeB,
					nodeB: nodeA,
					outputA: inputB,
					inputB: outputA
				};
			}
		} else {
			// make the connetion as is
			nB.connect(inputB, nA, outputA);
			link = {
				nodeA: nodeA,
				nodeB: nodeB,
				outputA: outputA,
				inputB: inputB
			};
		}

		// remove existing links for input ports
		var existing = [];

		existing = existing.concat(this._getExistingConnections(nodeA, outputA));
		existing = existing.concat(this._getExistingConnections(nodeB, inputB));

		for (var i = 0; i < existing.length; i++) {
			var info = existing[i];
			this.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
		}

		state.links.push(link);

		if (!batchRender) {
			this.setState(state);
		}

		return true;
	},
	disconnect: function(nodeA, outputA, nodeB, inputB){
		nodeA = Number(nodeA);
		nodeB = Number(nodeB);

		var state = this.state;
		var connToRemove = state.links.find(function(link){
			return (
				link.nodeA === nodeA &&
				link.nodeB === nodeB &&
				link.outputA === outputA &&
				link.inputB === inputB
			);
		});
		var idx = state.links.indexOf(connToRemove);
		if(idx !== -1){
			state.links.splice(idx, 1);
		}

		// Test it!
		var nA = this.shader.fragmentGraph.getNodeById(nodeA);
		var nB = this.shader.fragmentGraph.getNodeById(nodeB);
		nB.disconnect(inputB, nA, outputA);

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
					connData.outputA === link.fromPortKey &&
					connData.inputB === link.toPortKey
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
		left -= 0.5 * (this.offsetWidth - (this._t.sx * this.offsetWidth)) + this._t.tx;
		left /= this._t.sx;
		width /= this._t.sx;

		top -= 0.5 * (this.offsetHeight - (this._t.sy * this.offsetHeight)) + this._t.ty;
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
				this.instance.addToDragSelection(el);
				this.selection.push(el);
			} else {
				this.instance.removeFromDragSelection(el);
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
		this.instance.clearDragSelection();
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
			this.instance.addToDragSelection(el);
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
	/*
		Array.prototype.forEach.call(this.querySelectorAll("shader-node"), function(el) {
			this.instance.draggable(el);
		}, this);
	*/
	//	this.updateConnections();
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
			this.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
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
