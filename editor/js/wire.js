(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	ready: function() {
		this.$.A.addEventListener("mousedown", this._onDragConnector.bind( this ), true);
		this.$.B.addEventListener("mousedown", this._onDragConnector.bind( this ), true);
		this.style.pointerEvents = "none";
		this.$.A.style.pointerEvents = "all";
		this.$.B.style.pointerEvents = "all";
		this.$.W.style.pointerEvents = "visibleStroke";
	},
	created: function() {
		// Get connector styling
		var style = this._getStyleRule(".connector." + this.tagName) || {};
		var strokeWidth = parseFloat(style["stroke-width"] || 1);
		var radius = parseFloat(style.r || 0);
		this.radius = strokeWidth + radius;

		// Get path styling
		style = this._getStyleRule(".wire." + this.tagName) || {};
		this.strokeWidth = parseFloat(style["stroke-width"] || 1);

		this.curviness = 200;
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
		'_onPosChange(posA, posB)'
	],
	_onPosChange(posA, posB) {
		// Bounding box for connectors
		var left = Math.min( posA[ 0 ], posB[ 0 ] );
		var top = Math.min( posA[ 1 ], posB[ 1 ] );
		var width = Math.abs( posA[ 0 ] - posB[ 0 ] );
		var height = Math.abs( posA[ 1 ] - posB[ 1 ] );

		// Bounding box with wire and connector circle
		var bb = this._bezierBoundingBox( posA[ 0 ] - left, posA[ 1 ] - top,
			posA[ 0 ] - left + this.curviness, posA[ 1 ] - top,
			posB[ 0 ] - left - this.curviness, posB[ 1 ] - top,
			posB[ 0 ] - left, posB[ 1 ] - top );

		var radiusx2 = 2 * this.radius;

		left = Math.min(left - this.radius, left + bb.left - 0.5 * this.strokeWidth);
		top = Math.min(top - this.radius, top + bb.top);
		width = Math.max(width + radiusx2, bb.right - bb.left + this.strokeWidth);
		height = Math.max(height + radiusx2, bb.bottom - bb.top);

		// Element position and size
		this.style.left = left + "px";
		this.style.top = top + "px";

		this.style.width = width + "px";
		this.style.height = height + "px";

		// Get relative positions (round them to stop the not moving
		// connector being slightly moved out of position).
		var aX = Math.round(posA[0] - left);
		var aY = Math.round(posA[1] - top);
		var bX = Math.round(posB[0] - left);
		var bY = Math.round(posB[1] - top);

		// Conector A position
		this.$.A.setAttribute("cx", aX);
		this.$.A.setAttribute("cy", aY);

		// Conector B position
		this.$.B.setAttribute("cx", bX);
		this.$.B.setAttribute("cy", bY);

		// Wire position
		this.$.W.setAttribute("d", "M " +
			// A
			aX + " " + aY + " " +
			// control A
			" C " + (aX + this.curviness) + " " + aY + " " +
			// control B
			(bX - this.curviness) + " " + bY + " " +
			// B
			bX + " " + bY);
	},
	_getStyleRule: function(selector) {
		for (var i = 0; i < document.styleSheets.length; i++) {
			var sheet = document.styleSheets[i];
			var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
			for (var j = 0; j < rules.length; j++) {
				if (rules[j].selectorText && rules[j].selectorText.toLowerCase() === selector.toLowerCase()) {
					return rules[j].style;
				}
			}

		}
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
	_onDragConnector: function( e ) {
		if (3 === e.which || 2 === e.which) {
			return;
		}
		e.stopPropagation();
		this.style.cursor = "pointer";
		var el = e.target;
		Editor.UI.DomUtils.startDrag("pointer", e, function( e, dx, dy ) {
			el.classList.add("dragging");
			if (el.id === "A") {
				this.posA = [this.posA[0] + dx, this.posA[1] + dy];
			} else {
				this.posB = [this.posB[0] + dx, this.posB[1] + dy];
			}
		}.bind(this), function( e ) {
			el.classList.remove("dragging");
			this.style.cursor = "";
		}.bind(this));
	}
});

})();
