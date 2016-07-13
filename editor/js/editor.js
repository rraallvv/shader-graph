(function(){

var ignoreConnectionEvents = false;

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

		function getConnectionInfo(info){
			var result = {};
			var reg = /([^\d]+)(\d+)/;
			if (typeof info.source !== "undefined") {
				result.nodeA = info.source.parentNode.parentNode.parentNode.attributes['data-node-id'].value;
				result.outputA = info.source.innerHTML;
			} else {
				var m = info.sourceId.match(reg);
				result.nodeA = m[2];
				result.outputA = m[1];
			}
			if (typeof info.target !== "undefined") {
				result.nodeB = info.target.parentNode.parentNode.parentNode.attributes['data-node-id'].value;
				result.inputB = info.target.innerHTML;
			} else {
				var m = info.targetId.match(reg);
				result.nodeB = m[2];
				result.inputB = m[1];
			}
			return result;
		}

		function getConnectionsInfo (con, id){
			var existing = [];
			if (con.length!=0 && document.getElementById(id).classList.contains("in")) {
				for (var i = 0; i < con.length; i++) {
					existing.push(getConnectionInfo(con[i]));
				}
			}
			return existing;
		}

		instance.bind("click", function (c) {
			if(!ignoreConnectionEvents){
				var info = getConnectionInfo(c);
				component.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
				//instance.detach(c);
			}
		});

		instance.bind("beforeDrop", function (c) {
			var existing = [], id, con;

			id = c.targetId;
			con = instance.getConnections({target:id});
			existing = existing.concat(getConnectionsInfo(con, id));

			id = c.sourceId;
			con = instance.getConnections({target:id});
			existing = existing.concat(getConnectionsInfo(con, id));

			var info = getConnectionInfo(c);

			if (!ignoreConnectionEvents) {
				if (component.connect(info.nodeA, info.outputA, info.nodeB, info.inputB)) {
					// disconnect existing links if is input
					for (var i = 0; i < existing.length; i++) {
						info = existing[i];
						component.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
					}
				}
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

		// Find the main node
		var fragColorNodeData = this.state.nodes.find(function(node){
			return node.type === 'fragColor';
		});

		this.shader = new ShaderGraph.GraphShader({
			fragMainNode: new ShaderGraph.FragColorNode({
				id: fragColorNodeData && fragColorNodeData.id
			})
		});

		this.setState(this.state);
	},
	loadGraph: function(graph) {
		this.clearGraph();
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
	},
	clearGraph: function() {
		// TODO
		console.log("TODO");
	},
	render: function() {
		var nodes = this.state.nodes;
		var shader = this.updateShader();
		this.updateConnections();

		return React.createElement("div", {id:"canvas", className:"style-scope shader-graph"},
			nodes.map(function(node) {
				return React.createElement(Node, {
					onClickRemove:node.type !== 'fragColor' ? this.removeNode : undefined,
					updateNodeData:this.updateNodeData,
					instance:this.instance,
					key:node.id,
					data:node,
					shader:shader
				});
			}, this)
		);
	},
	nodeTypes: function(){
		return Object.keys(ShaderGraph.Node.classes).sort().filter(function(type){
			// Should not list the main node
			return type !== 'fragColor' && type !== 'position';
		});
	},
	updateShader: function(){
		// window._times = (window._times || 0) + 1, console.log(window._times);
		typeof this.props.shaderGraph !== "undefined" && typeof this.props.shaderGraph.onUpdateShader === "function" && this.props.shaderGraph.onUpdateShader(this.shader);

		return this.shader
	},
	updateConnections: function(){
		if(this.instance){
			var instance = this.instance;
			ignoreConnectionEvents = true;
			instance.detachEveryConnection();
			this.state.links.forEach(function(link){
				instance.connect({
					source: link.outputA + link.nodeA,
					target: link.inputB + link.nodeB,
					type: "basicRL"
				});
			}, this);
			ignoreConnectionEvents = false;
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
		if (data.type !== 'fragColor') {
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

			data.node = node;
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
			this.setState(this.state);
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
	},
	componentWillUnmount: function(){
		var el = ReactDOM.findDOMNode(this);
		var instance = this.props.instance;

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
				type:"in",
				id:this.props.data.id,
				key:key,
				instance:this.props.instance,
				portKey:key
			});
		}, this) : undefined;
		var outputs = node ? node.getOutputPorts().map(function(key){
			return React.createElement(Port, {
				type:"out",
				id:this.props.data.id,
				key:key,
				instance:this.props.instance,
				portKey:key
			});
		}, this) : undefined;

		var removeButton = this.props.onClickRemove ? React.createElement("span", {
			className:"glyphicon glyphicon-remove remove-button pull-right style-scope shader-graph",
			onClick:this.handleClickRemove
		}) : undefined;

		var extra;

		switch(this.props.data.type){
		case 'value':
			extra = React.createElement("input", {
				type:"number",
				className:"style-scope shader-graph",
				value:this.props.data.value,
				onChange:this.onChangeValue
			});
			break;
		case 'vec2':
			extra = React.createElement("div", null,
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[0],
					onChange:this.onChangeVec2Value
				}),
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[1],
					onChange:this.onChangeVec2Value
				})
			);
			break;
		case 'vec3':
			extra = React.createElement("div", null,
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[0],
					onChange:this.onChangeVec3Value
				}),
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[1],
					onChange:this.onChangeVec3Value,
				}),
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[2],
					onChange:this.onChangeVec3Value
				})
			);
			break;
		case 'vec4':
			extra = React.createElement("div", null,
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[0],
					onChange:this.onChangeVec4Value
				}),
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[1],
					onChange:this.onChangeVec4Value
				}),
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[2],
					onChange:this.onChangeVec4Value
				}),
				React.createElement("input", {
					type:"number",
					className:"style-scope shader-graph",
					value:this.props.data.value[3],
					onChange:this.onChangeVec4Value
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
		this.props.onClickRemove(this.props.data.id);
	}
});

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	ready: function(){
		this._editor = ReactDOM.render(React.createElement(NodeEditor, {shaderGraph: this}), this.$.content);
	},
	updateShader: function() {
		this._editor.updateShader();
	},
	nodeList: function() {
		return this._editor.nodeTypes().map(function (type) {
			var item = document.createElement("a");
			item.type = item.innerHTML = type;
			return item;
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
