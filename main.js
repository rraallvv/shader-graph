(function() {

"use strict";

var nodeTypes = [];

window.addEventListener('WebComponentsReady', function(e) {
	parent.shaderGraph = document.getElementById("graph");
	var menu = document.getElementById("context-menu")
	if (parent.shaderGraph) {
		nodeTypes = parent.shaderGraph.nodeList();
		menu.buildMenu(nodeTypes);
		menu.onItemSelected = function(name) {
			var pos = menu.getPosition();
			parent.shaderGraph.addNode({
				type: name,
				pos: [pos.x, pos.y]
			});
		};
		menu.onToggleOff = function() {
			parent.shaderGraph.clearTempConnection();
		};
	}

	parent.preview.onload = function(){
		parent.shaderGraph.updateShader();
	};
	
	parent.preview.init();

	parent.shaderGraph.onShaderUpdate = function(shader){
		var shaderDef = shader.buildShader()
		var source = document.getElementById("source");
		source.innerHTML = ShaderGraph.Beautify(
			optimize_glsl(shaderDef.fshader(), "2", "fs"),
			//fs,
			{
				"indent_size": 1,
				"indent_char": '\t',
				"max_preserve_newlines": -1,
				"brace_style": "expand",
				"wrap_line_length": 0
			}
		);

		source.classList.remove("prettyprinted");
		prettyPrint();

		parent.preview.updateShader(shaderDef);
	};

	parent.shaderGraph.onConnectionReleased = function(e) {
		menu.toggleMenuOn();
		menu.positionMenu(e);
		return false;
	};
	
	//*
	var demos = [
		{ name: "Pattern",
			nodes: [
				{type:"fragColor", pos:[650, 130]},
				{type:"value", pos:[0, 0], value:70},
				{type:"uv", pos:[0, 100]},
				{type:"value", pos:[0, 220], value:35},
				{type:"value", pos:[0, 320], value:0.5},
				{type:"multiply", pos:[200, 50]},
				{type:"multiply", pos:[200, 150]},
				{type:"cos", pos:[350, 50]},
				{type:"sin", pos:[350, 150]},
				{type:"join", pos:[500, 100]},
				{type:"value", pos:[320, 250], value: 1}
			],
			links: [
				[1, 5],
				[2.1, 5.1],
				[2.2, 6],
				[3, 6.1],
				[5, 7],
				[6, 8],
				[7, 9],
				[8, 9.1],
				[4, 9.2],
				[10, 9.3],
				[9, 0]
			]
		},
		{ name: "Black and White",
			nodes: [
				{type:"fragColor", pos:[660, 200]},
				{type:"texture", pos:[0, 0]},
				{type:"split", pos:[0, 170]},
				{type:"add", pos:[135, 90]},
				{type:"add", pos:[267, 90]},
				{type:"divide", pos:[400, 90]},
				{type:"value", pos:[250, 175], value:3},
				{type:"join", pos:[530, 170]}
			],
			links: [
				[1, 2],
				[2, 3],
				[2.1, 3.1],
				[3, 4],
				[2.2, 4.1],
				[4, 5],
				[6, 5.1],
				[5, 7],
				[5, 7.1],
				[5, 7.2],
				[2.3, 7.3],
				[7, 0]
			]
		}];

	var placeholder = document.getElementById("demos");

	var element = document.createElement("a");
	element.onclick = function() {
		parent.shaderGraph.clearGraph();
	};
	element.innerHTML = "Clear";
	element.className = "demo";
	element.style.color = "red";
	placeholder.appendChild(element);

	for (var i = 0; i < demos.length; i++) {
		var element = document.createElement("a");
		element.demo = demos[i];
		element.onclick = function() {
			parent.shaderGraph.loadGraph(this.demo);
		};
		element.innerHTML = element.demo.name;
		element.className = "demo";
		placeholder.appendChild(element);
	}
});

})();