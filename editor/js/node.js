(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	ready: function() {
	},
	properties: {
		id: String,
		instance: Object,
		className: String,
		inputs: {
			type: Object,
			value: function(){return [];}
		},
		outputs: {
			type: Object,
			value: function(){return [];}
		},
		extra: Object
	},
	_onValueChange: function(e) {
		var value = this.extra.map(function(item) {
			return parseFloat(item.value);
		});
		this.updateNodeData(parseFloat(this.id), {
			value: value
		});
	}
});

})();
