(function(){

Editor.polymerElement({
	properties: {
		id: String,
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
		updateData: Object,
		removeNode: Object,
		pos: {
			type: Array,
			value: function() { return [0,0]; }
		},
		selected: {
			type: Boolean,
			value: function() { return false; },
			observer: "_selected"
		},
		drag: Object
	},
	observers: [
		'_onValueChange(extra.*)',
		'_onPosChange(pos.*)'
	],
	created: function() {
		this.addEventListener( "mousedown", function(e) {
			if (this.drag) {
				this.drag(e, this);
			}
		}.bind(this), true);
	},
	_onValueChange: function() {
		if (this.extra) {
			var value = this.extra.map(function(item) {
				return parseFloat(item.value);
			});
			if (this.updateData) {
				this.updateData(parseFloat(this.id), {
					value: value
				});
			}
		}
	},
	_onRemoveNode: function(){
		this.removeNode(parseFloat(this.id));
	},
	_onPosChange(pos) {
		if (pos) {
			this.style.left = pos.value[0];
			this.style.top = pos.value[1];
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
