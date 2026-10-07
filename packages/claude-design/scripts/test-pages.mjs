// Local test pages for dist/project, served by `npm run serve`:
//   test/react19/<Name>.html   the preview as a consumer loads it (bundle.css, the lib files, bundle.js)
//   test/react18/<Name>.html   the same on React 18 from jsDelivr (what the Design canvas supplies)
//   test/canvas/<Name>.html    React 19, with every component and icon in its own display:contents
//                              element, as the Design canvas mounts them
//   test/gallery.html          all previews; ?v=react19|react18|canvas&theme=light|dark&only=A,B
//   test/compare.html          react19 vs canvas: boxes and key styles of every element must match; ?only=A,B
import fs from "node:fs"
import path from "node:path"

const LIB = "../../project/components"
const ICONS = `<script src="${LIB}/lib/phosphor-regular.js"></script>`
const VARIANTS = {
  react19: `<script src="${LIB}/lib/react.production.min.js"></script><script src="${LIB}/lib/react-dom.production.min.js"></script>${ICONS}`,
  react18: `<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script><script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>${ICONS}`,
}
VARIANTS.canvas = VARIANTS.react19

const CANVAS_WRAP = `<script>
(function(){var R=React,N=window.Nuzlocke,W={};
Object.keys(N).forEach(function(k){var C=N[k];
  var isComp=/^[A-Z]/.test(k)&&!/Context$/.test(k)&&(typeof C==="function"||(C&&C.$$typeof));
  if(!isComp){W[k]=C;return}
  var X=function(p){return R.createElement("div",{style:{display:"contents"},"data-canvas-wrap":k},R.createElement(C,p))};
  X.displayName="Canvas("+k+")";W[k]=X});
window.Nuzlocke=W})();
</script>`

export function writeTestPages({ dist, components }) {
  const test = path.join(dist, "test")
  for (const [variant, libs] of Object.entries(VARIANTS)) {
    fs.mkdirSync(path.join(test, variant), { recursive: true })
    for (const c of components) {
      const html = fs.readFileSync(
        path.join(dist, "project/components", c.name, "preview.html"),
        "utf8"
      )
      const head = `<link rel="stylesheet" href="${LIB}/bundle.css"><script>document.documentElement.dataset.theme=new URLSearchParams(location.search).get("theme")||"light"</script>${libs}<script src="${LIB}/bundle.js"></script>${variant === "canvas" ? CANVAS_WRAP : ""}`
      fs.writeFileSync(
        path.join(test, variant, `${c.name}.html`),
        html.replace("<head>", "<head>" + head)
      )
    }
  }
  const list = JSON.stringify(
    components.map((c) => ({ name: c.name, group: c.group, height: c.height }))
  )

  fs.writeFileSync(
    path.join(test, "gallery.html"),
    `<!doctype html><meta charset="utf-8"><title>Previews</title>
<body style="font:13px system-ui;margin:16px;background:#888"><div id="g"></div>
<style>iframe{border:1px solid #444;display:block;margin-bottom:12px;background:#fff;width:800px}h3{margin:4px 0}</style>
<script>
var q=new URLSearchParams(location.search),v=q.get("v")||"react19",th=q.get("theme")||"light",only=q.get("only");
${list}.filter(function(c){return !only||only.split(",").indexOf(c.name)>=0}).forEach(function(c){
  document.getElementById("g").insertAdjacentHTML("beforeend","<h3>"+c.name+" <small>"+c.group+" · "+c.height+"px</small></h3><iframe style='height:"+c.height+"px' src='"+v+"/"+c.name+".html?theme="+th+"'></iframe>")});
</script>`
  )

  fs.writeFileSync(
    path.join(test, "compare.html"),
    `<!doctype html><meta charset="utf-8"><title>Canvas compare</title>
<body style="font:12px monospace"><div id="frames" style="position:absolute;left:-5000px;top:0"></div><pre id="out">running…</pre>
<script>
var COMPS=${list};
var PROPS=["display","width","height","borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","paddingTop","paddingRight","paddingBottom","paddingLeft","marginLeft","marginRight","gridTemplateColumns","flexDirection","color","backgroundColor","fontSize","gap","zIndex","pointerEvents"];
function sig(doc){var out=[];doc.querySelectorAll("body *").forEach(function(el){if(el.hasAttribute("data-canvas-wrap")||el.tagName==="SCRIPT")return;var r=el.getBoundingClientRect(),cs=getComputedStyle(el);var s={el:el.tagName.toLowerCase()+(el.getAttribute("data-slot")?"["+el.getAttribute("data-slot")+"]":""),box:el.getAnimations().length?"animated":[r.x,r.y,r.width,r.height].map(Math.round).join(",")};PROPS.forEach(function(p){s[p]=cs[p]});out.push(s)});return out}
function load(src,h){return new Promise(function(res){var f=document.createElement("iframe");f.style.width="800px";f.style.height=h+"px";f.src=src;f.onload=function(){setTimeout(function(){res(f)},1500)};document.getElementById("frames").appendChild(f)})}
(async function(){var report=[],total=0,only=new URLSearchParams(location.search).get("only");
for(const c of COMPS.filter(function(c){return !only||only.split(",").indexOf(c.name)>=0})){var a=await load("react19/"+c.name+".html",c.height),b=await load("canvas/"+c.name+".html",c.height);
 var sa=sig(a.contentDocument),sb=sig(b.contentDocument),diffs=[];
 if(sa.length!==sb.length)diffs.push("element count "+sa.length+" vs "+sb.length);
 for(var i=0;i<Math.min(sa.length,sb.length);i++){var x=sa[i],y=sb[i];if(x.el!==y.el){diffs.push("order differs at "+i+": "+x.el+" vs "+y.el);break}
  Object.keys(x).forEach(function(k){if(k!=="el"&&x[k]!==y[k])diffs.push(x.el+" #"+i+" "+k+": "+x[k]+" -> "+y[k])})}
 total+=diffs.length;report.push(c.name+": "+(diffs.length?diffs.length+" differences\\n  "+diffs.slice(0,6).join("\\n  "):"same"));a.remove();b.remove();
 document.getElementById("out").textContent="running… "+report.length+"/"+COMPS.length}
window.REPORT={total:total,text:report.join("\\n")};document.getElementById("out").textContent=(total?total+" differences":"all same")+"\\n\\n"+report.join("\\n")})();
</script>`
  )
}
