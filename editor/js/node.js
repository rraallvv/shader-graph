(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	attached: function() {
		var self = this;
		if (this.instance) {
			this.instance.draggable(this, {
				stop: function(e) {
					var pos = e.finalPos;
					self.pos[0] = pos[0];
					self.pos[1] = pos[1];
				}
			});
		}
	},
	properties: {
		id: String,
		instance: Object,
		inputs: {
			type: Object,
			value: function(){return [];}
		},
		outputs: {
			type: Object,
			value: function(){return [];}
		},
		extra: {
			type: Object,
			value: function(){return [];}
		},
		updateNodeData: Object,
		removeNode: Object,
		pos: {
			type: Array,
			value: function() { return [0,0]; },
			observer: "_pos"
		},
		selected: {
			type: Boolean,
			value: function() { return false; },
			observer: "_selected"
		}
	},
	observers: [
		'_onValueChange(extra.*)'
	],
	_onValueChange: function() {
		var value = this.extra.map(function(item) {
			return parseFloat(item.value);
		});
		if (this.updateNodeData) {
			this.updateNodeData(parseFloat(this.id), {
				value: value
			});
		}
	},
	_onRemoveNode: function(){
		this.removeNode(parseFloat(this.id));
	},
	_pos: function(pos) {
		if (pos) {
			this.style.left = pos[0];
			this.style.top = pos[1];
		}
	},
	_selected: function(selected){
		if (selected) {
			this.classList.add("selected");
		} else {
			this.classList.remove("selected");
		}
	}
});

})();
