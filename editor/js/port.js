(function(){

Editor.polymerElement({
	properties: {
		type: String,
		dataType: {
			type: Array,
			observer: "_dataType"
		},
		node: {
			type: Number,
			observer: "_node"
		},
		port: String,
		connected: {
			type: Boolean,
			observer: "_connected"
		},
		dragged: {
			type: Boolean,
			observer: "_dragged"
		},
		clickHandler: Object
	},
	ready: function() {
		this.addEventListener("dom-change", this.domChange.bind(this));
	},
	attached: function() {
		this.addEventListener( "mousedown", function(e) {
			if (this.clickHandler) {
				this.clickHandler(e, this);
			}
		}.bind(this), true);
	},
	_isInput: function(type) {
		return type == "in";
	},
	_isOutpout: function(type) {
		return type == "out";
	},
	_connected: function(connected) {
		var port = this.$$("#port");
		if (port) {
			if (connected) {
				port.classList.add("connected");
			} else {
				port.classList.remove("connected");
			}
		}
	},
	_dragged: function(dragged) {
		var port = this.$$("#port");
		if (port) {
			if (dragged) {
				port.classList.add("dragged");
			} else {
				port.classList.remove("dragged");
			}
		}
	},
	_node: function(node) {
		this.node = Number(node);
	},
	_dataType: function(dataType) {
	},
	domChange: function() {
		this._connected(this.connected);
	}
});

})();
