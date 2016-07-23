(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	detached: function() {
		this.instance = null;
	},
	_instance: function(instance) {
		if (this.instance) {
			this.instance.detachAllConnections(this);
			this.instance.unmakeSource(this);
			this.instance.unmakeTarget(this);
		}

		this.instance = instance;

		if (instance && this.offsetParent) {
			instance.makeSource(this, {
				connectorStyle: {
					strokeStyle: "black",
					lineWidth: 2,
					outlineColor: "transparent",
					outlineWidth: 4
				},
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
	properties: {
		type: String,
		instance: {
			type: Object,
			observer: "_instance"
		},
		className: String
	}
});

})();
