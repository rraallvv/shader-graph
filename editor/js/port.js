(function(){

Editor.polymerElement({
	properties: {
		type: String,
		clickHandler: Object,
		connected: {
			type: Boolean,
			observer: "_connected"
		}
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
	domChange: function() {
		this._connected(this.connected);
	}
});

})();
