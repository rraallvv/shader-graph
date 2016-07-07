require = (function e(t, n, r) {
    function s(o, u) {
        if (!n[o]) {
            if (!t[o]) {
                var a = typeof require == 'function' && require;
                if (!u && a)
                    return a(o, !0);
                if (i)
                    return i(o, !0);
                var f = new Error('Cannot find module \'' + o + '\'');
                throw f.code = 'MODULE_NOT_FOUND', f;
            }
            var l = n[o] = {
                exports: {}
            };
            t[o][0].call(l.exports, function (e) {
                var n = t[o][1][e];
                return s(n ? n : e);
            }, l, l.exports, e, t, n, r);
        }
        return n[o].exports;
    }
    var i = typeof require == 'function' && require;
    for (var o = 0; o < r.length; o++)
        s(r[o]);
    return s;
})({
    "Effect_Preview": [function (require, module, exports) {
        "use strict";
        cc._RFpush(module, '414458STphLF75+aFmYFzfh', 'Effect_Preview');
        // Script/Effect_Preview.js

        var _default_vert = require("../Shaders/ccShader_Default_Vert.js");
        var _default_vert_no_mvp = require("../Shaders/ccShader_Default_Vert_noMVP.js");

        var EffectPreview = cc.Class({
            "extends": cc.Component,

            properties: {
                isAllChildrenUser: false,
				frag_glsl: {
					"default": "EffectPreview.fs.glsl",
					visible: false
				}
			},

            onLoad: function onLoad() {
				var self = this;
				cc.loader.loadRes(self.frag_glsl, function (err, txt) {
					if (err) {
						cc.log(err);
					} else {
						self.frag_glsl = txt;
						self._use();
					}
				});
            },

            _use: function _use() {
                this._program = new cc.GLProgram();
                if (cc.sys.isNative) {
                    cc.log("use native GLProgram");
                    this._program.initWithString(_default_vert_no_mvp, this.frag_glsl);
                    this._program.link();
                    this._program.updateUniforms();
                } else {
                    this._program.initWithVertexShaderByteArray(_default_vert, this.frag_glsl);
                    this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_POSITION, cc.macro.VERTEX_ATTRIB_POSITION);
                    this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_COLOR, cc.macro.VERTEX_ATTRIB_COLOR);
                    this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_TEX_COORD, cc.macro.VERTEX_ATTRIB_TEX_COORDS);
                    this._program.link();
                    this._program.updateUniforms();
                }
                this.setProgram(this.node._sgNode, this._program);
            }
            , setProgram: function setProgram(node, program) {

                if (cc.sys.isNative) {
                    var glProgram_state = cc.GLProgramState.getOrCreateWithGLProgram(program);
                    node.setGLProgramState(glProgram_state);
                } else {
                    node.setShaderProgram(program);
                }

                var children = node.children;
                if (!children) return;

                for (var i = 0; i < children.length; i++) {
                    this.setProgram(children[i], program);
                }
            }

        });

        cc.EffectPreview = module.exports = EffectPreview;

        cc._RFpop();
}, {
        "../Shaders/ccShader_Default_Vert.js": "ccShader_Default_Vert"
        , "../Shaders/ccShader_Default_Vert_noMVP.js": "ccShader_Default_Vert_noMVP"
    }]
    , "ccShader_Default_Vert_noMVP": [function (require, module, exports) {
        "use strict";
        cc._RFpush(module, '43902EEq9hDVIWH7OBEhbvT', 'ccShader_Default_Vert_noMVP');
        // Shaders/ccShader_Default_Vert_noMVP.js

        module.exports = "\nattribute vec4 a_position;\n attribute vec2 a_texCoord;\n attribute vec4 a_color;\n varying vec2 v_texCoord;\n varying vec4 v_fragmentColor;\n void main()\n {\n     gl_Position = CC_PMatrix  * a_position;\n     v_fragmentColor = a_color;\n     v_texCoord = a_texCoord;\n }\n";

        cc._RFpop();
}, {}]
    , "ccShader_Default_Vert": [function (require, module, exports) {
        "use strict";
        cc._RFpush(module, '440f5W7uvVNAaZx4ALzoZN8', 'ccShader_Default_Vert');
        // Shaders/ccShader_Default_Vert.js

        module.exports = "\nattribute vec4 a_position;\nattribute vec2 a_texCoord;\nattribute vec4 a_color;\nvarying vec2 v_texCoord;\nvarying vec4 v_fragmentColor;\nvoid main()\n{\n    gl_Position = ( CC_PMatrix * CC_MVMatrix ) * a_position;\n    v_fragmentColor = a_color;\n    v_texCoord = a_texCoord;\n}\n";

        cc._RFpop();
}, {}]
}, {}, ["Effect_Preview"])
