/* DJELIX: der Himmel hinter der Wand.
   Ein einziger Fragment-Shader rechnet die ganze Nacht:
   H = 0 Sonnenuntergang am Meer, 1 Nacht mit Mond, 2 Club in Rot, 3 Club in Schwarz, 4 Sonnenaufgang in den Bergen.
   Sky.create(canvas) liefert { render(hour, seconds), resize(scale), gl } oder null ohne WebGL. */
(() => {
  const FRAG = `
precision highp float;
uniform vec2 R; uniform float T; uniform float H; uniform float LOOP; uniform float ZOOM; uniform vec2 PAN;
const float PI = 3.14159265;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
}
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return s; }
float fbm3(vec2 p){ float a=.5, s=0.; for(int i=0;i<3;i++){ s+=a*noise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return s; }
float ridge(vec2 p){ float a=.5, s=0.; for(int i=0;i<6;i++){ s+=a*(1.-abs(noise(p)*2.-1.)); p=p*2.1+vec2(3.,7.); a*=.5; } return s; }
vec3 hex(float r,float g,float b){ return vec3(r,g,b)/255.; }

/* Es Vedra und Es Vedranell als Profil, x in Bildschirmeinheiten */
float rockProfile(float x, float a){
  float cx = .31*a;
  float d = x-cx;
  float side = d<0. ? .25 : .17;
  float main = .225*pow(max(0.,1.-abs(d)/side),.85);
  float small = .085*pow(max(0.,1.-abs(x-(cx-.27))/.085),.8);
  float detail = (ridge(vec2(x*9.,1.3))-.6)*.05*smoothstep(0.,.05,main+small);
  return max(main,small)+detail;
}

vec3 sunsetSky(vec2 p, float y0){
  float t = clamp((p.y-y0)/.68,0.,1.);
  vec3 c = mix(hex(255.,140.,40.), hex(255.,84.,38.), smoothstep(0.,.13,t));
  c = mix(c, hex(226.,46.,78.), smoothstep(.1,.36,t));
  c = mix(c, hex(120.,38.,92.), smoothstep(.32,.68,t));
  c = mix(c, hex(30.,38.,84.), smoothstep(.62,1.,t));
  return c;
}
vec3 sunset(vec2 p, float a){
  float y0=-.16;
  vec2 sun=vec2(-.06*a,y0+.075);
  float d=length(p-sun);
  vec3 c;
  if(p.y>y0){
    c=sunsetSky(p,y0);
    /* Wolkenbaender, von unten angeleuchtet */
    float band=fbm(vec2(p.x*1.5+T*.006,p.y*8.5-T*.002));
    float m=smoothstep(.46,.68,band)*smoothstep(y0-.02,y0+.08,p.y)*(1.-smoothstep(.2,.42,p.y));
    float lit=smoothstep(.0,.55,1.-length(p-sun)*1.3);
    c=mix(c,mix(hex(120.,28.,70.),hex(255.,150.,70.),lit),m*.85);
    c+=hex(255.,120.,40.)*exp(-d*3.2)*.55;
    c+=hex(255.,214.,140.)*exp(-d*9.)*.8;
    float disc=smoothstep(.096,.092,d);
    c=mix(c,mix(hex(255.,236.,170.),hex(255.,170.,70.),smoothstep(-.09,.1,sun.y-p.y+.03)),disc);
    /* Felsen */
    float h=rockProfile(p.x,a);
    if(p.y<y0+h){
      float rim=smoothstep(.0,.05,sun.x-p.x+.25)*.0;
      vec3 rock=mix(hex(58.,20.,44.),hex(24.,12.,30.),smoothstep(0.,.2,p.y-y0));
      float strata=ridge(vec2(p.x*7.+p.y*5.,p.y*16.));
      rock+=hex(255.,96.,58.)*.3*smoothstep(.62,.95,strata)*(1.-smoothstep(.0,.17,p.y-y0)*.75);
      c=mix(c,rock,smoothstep(y0+h,y0+h-.003,p.y));
    }
  } else {
    float dd=y0-p.y;
    float w=1./(dd+.05);
    float n=fbm3(vec2(p.x*w*1.1,w*2.2+T*.25));
    float n2=noise(vec2(p.x*w*5.,w*9.+T*.6));
    vec2 q=vec2(p.x+(n-.5)*dd*.55,y0+dd*1.35+(n2-.5)*dd*.12);
    c=sunsetSky(q,y0)*.8;
    c=mix(c,hex(70.,22.,58.),smoothstep(.0,.42,dd)*.75);
    /* Sonnenbahn auf dem Wasser */
    float wid=.05+dd*.62;
    float path=exp(-pow((p.x-sun.x)/wid,2.));
    float glit=smoothstep(.42,.74,noise(vec2(p.x*w*7.,w*15.+T*1.1)));
    c+=hex(255.,176.,84.)*path*glit*1.25*(1.-smoothstep(.1,.42,dd)*.45);
    c+=hex(255.,120.,50.)*path*.2;
    /* Spiegelung des Felsens */
    float h=rockProfile(p.x+(n-.5)*dd*.3,a);
    float rf=smoothstep(.02,-.01,dd*1.25-h);
    c=mix(c,hex(30.,14.,34.),rf*.82);
  }
  return c;
}

vec3 nightSky(vec2 p, float y0){
  float t=clamp((p.y-y0)/.7,0.,1.);
  vec3 c=mix(hex(20.,58.,104.),hex(9.,30.,66.),smoothstep(0.,.5,t));
  return mix(c,hex(5.,14.,36.),smoothstep(.45,1.,t));
}
vec3 night(vec2 p, float a){
  float y0=-.16;
  vec2 moon=vec2(-.3*a,.29);
  float d=length(p-moon);
  vec3 c;
  if(p.y>y0){
    c=nightSky(p,y0);
    vec2 g=p*vec2(95.); vec2 id=floor(g);
    float s=hash(id);
    if(s>.982){ float tw=.55+.45*sin(T*(1.+3.*s)+s*40.); c+=vec3(.95,.97,1.)*smoothstep(.12,.0,length(fract(g)-.5))*tw*(s-.97)*40.*smoothstep(y0,y0+.25,p.y); }
    float cl=smoothstep(.5,.72,fbm(vec2(p.x*1.3+T*.005+5.,p.y*5.)));
    c=mix(c,hex(40.,78.,120.),cl*.32*exp(-d*1.6));
    c+=hex(120.,170.,220.)*exp(-d*3.6)*.32;
    float disc=smoothstep(.062,.058,d);
    float maria=fbm3((p-moon)*22.);
    c=mix(c,mix(hex(255.,250.,232.),hex(196.,206.,214.),smoothstep(.4,.62,maria)),disc);
    float h=rockProfile(p.x,a);
    if(p.y<y0+h){ c=mix(c,hex(4.,10.,24.),smoothstep(y0+h,y0+h-.003,p.y)); }
  } else {
    float dd=y0-p.y;
    float w=1./(dd+.05);
    float n=fbm3(vec2(p.x*w*1.1,w*2.2+T*.18));
    vec2 q=vec2(p.x+(n-.5)*dd*.5,y0+dd*1.2);
    c=nightSky(q,y0)*.72;
    c=mix(c,hex(4.,14.,34.),smoothstep(0.,.36,dd));
    float wid=.03+dd*.34;
    float path=exp(-pow((p.x-moon.x)/wid,2.));
    float glit=smoothstep(.5,.8,noise(vec2(p.x*w*7.,w*15.+T*.8)));
    c+=hex(214.,232.,250.)*path*glit*.95;
    float h=rockProfile(p.x+(n-.5)*dd*.3,a);
    c=mix(c,hex(3.,8.,20.),smoothstep(.02,-.01,dd*1.25-h)*.8);
  }
  return c;
}

float capsule(vec2 p, vec2 a, vec2 b, float r){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }

/* Eine Reihe Koepfe und Schultern, manche Arme oben. */
float crowdRow(vec2 p, float scale, float base, float seed, float beat){
  vec2 q=(p-vec2(seed*3.,base))/scale;
  float cell=floor(q.x/.82); float dist=1e3;
  for(float k=-1.;k<=1.;k+=1.){
    float id=cell+k;
    float r=hash(vec2(id,seed+1.));
    float r2=hash(vec2(id,seed+7.));
    float cx=(id+.5+(r-.5)*.55)*.82;
    float bob=abs(sin(beat+r*6.283))*.09;
    float hy=.04+r2*.34+bob;
    vec2 head=vec2(cx+sin(beat*.5+r*9.)*.05,hy);
    dist=min(dist,length((q-head)*vec2(1.08,.92))-.2);
    dist=min(dist,capsule(q,head+vec2(-.36,-.5),head+vec2(.36,-.5),.26));
    dist=min(dist,capsule(q,head+vec2(0.,-.12),head+vec2(0.,-.4),.12));
    dist=min(dist,capsule(q,head+vec2(0.,-.6),head+vec2(0.,-2.4),.46));
    if(r>.58){
      float sway=sin(beat*.5+r*20.)*.16;
      float side=r2>.5?1.:-1.;
      vec2 sh=head+vec2(side*.5,-.48);
      vec2 el=sh+vec2(side*(.12+r*.16)+sway*.3,.52);
      vec2 ha=el+vec2(side*-.1+sway,.56+r2*.3);
      dist=min(dist,capsule(q,sh,el,.085));
      dist=min(dist,capsule(q,el,ha,.055));
      dist=min(dist,length((q-ha-vec2(0.,.06))*vec2(1.,.72))-.07);
    }
  }
  return dist*scale;
}

vec3 club(vec2 p, float a, vec3 tint, vec3 tint2, float dark){
  float l=LOOP;
  vec2 circ=vec2(cos(l),sin(l))*.5;
  float s=fbm(p*vec2(1.9,2.4)+circ+vec2(0.,-p.y*.4));
  float s2=fbm3(p*vec2(3.6,4.4)-circ*1.4+vec2(4.,1.));
  float smoke=smoothstep(.22,.82,s*.72+s2*.42);
  vec3 c=mix(hex(6.,4.,8.),tint*.1,smoke*dark);
  float sumB=0.;
  float top=.64;
  for(float i=0.;i<10.;i+=1.){
    float u=(i+.5)/10.;
    vec2 o=vec2((u-.5)*min(a,1.6)*1.3,top+.02*sin(i*3.));
    float ang=(u-.5)*1.5*(1.+.26*sin(l+i*1.7))+.34*sin(l*2.+i*2.4);
    vec2 dir=normalize(vec2(sin(ang),-cos(ang)));
    vec2 d=p-o;
    float al=dot(d,dir);
    float pe=abs(d.x*dir.y-d.y*dir.x);
    float wid=.003+.05*max(al,0.);
    float b=exp(-pow(pe/wid,2.))*smoothstep(-.02,.04,al)*exp(-al*.72);
    float ph=.5+.5*sin(l*3.+i*2.1);
    ph=ph*ph;
    float tex=.55+.9*fbm3(vec2(pe*16./(wid*40.+.2),al*5.)+circ*2.);
    sumB+=b*ph;
    c+=mix(tint,tint2,step(.5,fract(i*.5)))*b*ph*tex*(.36+smoke*1.1);
    float core=exp(-pow(pe/(wid*.16),2.))*smoothstep(-.01,.03,al)*exp(-al*1.4);
    c+=mix(tint,vec3(1.),.35)*core*ph*.34;
    float lamp=length(d)*34.;
    c+=mix(tint,vec3(1.),.5)*exp(-lamp*lamp*.5)*(.6+ph);
    c+=tint*exp(-length(d)*11.)*.28*ph;
  }
  /* Laser, duenn und hart */
  for(float i=0.;i<4.;i+=1.){
    vec2 o=vec2((i-1.5)*.22*min(a,1.6),top+.03);
    float ang=sin(l*2.+i*2.)*.9+(i-1.5)*.32;
    vec2 dir=vec2(sin(ang),-cos(ang));
    vec2 d=p-o; float al=dot(d,dir);
    float pe=abs(d.x*dir.y-d.y*dir.x);
    float on=smoothstep(.1,.6,sin(l*4.+i*1.3));
    c+=mix(tint,vec3(1.),.45)*exp(-pe*pe/.0000022)*smoothstep(0.,.04,al)*exp(-al*.9)*on*.75;
  }
  /* Bodennebel, von hinten beleuchtet */
  float glow=exp(-pow((p.y+.24)/.22,2.));
  c+=tint*glow*(.22+.34*smoke);
  /* Menge */
  float beat=l*8.;
  float m1=crowdRow(p,.07,-.255,1.,beat);
  float m2=crowdRow(p,.105,-.33,2.,beat+1.2);
  float m3=crowdRow(p,.165,-.455,3.,beat+2.1);
  vec3 back=tint*.13+hex(12.,8.,12.);
  c=mix(c,back,smoothstep(.002,-.002,m1)*.92);
  c=mix(c,hex(12.,7.,10.)+tint*.045,smoothstep(.003,-.003,m2));
  c=mix(c,hex(4.,3.,5.),smoothstep(.011,-.011,m3));
  c+=tint*smoothstep(.016,.0,abs(m2))*.07;
  return c;
}

float layer(float x, float seed, float amp, float f){ return (ridge(vec2(x*f+seed,seed*.7))-.55)*amp; }
vec3 dawn(vec2 p, float a){
  float t=clamp((p.y+.3)/.85,0.,1.);
  vec3 c=mix(hex(255.,214.,170.),hex(255.,176.,178.),smoothstep(0.,.34,t));
  c=mix(c,hex(244.,160.,186.),smoothstep(.3,.62,t));
  c=mix(c,hex(150.,176.,214.),smoothstep(.6,1.,t));
  vec2 sun=vec2(.2*a,-.015);
  float d=length(p-sun);
  c+=hex(255.,214.,150.)*exp(-d*3.4)*.72;
  c+=hex(255.,246.,214.)*exp(-d*11.);
  c=mix(c,hex(255.,250.,232.),smoothstep(.058,.054,d));
  float cl=smoothstep(.5,.74,fbm(vec2(p.x*1.1-T*.005,p.y*6.+2.)));
  c=mix(c,hex(255.,226.,214.),cl*.62*smoothstep(.0,.2,p.y));
  float h1=-.02+layer(p.x,3.1,.32,1.25);
  float h2=-.13+layer(p.x,7.7,.27,1.6);
  float h3=-.25+layer(p.x,12.3,.22,2.1);
  float h4=-.37+layer(p.x,19.1,.16,3.1);
  vec3 c1=hex(226.,142.,164.), c2=hex(172.,92.,128.), c3=hex(104.,54.,96.), c4=hex(44.,24.,54.);
  vec2 sn=vec2(p.x*30.,p.y*60.);
  float snow=smoothstep(.0,.14,p.y-(h1-.09))*smoothstep(.42,.6,fbm3(sn*.3));
  if(p.y<h1){ c=mix(c,mix(c1,hex(255.,226.,226.),snow*.75),smoothstep(h1,h1-.002,p.y)); }
  c=mix(c,hex(255.,214.,206.),exp(-pow((p.y-(h2-.02))/.05,2.))*.3);
  if(p.y<h2){ c=mix(c,c2+hex(255.,180.,170.)*.12*fbm3(p*14.),smoothstep(h2,h2-.002,p.y)); }
  c=mix(c,hex(255.,204.,204.),exp(-pow((p.y-(h3-.02))/.04,2.))*.22);
  if(p.y<h3){ c=mix(c,c3,smoothstep(h3,h3-.002,p.y)); }
  if(p.y<h4){
    c=mix(c,c4,smoothstep(h4,h4-.002,p.y));
    vec2 g=p*vec2(70.,140.); vec2 id=floor(g);
    float s=hash(id+3.);
    if(s>.962 && p.y<h4-.02 && p.y>-.5) c+=hex(255.,214.,150.)*smoothstep(.34,.0,length(fract(g)-.5))*.8;
  }
  return c;
}

vec3 scene(float i, vec2 p, float a){
  if(i<.5) return sunset(p,a);
  if(i<1.5) return night(p,a);
  if(i<2.5) return club(p,a,hex(255.,22.,58.),hex(255.,90.,60.),1.);
  if(i<3.5) return club(p,a,hex(196.,226.,255.),hex(255.,255.,255.),.55);
  return dawn(p,a);
}

void main(){
  float a=R.x/R.y;
  vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
  float tall=max(1.,1./a);
  p*=tall;
  float wa=a*tall;
  p=p/ZOOM+PAN;
  float hh=clamp(H,0.,4.);
  float i0=floor(hh); float f=hh-i0;
  f=smoothstep(.12,.88,f);
  vec3 c=scene(i0,p,wa);
  if(f>.001) c=mix(c,scene(i0+1.,p,wa),f);
  c=pow(max(c,0.),vec3(.96));
  float g=hash(gl_FragCoord.xy*.73+fract(T)*9.);
  c+=(g-.5)*.014;
  gl_FragColor=vec4(c,1.);
}`;
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  function create(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.keep });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {}; for (const n of ['R', 'T', 'H', 'LOOP', 'ZOOM', 'PAN']) u[n] = gl.getUniformLocation(pr, n);
    const api = {
      gl,
      resize(w, h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(u.R, w, h); },
      render(hour, sec, view = {}) {
        gl.uniform1f(u.H, hour); gl.uniform1f(u.T, sec);
        gl.uniform1f(u.LOOP, view.loop ?? (sec / 16) * Math.PI * 2);
        gl.uniform1f(u.ZOOM, view.zoom ?? 1); gl.uniform2f(u.PAN, view.panX ?? 0, view.panY ?? 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
    return api;
  }
  window.Sky = { create };
})();
