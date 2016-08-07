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
		this.addEventListener("mousedown", function(e) {
			if (this.clickHandler) {
				this.clickHandler(e, this, false);
			}
		}.bind(this));

		this.addEventListener("mousedown", function(e) {
			// this.parentNode.appendChild(this);
			if (this.clickHandler) {
				this.clickHandler(e, this, true);
			}
		}.bind(this), true);

		this.addEventListener("dom-change", this.domChange.bind(this));
	},
	domChange: function() {
		if (this.$.background) {
			if (!this.bgInitialSize) {
				this.bgInitialSize = this._getSize(this.$.background);
				this.$.background.style.position = "absolute";
				//Editor.log(this.bgInitialSize[1] + this.bgInitialSize[3], this.$.background.offsetHeight);
			}
			var rackSize = this._getSize(this.$.rack);
			if (rackSize[0] !== 0 || rackSize[1] !== 0) {
				var width = Math.max(this.bgInitialSize[0], rackSize[0] - this.bgInitialSize[2]);
				var height = Math.max(this.bgInitialSize[1], rackSize[1] - this.bgInitialSize[3]);
				this.$.background.style.minWidth = width + "px";
				this.$.background.style.minHeight = height + "px";
				this.$.rack.style.minWidth = width + this.bgInitialSize[2] + "px";
				this.$.rack.style.minHeight = height + this.bgInitialSize[3] + "px";
				//Editor.log(this.type, height, rackSize[1]);
			}
		}
	},
	_getSize: function(el) {
		var styling = getComputedStyle(el, null);

		var w = parseFloat(styling.getPropertyValue("width"));
		var pl = parseFloat(styling.getPropertyValue("padding-left"));
		var pr = parseFloat(styling.getPropertyValue("padding-right"));
		var bl = parseFloat(styling.getPropertyValue("border-left-width"));
		var br = parseFloat(styling.getPropertyValue("border-right-width"));

		var h = parseFloat(styling.getPropertyValue("height"));
		var pt = parseFloat(styling.getPropertyValue("padding-top"));
		var pb = parseFloat(styling.getPropertyValue("padding-bottom"));
		var bt = parseFloat(styling.getPropertyValue("border-top-width"));
		var bb = parseFloat(styling.getPropertyValue("border-bottom-width"));

		return [w, h, pl + pr, pt + pb];
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
