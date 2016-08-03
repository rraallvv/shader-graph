(function(){

Editor.polymerElement({
	properties: {
		type: String,
		clickHandler: Object
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
	}
});

})();
