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
		pos: {
			type: Array,
			value: function() { return [0,0]; }
		},
		selected: {
			type: Boolean,
			value: function() { return false; },
			observer: "_selected"
		},
		clickHandler: Object
	},
	observers: [
		"_onValueChange(extra.*)",
		"_onPosChange(pos.*)"
	],
	created: function() {
		this.addEventListener( "mousedown", function(e) {
			if (this.clickHandler) {
				this.clickHandler(e, this, false);
			}
		}.bind(this));

		this.addEventListener( "mousedown", function(e) {
			// this.parentNode.appendChild(this);
			if (this.clickHandler) {
				this.clickHandler(e, this, true);
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
	_onPosChange(pos) {
		if (pos && pos.value) {
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
