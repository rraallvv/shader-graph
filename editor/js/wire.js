(function(){

Editor.polymerElement({
	properties: {
		portA: {
			type: String,
			value: "port-a"
		},
		posA: {
			type: Array,
			value: function() { return [0, 0]; },
		},
		portB: {
			type: String,
			value: "port-b"
		},
		posB: {
			type: Array,
			value: function() { return [0, 0]; },
		},
		scale: {
			type: Number,
			value: 1
		},
		clickHandler: Object
	},
	observers: [
		"_onPosChange(posA, posB)"
	],
	ready: function() {
		this.style.pointerEvents = "none";

		// Visible elements
		var A = this.$$("#" + this.portA);
		var B = this.$$("#" + this.portB);
		var W = this.$.wire;

		A.style.pointerEvents = "none";
		B.style.pointerEvents = "none";
		W.style.pointerEvents = "none";

		var container = this.$.container;
		container.style.position = "absolute";
		container.style.left = "0px";
		container.style.top = "0px";

		this.A = A;
		this.B = B;
		this.W = W;

		// Margin overlay
		var hW = document.createElementNS("http://www.w3.org/2000/svg", "path");

		hW.style.pointerEvents = "visibleStroke";
		hW.setAttribute("stroke-width", this.wireWidth);
		hW.style.stroke = "none";
		hW.style.fill = "none";

		container.appendChild(hW);

		this.hW = hW;
		this.container = container;

		// Event listeners
		hW.addEventListener("mouseenter", function() {
			W.classList.add("enter");
			this.style.cursor = this.enterWireCursor;
		}.bind(this));

		hW.addEventListener("mouseout", function() {
			W.classList.remove("enter");
			this.style.cursor = "";
		}.bind(this));

		hW.addEventListener("click", function(e) {
			if (this.clickHandler) {
				this.clickHandler(e, this);
			}
		}.bind(this));

		// Position accesors
		var self = this;

		Object.defineProperty(this.A, "pos", {
			get: function() { return self.posA; },
			set: function(pos) { self.posA = pos; },
			enumerable: true,
			configurable: true
		});
		this.A.pos = [0,0];

		Object.defineProperty(this.B, "pos", {
			get: function() { return self.posB; },
			set: function(pos) { self.posB = pos; },
			enumerable: true,
			configurable: true
		});
		this.B.pos = [0,0];
	},
	created: function() {
		// Get the connector styling
		var style = this._getStyleRule(".connector." + this.tagName) || {};
		var strokeWidth = parseFloat(style.strokeWidth || 1);
		var radius = parseFloat(style.r || 0);
		this.connectorRadius = strokeWidth + radius;

		// Get the wire styling
		var handleMargin = 5;
		style = this._getStyleRule(".wire." + this.tagName) || {};
		this.wireWidth = parseFloat(style.strokeWidth || 1) + 2 * handleMargin;

		// Get the wire enter styling
		style = this._getStyleRule(".wire.enter." + this.tagName) || {};
		this.enterWireCursor = style.cursor || "default";
	},
	_onPosChange(posA, posB) {
		if (!this.container) {
			return;
		}

		// Bounding box for connectors
		var left = Math.min( posA[ 0 ], posB[ 0 ] );
		var top = Math.min( posA[ 1 ], posB[ 1 ] );
		var width = Math.abs( posA[ 0 ] - posB[ 0 ] );
		var height = Math.abs( posA[ 1 ] - posB[ 1 ] );

		// Bounding box with wire and connector circle
		var curviness = this._curviness(posA, posB);
		var bb = this._bezierBoundingBox( posA[ 0 ] - left, posA[ 1 ] - top,
			posA[ 0 ] - left + curviness, posA[ 1 ] - top,
			posB[ 0 ] - left - curviness, posB[ 1 ] - top,
			posB[ 0 ] - left, posB[ 1 ] - top );

		var radiusx2 = 2 * this.connectorRadius;

		left = Math.min(left - this.connectorRadius, left + bb.left - 0.5 * this.wireWidth);
		top = Math.min(top - this.connectorRadius, top + bb.top);
		width = Math.max(width + radiusx2, bb.right - bb.left + this.wireWidth);
		height = Math.max(height + radiusx2, bb.bottom - bb.top);

		// Element position and size
		this.style.left = left + "px";
		this.style.top = top + "px";

		this.style.width = width + "px";
		this.style.height = height + "px";

		this.container.style.width = width + "px";
		this.container.style.height = height + "px";

		// Get relative positions (round them to stop the not moving
		// connector being slightly moved out of position).
		var aX = Math.round(posA[0] - left);
		var aY = Math.round(posA[1] - top);
		var bX = Math.round(posB[0] - left);
		var bY = Math.round(posB[1] - top);

		// Conector A position
		this.A.setAttribute("cx", aX);
		this.A.setAttribute("cy", aY);

		// Conector B position
		this.B.setAttribute("cx", bX);
		this.B.setAttribute("cy", bY);

		// Wire position
		var attribute = "M " +
			// A
			aX + " " + aY + " " +
			// control A
			" C " + (aX + curviness) + " " + aY + " " +
			// control B
			(bX - curviness) + " " + bY + " " +
			// B
			bX + " " + bY;

		this.W.setAttribute("d", attribute);
		this.hW.setAttribute("d", attribute);
	},
	_getStyleRule: function(selector) {
		if (!this.styleCache) {
			this.styleCache = {};
			for (var i = 0; i < document.styleSheets.length; i++) {
				var sheet = document.styleSheets[i];
				var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
				for (var j = 0; j < rules.length; j++) {
					if (rules[j].selectorText) {
						var selectorText = rules[j].selectorText.toLowerCase();
						if (selectorText.search(this.tagName.toLowerCase()) !== -1) {
							this.styleCache[selectorText] = rules[j].style;
						}
					}
				}

			}
		}
		return this.styleCache[selector.toLowerCase()];
	},
	_bezierBoundingBox: function( x0, y0, x1, y1, x2, y2, x3, y3 ) {
		var tvalues = [], xvalues = [], yvalues = [],
		a, b, c, t, t1, t2, b2ac, sqrtb2ac;
		for ( var i = 0; i < 2; ++i ) {
			if ( i == 0 ) {
				b = 6 * x0 - 12 * x1 + 6 * x2;
				a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
				c = 3 * x1 - 3 * x0;
			} else {
				b = 6 * y0 - 12 * y1 + 6 * y2;
				a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
				c = 3 * y1 - 3 * y0;
			}
			if ( Math.abs( a ) < 1e-12 ) {
				if ( Math.abs( b ) < 1e-12 ) {
					continue;
				}
				t = -c / b;
				if ( 0 < t && t < 1 ) {
					tvalues.push( t );
				}
				continue;
			}
			b2ac = b * b - 4 * c * a;
			if ( b2ac < 0 ) {
				continue;
			}
			sqrtb2ac = Math.sqrt( b2ac );
			t1 = (-b + sqrtb2ac) / (2 * a);
			if ( 0 < t1 && t1 < 1 ) {
				tvalues.push( t1 );
			}
			t2 = (-b - sqrtb2ac) / (2 * a);
			if ( 0 < t2 && t2 < 1 ) {
				tvalues.push( t2 );
			}
		}

		var j = tvalues.length, mt;
		while ( j-- ) {
			t = tvalues[ j ];
			mt = 1 - t;
			xvalues[ j ] = (mt * mt * mt * x0) + (3 * mt * mt * t * x1) + (3 * mt * t * t * x2) + (t * t * t * x3);
			yvalues[ j ] = (mt * mt * mt * y0) + (3 * mt * mt * t * y1) + (3 * mt * t * t * y2) + (t * t * t * y3);
		}

		xvalues.push( x0, x3 );
		yvalues.push( y0, y3 );

		return {
			left: Math.min.apply( 0, xvalues ),
			top: Math.min.apply( 0, yvalues ),
			right: Math.max.apply( 0, xvalues ),
			bottom: Math.max.apply( 0, yvalues )
		};
	},
	_curviness: function(posA, posB) {
		// link going forward
		var df = 100;
		const sf = 2;
		// link going backwards
		var db = 600;
		const sb = 4;
		// transition threshold
		const th = 300;
		// distance percentage
		const c = 0.25;

		var d0 = posB[0] - posA[0];
		var d1 = posB[1] - posA[1];
		var d = Math.sqrt( d0 * d0 + d1 * d1 );
		// var d = v[0];

		// fix distance
		df = df + (d - df) / sf;
		db = db + (d - db) / sb;

		if ( d0 > 0 ) { // forward
			d = df;
		} else if ( d0 < -th  ) { // backwards
			d = db;
		} else { // transition
			var t = d0 / th;
			d = (1 + t) * df - t * db;
		}
		// console.log(c * d);
		return c * d;
	}
});

})();
