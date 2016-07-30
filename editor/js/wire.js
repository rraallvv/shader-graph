(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	ready: function() {
		this.style.pointerEvents = "none";

		// Add the visible indicators
		Polymer.dom(this.root).appendChild(this.indicators);

		// Add the invisible handlers overlay
		Polymer.dom(this.root).appendChild(this.overlay);
	},
	created: function() {
		// Get the connector styling
		var style = this._getStyleRule(".connector." + this.tagName) || {};
		var handleMargin = 5;
		var strokeWidth = parseFloat(style.strokeWidth || 1);
		var radius = parseFloat(style.r || 0);
		this.connectorRadius = strokeWidth + radius + handleMargin;

		// Get the connector enter styling
		style = this._getStyleRule(".connector.enter." + this.tagName) || {};
		this.enterConnectorCursor = style.cursor || "default";

		style = this._getStyleRule(".connector.dragging." + this.tagName) || {};
		this.draggingCursor = style.cursor || this.enterConnectorCursor;

		// Get the wire styling
		style = this._getStyleRule(".wire." + this.tagName) || {};
		this.wireWidth = parseFloat(style.strokeWidth || 1) + 2 * handleMargin;

		// Get the wire enter styling
		style = this._getStyleRule(".wire.enter." + this.tagName) || {};
		this.enterWireCursor = style.cursor || "default";

		// Create the visible indicators
		var svgNS = "http://www.w3.org/2000/svg";

		var iA = document.createElementNS(svgNS, "circle");
		var iB = document.createElementNS(svgNS, "circle");
		var iW = document.createElementNS(svgNS, "path");

		iA.setAttribute("class", "connector");
		iB.setAttribute("class", "connector");
		iW.setAttribute("class", "wire");

		iA.style.pointerEvents = "none";
		iB.style.pointerEvents = "none";
		iW.style.pointerEvents = "none";

		var indicators = document.createElementNS(svgNS, "svg");
		indicators.style.position = "absolute";
		indicators.style.left = "0px";
		indicators.style.top = "0px";

		indicators.appendChild(iW);
		indicators.appendChild(iA);
		indicators.appendChild(iB);

		this.iA = iA;
		this.iB = iB;
		this.iW = iW;
		this.indicators = indicators;

		// Create handlers overlay

		var hA = document.createElementNS(svgNS, "circle");
		var hB = document.createElementNS(svgNS, "circle");
		var hW = document.createElementNS(svgNS, "path");

		hA.style.pointerEvents = "all";
		hB.style.pointerEvents = "all";
		hW.style.pointerEvents = "visibleStroke";

		hA.setAttribute("r", this.connectorRadius);
		hB.setAttribute("r", this.connectorRadius);
		hW.setAttribute("stroke-width", this.wireWidth);

		hA.style.stroke = "none";
		hB.style.stroke = "none";
		hW.style.stroke = "rgba(0,0,255,0.25)";

		hA.style.fill = "rgba(255,0,0,0.25)";
		hB.style.fill = "rgba(0,255,0,0.25)";
		hW.style.fill = "none";

		hA.addEventListener("mouseenter", this._onEnterConnector.bind( this ), false);
		hA.addEventListener("mouseout", this._onOutConnector.bind( this ), false);

		hB.addEventListener("mouseenter", this._onEnterConnector.bind( this ), false);
		hB.addEventListener("mouseout", this._onOutConnector.bind( this ), false);

		hW.addEventListener("mouseenter", this._onEnterWire.bind( this ), false);
		hW.addEventListener("mouseout", this._onOutWire.bind( this ), false);

		hA.addEventListener("mousedown", this._onDragConnector.bind( this ), true);
		hB.addEventListener("mousedown", this._onDragConnector.bind( this ), true);

		var overlay = document.createElementNS(svgNS, "svg");
		overlay.style.position = "absolute";
		overlay.style.left = "0px";
		overlay.style.top = "0px";

		overlay.appendChild(hW);
		overlay.appendChild(hA);
		overlay.appendChild(hB);

		this.hA = hA;
		this.hB = hB;
		this.hW = hW;
		this.overlay = overlay;
	},
	properties: {
		posA: {
			type: Array,
			value: function() { return [200, -100]; },
		},
		posB: {
			type: Array,
			value: function() { return [400, 300]; },
		}
	},
	observers: [
		"_onPosChange(posA, posB)"
	],
	_onPosChange(posA, posB) {
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

		this.indicators.style.width = width + "px";
		this.indicators.style.height = height + "px";

		this.overlay.style.width = width + "px";
		this.overlay.style.height = height + "px";

		// Get relative positions (round them to stop the not moving
		// connector being slightly moved out of position).
		var aX = Math.round(posA[0] - left);
		var aY = Math.round(posA[1] - top);
		var bX = Math.round(posB[0] - left);
		var bY = Math.round(posB[1] - top);

		// Conector A position
		this.iA.setAttribute("cx", aX);
		this.iA.setAttribute("cy", aY);
		this.hA.setAttribute("cx", aX);
		this.hA.setAttribute("cy", aY);

		// Conector B position
		this.iB.setAttribute("cx", bX);
		this.iB.setAttribute("cy", bY);
		this.hB.setAttribute("cx", bX);
		this.hB.setAttribute("cy", bY);

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

		this.iW.setAttribute("d", attribute);
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
	},
	_onEnterConnector: function(e) {
		var el = e.target === this.hA ? this.iA : this.iB;
		el.classList.add("enter");
		this.style.cursor = this.enterConnectorCursor;
	},
	_onOutConnector: function(e) {
		var el = e.target === this.hB ? this.iA : this.iB;
		el.classList.remove("enter");
		this.style.cursor = "";
	},
	_onDragConnector: function( e ) {
		if (3 === e.which || 2 === e.which) {
			return;
		}
		e.stopPropagation();
		this.style.cursor = this.draggingCursor;
		var el = e.target === this.hA ? this.iA : this.iB;
		Editor.UI.DomUtils.startDrag(this.draggingCursor, e, function( e, dx, dy ) {
			el.classList.add("dragging");
			if (el === this.iA) {
				this.posA = [this.posA[0] + dx, this.posA[1] + dy];
			} else {
				this.posB = [this.posB[0] + dx, this.posB[1] + dy];
			}
		}.bind(this), function( e ) {
			el.classList.remove("dragging");
			this.style.cursor = "";
		}.bind(this));
	},
	_onEnterWire: function(e) {
		var el = this.iW;
		el.classList.add("enter");
		this.style.cursor = this.enterWireCursor;
	},
	_onOutWire: function(e) {
		var el = this.iW;
		el.classList.remove("enter");
		this.style.cursor = "";
	}
});

})();
