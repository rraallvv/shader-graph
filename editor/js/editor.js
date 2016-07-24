(function(){

var ignoreConnectionEvents = false;
var batchRender = false;

var NodeEditor = React.createClass({
	getInitialState: function(){
		return {
			links: [],
			nodes: []
		};
	},
	componentDidMount: function(){
		var component = this;

		this.props.shaderGraph._editor = this;

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
			Endpoint: ["Dot", {radius: 0.00001}],
			Connector: ["Bezier", {curviness: curviness, snapThreshold: 0.00001}],
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

		this.props.shaderGraph.jsPlumbInstance = instance;

		instance.registerConnectionType("basicRL", {
			anchors: ["Right", "Left"],
			connector: "Bezier"
		});

		instance.registerConnectionType("basicLR", {
			anchors: ["Left", "Right"],
			connector: "Bezier"
		});

		instance.bind("click", function (c) {
			if(!ignoreConnectionEvents){
				var info = component._getConnectionInfo(c);
				component.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
				//instance.detach(c);
			}
		});

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
					return;
				}

				// If onConnectionReleased is not defined abort too
				if (!component.props.shaderGraph || !component.props.shaderGraph.onConnectionReleased) {
					return;
				}

				// Ask the callback if the temporary connection should be aborted 
				var aborted = component.props.shaderGraph.onConnectionReleased(e);
				if (typeof aborted === "undefined" || aborted) {
					return;
				}

				// Create or reuse the temporarty link node
				var nodeA = info.outputA;
				var outputA = info.nodeA;
				var isInput = component._isInput(outputA, nodeA);
				var container = instance.getContainer();
				var el = document.getElementById("temp");
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
			if (component.props.shaderGraph && component.props.shaderGraph.onConnectionStarted) {
				component.props.shaderGraph.onConnectionStarted(e);
			}
		});

		// suspend drawing and initialize.
		instance.batch(function () {
			// Connect initial links
			this.initialize(instance);

		}.bind(this));

		console.log('Graph editor ready');

		if (this.props.shaderGraph && this.props.shaderGraph.onReady) {
			this.props.shaderGraph.onReady();
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
		this.addNode({
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
				ids.push(this.addNode(nodes[i]));
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
	render: function() {
		var nodes = this.state.nodes;
		var shader = this.updateShader();

		return React.createElement("div", {id:"canvas", className:"style-scope shader-graph"},
			nodes.map(function(node) {
				return React.createElement(Node, {
					removeNode:node.type !== 'fragColor' ? this.removeNode : undefined,
					updateNodeData:this.updateNodeData,
					instance:this.instance,
					key:node.id,
					data:node,
					shader:shader
				});
			}, this)
		);
	},
	componentDidUpdate: function() {
		this.updateConnections();
	},
	clearTempConnection: function() {
		this._tempLink = null;
		var el = document.getElementById("temp")
		if (el) {
			this.instance.detachAllConnections(el);
		}
	},
	nodeTypes: function(){
		return Object.keys(ShaderGraph.Node.classes).sort().filter(function(type){
			// Should not list the main node
			return type !== 'fragColor' && type !== 'position';
		});
	},
	updateShader: function(){
		// window._times = (window._times || 0) + 1, console.log(window._times);
		if (this.shader && this.props.shaderGraph && this.props.shaderGraph.onShaderUpdate) {
			this.props.shaderGraph.onShaderUpdate(this.shader);
		}

		return this.shader
	},
	updateConnections: function(){
		if(this.instance){
			this.instance.batch(function () {
				var instance = this.instance;
				ignoreConnectionEvents = true;
				instance.detachEveryConnection();
				this.state.links.forEach(function(link){
					var srcId = link.outputA + link.nodeA;
					var src = document.getElementById(srcId);
					var tarId = link.inputB + link.nodeB;
					var tar = document.getElementById(tarId);
					if (src && tar) {
						instance.connect({
							source: srcId,
							target: tarId,
							type: "basicRL"
						});
					}
				}, this);
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
	addNode: function(options, extra){
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
				this.updateNodeData(1, data);
				return data.id;
			}
		}
		if (typeof data.id === "undefined") {
			data.id = this.generateId();
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
	updateNodeData: function(id, data){
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
		var el = document.getElementById(id);
		return el && el.classList.contains("in");
	},
	_isOutput: function(node, port) {
		var id = port + node;
		var el = document.getElementById(id);
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
	}
});

var Node = React.createClass({
	componentDidMount: function(){
		var el = ReactDOM.findDOMNode(this);
		var instance = this.props.instance;
		instance.draggable(el);
	},
	render: function() {
		var shader = this.props.shader;
		var node = shader.fragmentGraph.getNodeById(this.props.data.id);

		var extra;

		switch (this.props.data.type) {
		case 'value':
		case 'vec2':
		case 'vec3':
		case 'vec4':
			if (this.props.data.value.length > 1) {
				extra = [];
				for (var i = 0; i < this.props.data.value.length; i++) {
					extra.push(
						{
							type: "number",
							className: "style-scope shader-graph",
							value: this.props.data.value[i],
						}
					);
				}
			} else {
				extra = [
					{
						type: "number",
						className: "style-scope shader-graph",
						value: this.props.data.value,
					}
				];
			}
			break;
		}

		var nodeStyle = {
			left: this.props.data.pos[0],
			top: this.props.data.pos[1]
		};

		return node ? React.createElement("shader-node", {
			style: nodeStyle,
			"data-node-id": this.props.data.id,
			id: this.props.data.id,
			ref: function (ref) {
				if (ref) {
					ref.type = this.props.data.type;
					ref.removeNode = this.props.removeNode;
					ref.handleClickRemove = this.handleClickRemove;
					ref.className = "w node-type-" + this.props.data.type + " style-scope shader-graph";
					ref.inputs = node.getInputPorts();
					ref.outputs = node.getOutputPorts();
					ref.instance = this.props.instance;
					ref.extra = extra;
					ref.updateNodeData = this.props.updateNodeData;
				}
			}.bind(this),
		}): undefined;
	},
	handleClickRemove: function(){
		this.props.removeNode(this.props.data.id);
	}
});

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	ready: function(){
		this._t = {sx: 1, sy: 1, tx: 0, ty: 0};
		setTimeout(function(){
			ReactDOM.render(React.createElement(NodeEditor, {shaderGraph: this}), this.$.content);
		}.bind(this), 2000);
	},
	updateShader: function() {
		this._editor.updateShader();
	},
	nodeList: function() {
		return this._editor.nodeTypes().map(function (type) {
			return { type: type };
		});
	},
	loadGraph: function(data) {
		this._editor.loadGraph(data);
	},
	clearGraph: function() {
		this._editor.clearGraph();
	},
	addNode: function(e) {
		var b = graph.querySelector("#canvas").getBoundingClientRect();
		var pos = e.pos || [0, 0];
		pos[0] -= b.left;
		pos[1] -= b.top;
		pos[0] /= this._t.sx;
		pos[1] /= this._t.sy;
		e.pos = pos;
		this._editor.addNode(e);
	},
	clearTempConnection: function() {
		this._editor.clearTempConnection();
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
		this.$.content.style.transform = "matrix(" +
			sx + ", 0, 0, " +
			sy + ", " +
			tx + ", " +
			ty + ")";
		if (this._editor) {
			this._editor.instance.setZoom(sx);
		}
	}
});

})();
