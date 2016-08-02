(function(){

Editor.polymerElement({
	properties: {
		type: String,
		instance: Object
	},
	attached: function() {
		var instance = this.instance;
		if (instance && this.offsetParent) {
			instance.makeSource(this, {
				// maxConnections: 1,
				connectionType: this.type === "in" ? "basicLR" : "basicRL",
				onMaxConnections: function (info, e) {
					console.error("Maximum number of links (" + info.maxConnections + ") reached in source");
				},
				extract: {
					"action": "the-action"
				}
			});

			instance.makeTarget(this, {
				dropOptions: { hoverClass: "dragHover" },
				allowLoopback: false,
				// maxConnections: 1,
				onMaxConnections: function (info, e) {
					console.error("Maximum number of links (" + info.maxConnections + ") reached in target");
				},
			});
		}
	},
	detached: function() {
		var instance = this.instance;
		if (instance) {
			instance.detachAllConnections(this);
			instance.unmakeSource(this);
			instance.unmakeTarget(this);
		}
	},
	_isInput: function(type) {
		return type == "in";
	},
	_isOutpout: function(type) {
		return type == "out";
	}
});

})();
