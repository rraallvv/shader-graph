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
    "Avg_Black_White": [function (require, module, exports) {
        "use strict";
        cc._RFpush(module, '414458STphLF75+aFmYFzfh', 'Avg_Black_White');
        // Script/Avg_Black_White.js

        var _default_vert = require("../Shaders/ccShader_Default_Vert.js");
        var _default_vert_no_mvp = require("../Shaders/ccShader_Default_Vert_noMVP.js");
        var _black_white_frag = require("../Shaders/ccShader_Avg_Black_White_Frag.js");

        var EffectBlackWhite = cc.Class({
            "extends": cc.Component,

            properties: {
                isAllChildrenUser: false
            },

            onLoad: function onLoad() {
                this._use();
            },

            _use: function _use() {
                this._program = new cc.GLProgram();
                if (cc.sys.isNative) {
                    cc.log("use native GLProgram");
                    this._program.initWithString(_default_vert_no_mvp, _black_white_frag);
                    this._program.link();
                    this._program.updateUniforms();
                } else {
                    this._program.initWithVertexShaderByteArray(_default_vert, _black_white_frag);
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

        cc.BlackWhite = module.exports = EffectBlackWhite;

        cc._RFpop();
}, {
        "../Shaders/ccShader_Avg_Black_White_Frag.js": "ccShader_Avg_Black_White_Frag"
        , "../Shaders/ccShader_Default_Vert.js": "ccShader_Default_Vert"
        , "../Shaders/ccShader_Default_Vert_noMVP.js": "ccShader_Default_Vert_noMVP"
    }]
    , "ccShader_Avg_Black_White_Frag": [function (require, module, exports) {
        "use strict";
        cc._RFpush(module, '1a2e0lgfLVJ2Z1JCdcFAr8X', 'ccShader_Avg_Black_White_Frag');
        // Shaders/ccShader_Avg_Black_White_Frag.js

        /* 平均值黑白 */
        module.exports = "\n#ifdef GL_ES\nprecision mediump float;\n#endif\nvarying vec2 v_texCoord;\nvoid main()\n{\n    vec4 v = texture2D(CC_Texture0, v_texCoord).rgba;\n    float f = (v.r + v.g + v.b) / 3.0;\n    gl_FragColor = vec4(f, f, f, v.a);\n}\n";

        cc._RFpop();
}, {}]
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
}, {}, ["Avg_Black_White"])
