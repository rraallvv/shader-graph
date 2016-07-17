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

				// If returned true or undefined onConnectionReleased release too, i.e. abort
				if (typeof component.props.shaderGraph !== "undefined" && typeof component.props.shaderGraph.onConnectionReleased === "function") {
					var aborted = component.props.shaderGraph.onConnectionReleased(e);
					if (typeof aborted === "undefined" || aborted) {
						return;
					}
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
				var bounds = container.getBoundingClientRect();
				el.style.left = e.clientX - bounds.left;
				el.style.top = e.clientY - bounds.top;

				// Create the temporary link
				instance.connect({
					source: nodeA + outputA,
					target: el.id,
					type: isInput ? "basicLR" : "basicRL"
				});
				instance.revalidate(el);
			}
		});

		console.log('Mount node editor')

		// suspend drawing and initialize.
		instance.batch(function () {
			// Connect initial links
			this.initialize(instance);

		}.bind(this));
	},
	initialize: function(instance){
		this.instance = instance;

		// Add the main node
		this.addNode({
			type: ShaderGraph.FragColorNode.type,
			pos: [600, 300]
		});

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

		// Find the main node
		var fragColorNodeData = this.state.nodes.find(function(node){
			return node.type === 'fragColor';
		});

		var shader = this.shader = new ShaderGraph.GraphShader({
			fragMainNode: new ShaderGraph.FragColorNode({
				id: fragColorNodeData && fragColorNodeData.id
			})
		});

		// Add nodes that are not main nodes
		this.state.nodes.filter(function(nodeData){
			return nodeData.type !== 'fragColor';
		}).forEach(function(nodeData){
			var node = new ShaderGraph.Node.classes[nodeData.type]({
				id: nodeData.id
			});
			this.shader.fragmentGraph.addNode(node);
			switch(nodeData.type){
			case 'value':
				var v = parseFloat(nodeData.value);
				node.value = isNaN(v) ? 0 : v;
				break;
			case 'vec2':
			case 'vec3':
			case 'vec4':
				node.value = nodeData.value.map(function(comp){
					var v = parseFloat(comp);
					return isNaN(v) ? 0 : v;
				});
				break;
			}
		}, this);

		// Links
		this.state.links.slice(0).forEach(function (link){
			var nA = this.shader.fragmentGraph.getNodeById(link.nodeA);
			var nB = this.shader.fragmentGraph.getNodeById(link.nodeB);
			if(!nA) console.warn('couldnt find node ' + link.nodeA);
			if(!nB) console.warn('couldnt find node ' + link.nodeB);

			if(!nB.canConnect(link.inputB, nA, link.outputA)){
				console.warn(nB.errorMessage);

				// If it cannot be rebuilt we may as well remove it from the datamodel
				this.disconnect(link.nodeA, link.outputA, link.nodeB, link.inputB);
				return false;
			}
			nB.connect(link.inputB, nA, link.outputA);
		}, this);

		typeof this.props.shaderGraph !== "undefined" && typeof this.props.shaderGraph.onShaderUpdate === "function" && this.props.shaderGraph.onShaderUpdate(this.shader);

		return shader
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
		var state = this.state;
		state.nodes.push(data);
		this.setState(state);
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
			var idx = state.links.indexOf(link);
			if(idx !== -1){
				state.links.splice(idx, 1);
			}
		});

		var idx = state.nodes.indexOf(nodeToRemove);
		if(idx !== -1){
			 state.nodes.splice(idx, 1);
		}
		this.setState(state);

		return true;
	},
	updateNodeData: function(id, data){
		var node = this.state.nodes.find(function(node){
			return node.id === id;
		});
		if(node){
			for(var key in data){
				node[key] = data[key];
			}
			if (!batchRender) {
				this.setState(this.state);
			}
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
			var attributes = info.source.parentNode.parentNode.parentNode.attributes['data-node-id'];
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
			var attributes = info.target.parentNode.parentNode.parentNode.attributes['data-node-id'];
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

		state.links.push(link);

		this.setState(state);

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

		this.setState(state);
	}
});

var Port = React.createClass({
	componentDidMount: function(){
		var el = ReactDOM.findDOMNode(this);
		var instance = this.props.instance;

		if (el.offsetParent) {
			instance.makeSource(el, {
				connectorStyle: {
					strokeStyle: "black",
					lineWidth: 2,
					outlineColor: "transparent",
					outlineWidth: 4
				},
				// maxConnections: 1,
				connectionType: this.props.type === "in" ? "basicLR" : "basicRL",
				onMaxConnections: function (info, e) {
					console.error("Maximum number of links (" + info.maxConnections + ") reached in source");
				},
				extract: {
					"action": "the-action"
				}
			});

			instance.makeTarget(el, {
				dropOptions: { hoverClass: "dragHover" },
				allowLoopback: false,
				// maxConnections: 1,
				onMaxConnections: function (info, e) {
					console.error("Maximum number of links (" + info.maxConnections + ") reached in target");
				},
			});
		}
	},
	componentWillUnmount: function(){
		var el = ReactDOM.findDOMNode(this);
		var instance = this.props.instance;

        instance.detachAllConnections(el);
		instance.unmakeSource(el);
		instance.unmakeTarget(el);
	},
	render: function(){
		return React.createElement("div", {className:this.props.type + " style-scope shader-graph", key:this.props.portKey, id:this.props.portKey + this.props.id}, this.props.portKey);
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
		var inputs = node ? node.getInputPorts().map(function(key){
			return React.createElement(Port, {
				type: "in",
				id: this.props.data.id,
				instance: this.props.instance,
				key: key,
				portKey: key
			});
		}, this) : undefined;
		var outputs = node ? node.getOutputPorts().map(function(key){
			return React.createElement(Port, {
				type: "out",
				id: this.props.data.id,
				key: key,
				instance: this.props.instance,
				portKey: key
			});
		}, this) : undefined;

		var removeButton = this.props.removeNode ? React.createElement("span", {
			className: "glyphicon glyphicon-remove remove-button pull-right style-scope shader-graph",
			onClick: this.handleClickRemove
		}) : undefined;

		var extra;

		switch(this.props.data.type){
		case 'value':
			extra = React.createElement("input", {
				type: "number",
				className: "style-scope shader-graph",
				value: this.props.data.value,
				onChange: this.onChangeValue
			});
			break;
		case 'vec2':
			extra = React.createElement("div", null,
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[0],
					onChange: this.onChangeVec2Value
				}),
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[1],
					onChange: this.onChangeVec2Value
				})
			);
			break;
		case 'vec3':
			extra = React.createElement("div", null,
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[0],
					onChange: this.onChangeVec3Value
				}),
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[1],
					onChange: this.onChangeVec3Value
				}),
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[2],
					onChange: this.onChangeVec3Value
				})
			);
			break;
		case 'vec4':
			extra = React.createElement("div", null,
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[0],
					onChange: this.onChangeVec4Value
				}),
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[1],
					onChange: this.onChangeVec4Value
				}),
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[2],
					onChange: this.onChangeVec4Value
				}),
				React.createElement("input", {
					type: "number",
					className: "style-scope shader-graph",
					value: this.props.data.value[3],
					onChange: this.onChangeVec4Value
				})
			);
			break;
		};

		var nodeStyle = {
			left: this.props.data.pos[0],
			top: this.props.data.pos[1]
		};

		return React.createElement("div", {className:"w node-type-" + this.props.data.type + " style-scope shader-graph", style:nodeStyle, "data-node-id":this.props.data.id},
			React.createElement("div", {className:"title style-scope shader-graph"},
				this.props.data.type,
				removeButton
			),
			extra,
			React.createElement("div", null,
				React.createElement("div", {className:"inputs style-scope shader-graph"},
					inputs
				),
				React.createElement("div", {className:"outputs style-scope shader-graph"},
					outputs
				)
			)
		);
	},
	onChangeValue: function(evt){
		this.props.updateNodeData(this.props.data.id, {
			value: evt.target.value
		});
		var v = parseFloat(this.props.data.value);
		this.props.data.node.value = isNaN(v) ? 0 : v;
	},
	onChangeVec2Value: function(evt){
		this.props.updateNodeData(this.props.data.id, {
			value: [
				evt.target.parentNode.childNodes[0].value,
				evt.target.parentNode.childNodes[1].value
			]
		});
		this.props.data.node.value = this.props.data.value.map(function(comp){
			var v = parseFloat(comp);
			return isNaN(v) ? 0 : v;
		});
	},
	onChangeVec3Value: function(evt){
		this.props.updateNodeData(this.props.data.id, {
			value: [
				evt.target.parentNode.childNodes[0].value,
				evt.target.parentNode.childNodes[1].value,
				evt.target.parentNode.childNodes[2].value
			]
		});
		this.props.data.node.value = this.props.data.value.map(function(comp){
			var v = parseFloat(comp);
			return isNaN(v) ? 0 : v;
		});
	},
	onChangeVec4Value: function(evt){
		this.props.updateNodeData(this.props.data.id, {
			value: [
				evt.target.parentNode.childNodes[0].value,
				evt.target.parentNode.childNodes[1].value,
				evt.target.parentNode.childNodes[2].value,
				evt.target.parentNode.childNodes[3].value
			]
		});
		this.props.data.node.value = this.props.data.value.map(function(comp){
			var v = parseFloat(comp);
			return isNaN(v) ? 0 : v;
		});
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
		setTimeout(function(){
			this._editor = ReactDOM.render(React.createElement(NodeEditor, {shaderGraph: this}), this.$.content);
		}.bind(this), 1000);
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
		e.pos = pos;
		this._editor.addNode(e);
	},
	clearTempConnection: function() {
		this._editor.clearTempConnection();
	},
	setTransform: function( s, r, n, t ){
		// s = 1, r = 1, n = 0, t = 0;
		this.style.transform = "matrix(" +
			s + ", 0, 0, " +
			r + ", " +
			Math.round(n + 0.5 * this.offsetWidth * (s - 1)) + ", " +
			Math.round(t + 0.5 * this.offsetHeight * (r - 1)) + ")";
	}
});

})();
