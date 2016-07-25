(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	attached: function() {
		if (this.instance) {
			this.instance.draggable(this);
		}
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
		extra: Object,
		updateNodeData: Object,
		removeNode: Object
	},
	_onValueChange: function() {
		var value = this.extra.map(function(item) {
			return parseFloat(item.value);
		});
		this.updateNodeData(parseFloat(this.id), {
			value: value
		});
	},
	_onRemoveNode: function(){
		this.removeNode(parseFloat(this.id));
	}
});

})();
