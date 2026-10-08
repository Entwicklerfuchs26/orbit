package space.sternenhof.wallpaper;

import java.util.HashMap;
import java.util.Map;

/**
 * GLSL ES 2.0 shaders for the live wallpaper — ported 1:1 from the web
 * (src/core/gl-transition.ts). Each transition defines `vec4 transition(vec2)`
 * with getFromColor/getToColor + a `progress` uniform (gl-transitions convention).
 */
final class GlShaders {
    private GlShaders() {}

    static final String VERT =
        "attribute vec2 aPos;\n" +
        "varying vec2 vUv;\n" +
        "void main() {\n" +
        "  vUv = aPos * 0.5 + 0.5;\n" +
        "  gl_Position = vec4(aPos, 0.0, 1.0);\n" +
        "}";

    // Simple passthrough used to draw a single static image (and as fade base).
    static final String FRAG_IMAGE =
        "precision highp float;\n" +
        "uniform sampler2D uTex;\n" +
        "uniform vec2 uScale;\n" +
        "varying vec2 vUv;\n" +
        "void main() { vec2 c = 0.5 + (vUv - 0.5) * uScale; gl_FragColor = texture2D(uTex, vec2(c.x, 1.0 - c.y)); }";

    // Video passthrough (external OES sampler).
    static final String FRAG_OES =
        "#extension GL_OES_EGL_image_external : require\n" +
        "precision highp float;\n" +
        "uniform samplerExternalOES uTex;\n" +
        "uniform vec2 uScale;\n" +
        "uniform mat4 uSTMatrix;\n" +
        "varying vec2 vUv;\n" +
        "void main() { vec2 c = 0.5 + (vUv - 0.5) * uScale;" +
        " vec2 tc = (uSTMatrix * vec4(c, 0.0, 1.0)).xy;" +
        " gl_FragColor = texture2D(uTex, tc); }";

    static final Map<String, String> BODIES = new HashMap<>();
    static {
        BODIES.put("fade",
            "vec4 transition(vec2 p){ return mix(getFromColor(p), getToColor(p), progress); }");
        BODIES.put("crosswarp",
            "vec4 transition(vec2 p){ float x=progress; x=smoothstep(0.0,1.0,x*2.0+p.x-1.0);" +
            " return mix(getFromColor((p-0.5)*(1.0-x)+0.5), getToColor((p-0.5)*x+0.5), x); }");
        BODIES.put("morph",
            "vec4 transition(vec2 p){ float strength=0.1; vec4 ca=getFromColor(p); vec4 cb=getToColor(p);" +
            " vec2 oa=((ca.rg+ca.b)*0.5)*2.0-1.0; vec2 ob=((cb.rg+cb.b)*0.5)*2.0-1.0;" +
            " vec2 oc=mix(oa,ob,0.5)*strength; float w0=progress;" +
            " return mix(getFromColor(p+oc*w0), getToColor(p-oc*(1.0-w0)), progress); }");
        BODIES.put("pixelize",
            "vec4 transition(vec2 uv){ vec2 squaresMin=vec2(20.0); float steps=50.0;" +
            " float d=min(progress,1.0-progress); float dist=steps>0.0?ceil(d*steps)/steps:d;" +
            " vec2 squareSize=2.0*dist/squaresMin; vec2 p=dist>0.0?(floor(uv/squareSize)+0.5)*squareSize:uv;" +
            " return mix(getFromColor(p), getToColor(p), progress); }");
        BODIES.put("dreamy",
            "vec2 dreamOffset(float pr,float x){ float s=0.03*pr*cos(10.0*(pr+x)); return vec2(0.0,s); }" +
            "vec4 transition(vec2 p){ return mix(getFromColor(p+dreamOffset(progress,p.x))," +
            " getToColor(p+dreamOffset(1.0-progress,p.x)), progress); }");
        BODIES.put("windowslice",
            "vec4 transition(vec2 p){ float count=10.0; float sm=0.5;" +
            " float pr=smoothstep(-sm,0.0,p.x-progress*(1.0+sm)); float s=step(pr,fract(count*p.x));" +
            " return mix(getFromColor(p), getToColor(p), s); }");
        BODIES.put("directionalwarp",
            "vec4 transition(vec2 uv){ vec2 dir=vec2(-1.0,1.0); float sm=0.5; vec2 v=normalize(dir);" +
            " v/=abs(v.x)+abs(v.y); float d=v.x*0.5+v.y*0.5;" +
            " float m=1.0-smoothstep(-sm,0.0,v.x*uv.x+v.y*uv.y-(d-0.5+progress*(1.0+sm)));" +
            " return mix(getFromColor((uv-0.5)*(1.0-m)+0.5), getToColor((uv-0.5)*m+0.5), m); }");
        BODIES.put("ripple",
            "vec4 transition(vec2 uv){ vec2 dir=uv-vec2(0.5); float dist=length(dir);" +
            " vec2 offset=dir*(sin(progress*dist*80.0-progress*40.0)+0.5)/30.0;" +
            " return mix(getFromColor(uv+offset), getToColor(uv), smoothstep(0.2,1.0,progress)); }");
        BODIES.put("swirl",
            "vec4 transition(vec2 uv){ float radius=1.0; vec2 p=uv-0.5; float d=length(p*vec2(ratio,1.0));" +
            " if(d<radius){ float t=(radius-d)/radius;" +
            " float a=(progress<=0.5?progress:1.0-progress)*t*t*8.0*3.14159; float s=sin(a); float c=cos(a);" +
            " p=vec2(p.x*c-p.y*s, p.x*s+p.y*c); } p+=0.5;" +
            " return mix(getFromColor(p), getToColor(p), progress); }");
        BODIES.put("crosshatch",
            "vec4 transition(vec2 p){ float dist=distance(vec2(0.5),p)/3.0;" +
            " float r=progress-min(random(vec2(p.y,0.0)), random(vec2(0.0,p.x)));" +
            " return mix(getFromColor(p), getToColor(p), mix(0.0, mix(step(dist,r),1.0,smoothstep(0.7,1.0,progress)), smoothstep(0.0,0.1,progress))); }");
        BODIES.put("wind",
            "vec4 transition(vec2 uv){ float size=0.2; float r=random(vec2(0.0,uv.y));" +
            " float m=smoothstep(0.0,-size,uv.x*(1.0-size)+size*r-progress*(1.0+size));" +
            " return mix(getFromColor(uv), getToColor(uv), m); }");
        BODIES.put("iris",
            "vec4 transition(vec2 uv){ float sm=0.25; float dist=distance(uv,vec2(0.5))*1.41421356;" +
            " float m=smoothstep(progress-sm,progress+sm,dist);" +
            " return mix(getToColor(uv), getFromColor(uv), m); }");
        BODIES.put("polka",
            "vec4 transition(vec2 uv){ float dots=20.0; float d=max(distance(uv,vec2(0.0)),0.001);" +
            " bool next=distance(fract(uv*dots),vec2(0.5))<(progress/d);" +
            " return next?getToColor(uv):getFromColor(uv); }");
        // CSS-style transitions, expressed as shaders so everything shares one path.
        BODIES.put("slide",
            "vec4 transition(vec2 p){ float x=p.x+progress-1.0;" +
            " if(x<0.0) return getToColor(vec2(p.x+progress,p.y)); else return getFromColor(vec2(x,p.y)); }");
        BODIES.put("wipe",
            "vec4 transition(vec2 p){ return p.x<progress ? getToColor(p) : getFromColor(p); }");
        BODIES.put("zoom",
            "vec4 transition(vec2 p){ float s=mix(1.15,1.0,progress); vec2 q=(p-0.5)/s+0.5;" +
            " return mix(getFromColor(p), getToColor(q), progress); }");
    }

    static String fragmentFor(String body) {
        return
            "precision highp float;\n" +
            "uniform sampler2D uFrom;\n" +
            "uniform sampler2D uTo;\n" +
            "uniform float progress;\n" +
            "uniform float ratio;\n" +
            "uniform vec2 uFromScale;\n" +
            "uniform vec2 uToScale;\n" +
            "varying vec2 vUv;\n" +
            "vec4 getFromColor(vec2 uv){ vec2 c=0.5+(uv-0.5)*uFromScale; return texture2D(uFrom, vec2(c.x,1.0-c.y)); }\n" +
            "vec4 getToColor(vec2 uv){ vec2 c=0.5+(uv-0.5)*uToScale; return texture2D(uTo, vec2(c.x,1.0-c.y)); }\n" +
            "float random(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233)))*43758.5453); }\n" +
            body + "\n" +
            "void main(){ gl_FragColor = transition(vUv); }";
    }

    static String bodyOr(String name) {
        String b = BODIES.get(name);
        return b != null ? b : BODIES.get("fade");
    }
}
