import{r as y,j as e}from"./index-dvgehet5.js";import{A as N}from"./activityshell-bjgjujgc.js";import{G as T}from"./gradetoggle-dxpieiqv.js";const C={javascript:[{name:"Hello World",description:"Your first program!",code:`// My first program!
print("Hello, World!")
print("Welcome to coding!")`},{name:"Simple Math",description:"Do calculations",code:`// Let's do some math!
let apples = 5
let oranges = 3
let total = apples + oranges

print("I have " + apples + " apples")
print("I have " + oranges + " oranges")
print("Total fruits: " + total)`},{name:"Countdown",description:"Use a loop",code:`// Countdown from 5 to 1
print("Starting countdown...")

for (let i = 5; i >= 1; i--) {
  print(i + "...")
}

print("Blast off! 🚀")`},{name:"FizzBuzz",description:"Classic challenge",code:`// FizzBuzz: A classic coding challenge!
for (let i = 1; i <= 15; i++) {
  if (i % 3 === 0 && i % 5 === 0) {
    print("FizzBuzz")
  } else if (i % 3 === 0) {
    print("Fizz")
  } else if (i % 5 === 0) {
    print("Buzz")
  } else {
    print(i)
  }
}`}],python:[{name:"Hello World",description:"Your first program!",code:`# My first Python program!
print("Hello, World!")
print("Welcome to Python!")`},{name:"Simple Math",description:"Do calculations",code:`# Let's do some math!
apples = 5
oranges = 3
total = apples + oranges

print(f"I have {apples} apples")
print(f"I have {oranges} oranges")
print(f"Total fruits: {total}")`},{name:"Countdown",description:"Use a loop",code:`# Countdown from 5 to 1
print("Starting countdown...")

for i in range(5, 0, -1):
    print(f"{i}...")

print("Blast off! 🚀")`},{name:"FizzBuzz",description:"Classic challenge",code:`# FizzBuzz in Python!
for i in range(1, 16):
    if i % 3 == 0 and i % 5 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`},{name:"Colored Shapes",description:"Draw graphics!",code:`# Draw colorful shapes! 🎨
from graphics import *

# Create a canvas
canvas = Canvas(300, 200)

# Draw a red rectangle
canvas.rect(20, 30, 80, 60, "red")

# Draw a blue circle
canvas.circle(180, 80, 50, "blue")

# Draw a green triangle
canvas.triangle(100, 150, 150, 80, 200, 150, "green")

# Draw a purple ellipse
canvas.ellipse(260, 140, 30, 20, "purple")

# Show our masterpiece!
canvas.show()
print("🎨 Look at those beautiful shapes!")`}],html:[{name:"Hello World",description:"Basic page",code:`<!DOCTYPE html>
<html>
<head>
  <title>My First Page</title>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Welcome to HTML!</p>
</body>
</html>`},{name:"List Example",description:"Ordered list",code:`<!DOCTYPE html>
<html>
<body>
  <h1>My Favorite Things</h1>
  <ul>
    <li>Pizza 🍕</li>
    <li>Video Games 🎮</li>
    <li>Coding 💻</li>
  </ul>
</body>
</html>`},{name:"Simple Form",description:"Input form",code:`<!DOCTYPE html>
<html>
<body>
  <h1>Contact Form</h1>
  <form>
    <label>Name:</label><br>
    <input type="text" placeholder="Your name"><br><br>
    <label>Message:</label><br>
    <textarea placeholder="Say hello!"></textarea><br><br>
    <button type="submit">Send</button>
  </form>
</body>
</html>`},{name:"Image & Link",description:"Media elements",code:`<!DOCTYPE html>
<html>
<body>
  <h1>Cool Website</h1>
  <img src="https://picsum.photos/200" alt="Random image">
  <p>
    <a href="https://example.com">Click here</a>
    to visit an example site!
  </p>
</body>
</html>`}],css:[{name:"Basic Styling",description:"Colors & fonts",code:`/* Style a heading and paragraph */
h1 {
  color: #3b82f6;
  font-family: Arial, sans-serif;
  text-align: center;
}

p {
  color: #64748b;
  font-size: 18px;
  line-height: 1.6;
}`},{name:"Box Model",description:"Padding & margin",code:`/* Understanding the box model */
.card {
  background-color: #1e293b;
  padding: 20px;
  margin: 10px;
  border: 2px solid #3b82f6;
  border-radius: 12px;
}

.card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}`},{name:"Flexbox Layout",description:"Modern layouts",code:`/* Flexbox for centering */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  gap: 20px;
}

.item {
  padding: 20px 40px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 8px;
  color: white;
}`},{name:"Button Styles",description:"Interactive button",code:`/* Stylish button */
.button {
  background: linear-gradient(135deg, #10b981, #3b82f6);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}`}]},_={javascript:{label:"JavaScript",extension:"script.js",badge:"JS",badgeColor:"text-yellow-500"},python:{label:"Python",extension:"main.py",badge:"PY",badgeColor:"text-blue-500"},html:{label:"HTML",extension:"index.html",badge:"</>",badgeColor:"text-orange-500"},css:{label:"CSS",extension:"styles.css",badge:"#",badgeColor:"text-pink-500"}},z={javascript:{elementary:['Use print("text") to show messages on the output.',"Use let name = value to remember something (a variable).","Use + to add numbers or stick words together.","Lines that start with // are notes for humans, not the computer."],middle:["print() is wired to console.log under the hood here.","for (let i = 0; i < n; i++) runs a block n times.",'Use === for equality (strict) and !== for "not equal".',"Try throwing an Error and catching it with try/catch."]},python:{elementary:['Use print("text") to show output.',"Variables don't need let — just write name = 5.",'Use f"Hello {name}" to plug variables into a string.',"Lines that start with # are comments."],middle:["This playground simulates Python by translating to JS — not everything will work.","range(start, end, step) loops through numbers.","Indentation controls blocks in real Python.","Try the graphics library example to draw SVG shapes."]},html:{elementary:["Tags come in pairs: <tag>...</tag>.","Use <h1> through <h6> for headings.","<p> is a paragraph, <a> is a link, <img> is an image.","The browser reads your HTML from top to bottom."],middle:["Elements can have attributes like href, src, alt, class, id.","<div> and <span> are generic containers used for layout.","Semantic tags (<header>, <nav>, <main>) describe the page structure.","HTML is the skeleton; CSS is the paint; JS is the movement."]},css:{elementary:["Selectors pick an element: h1 { color: blue; }.","Use .className for classes, #id for IDs.","Colors can be names (red), hex (#ff0000), or rgb(255,0,0).","Use :hover to change styles when someone points at it."],middle:["The box model: content → padding → border → margin.","Flexbox (display: flex) aligns items along a row or column.","Grid (display: grid) lays items into rows and columns.","Transitions animate between states: transition: all 0.3s ease."]}},P=n=>{const l=[],r=(...g)=>{l.push(g.map(p=>String(p)).join(" "))};try{const g=n.replace(/print\s*\(/g,"__print__("),p={log:(...s)=>l.push(s.map(c=>String(c)).join(" ")),error:(...s)=>l.push("❌ "+s.map(c=>String(c)).join(" ")),warn:(...s)=>l.push("⚠ "+s.map(c=>String(c)).join(" "))};new Function("__print__","console",`"use strict"; ${g}`)(r,p)}catch(g){const p=g instanceof Error?g.message:String(g);l.push(`❌ Error: ${p}`)}return l},W=n=>{const l=[],r=[];let g=300,p=200;if(n.includes("from graphics import")||n.includes("import graphics")){const s=n.match(/Canvas\((\d+),\s*(\d+)\)/);s&&(g=parseInt(s[1]),p=parseInt(s[2]));const c=/canvas\.rect\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*"([^"]+)"\)/g;let a;for(;(a=c.exec(n))!==null;){const[,o,u,h,d,f]=a;r.push(`<rect x="${o}" y="${u}" width="${h}" height="${d}" fill="${f}" rx="4"/>`)}const m=/canvas\.circle\((\d+),\s*(\d+),\s*(\d+),\s*"([^"]+)"\)/g;for(;(a=m.exec(n))!==null;){const[,o,u,h,d]=a;r.push(`<circle cx="${o}" cy="${u}" r="${h}" fill="${d}"/>`)}const v=/canvas\.triangle\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*"([^"]+)"\)/g;for(;(a=v.exec(n))!==null;){const[,o,u,h,d,f,$,S]=a;r.push(`<polygon points="${o},${u} ${h},${d} ${f},${$}" fill="${S}"/>`)}const j=/canvas\.ellipse\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*"([^"]+)"\)/g;for(;(a=j.exec(n))!==null;){const[,o,u,h,d,f]=a;r.push(`<ellipse cx="${o}" cy="${u}" rx="${h}" ry="${d}" fill="${f}"/>`)}const x=/canvas\.line\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*"([^"]+)"(?:,\s*(\d+))?\)/g;for(;(a=x.exec(n))!==null;){const[,o,u,h,d,f,$="2"]=a;r.push(`<line x1="${o}" y1="${u}" x2="${h}" y2="${d}" stroke="${f}" stroke-width="${$}" stroke-linecap="round"/>`)}if(n.includes("canvas.show()")&&r.length>0){const o=`<svg width="${g}" height="${p}" xmlns="http://www.w3.org/2000/svg" style="background: #1e293b; border-radius: 8px;">${r.join("")}</svg>`;l.push(`__SVG_PREVIEW__${o}`)}const i=/print\((?:f)?["']([^"']+)["']\)/g;for(;(a=i.exec(n))!==null;)l.push(a[1]);return l}try{let s=n.replace(/#(.*)$/gm,"//$1").replace(/f"([^"]*)"/g,(x,i)=>"`"+i.replace(/\{([^}]+)\}/g,"${$1}")+"`").replace(/f'([^']*)'/g,(x,i)=>"`"+i.replace(/\{([^}]+)\}/g,"${$1}")+"`").replace(/for\s+(\w+)\s+in\s+range\((\d+),\s*(\d+),\s*(-?\d+)\):/g,(x,i,o,u,h)=>parseInt(h)<0?`for (let ${i} = ${o}; ${i} > ${u}; ${i} += ${h}) {`:`for (let ${i} = ${o}; ${i} < ${u}; ${i} += ${h}) {`).replace(/for\s+(\w+)\s+in\s+range\((\d+),\s*(\d+)\):/g,"for (let $1 = $2; $1 < $3; $1++) {").replace(/for\s+(\w+)\s+in\s+range\((\d+)\):/g,"for (let $1 = 0; $1 < $2; $1++) {").replace(/elif\s+/g,"} else if (").replace(/else:/g,"} else {").replace(/if\s+(.+):/g,"if ($1) {").replace(/print\s*\(/g,"__print__(").replace(/(\s)==(\s)/g,"$1===$2").replace(/\bTrue\b/g,"true").replace(/\bFalse\b/g,"false").replace(/\band\b/g,"&&").replace(/\bor\b/g,"||");const c=s.split(`
`),a=[],m=[0];for(const x of c){const i=x.trim();if(!i){a.push("");continue}const o=x.search(/\S/);for(;m.length>1&&o<=m[m.length-1]&&o<m[m.length-1];)a.push("}"),m.pop();a.push(i),i.endsWith("{")&&m.push(o+4)}for(;m.length>1;)a.push("}"),m.pop();s=a.join(`
`);const v=(...x)=>{l.push(x.map(i=>String(i)).join(" "))};new Function("__print__",`"use strict"; ${s}`)(v)}catch(s){const c=s instanceof Error?s.message:String(s);l.push(`❌ Error: ${c}`),l.push("💡 Note: This is a simplified Python simulator. Some features may not work.")}return l},L=n=>[`__HTML_PREVIEW__${n}`],E=n=>{const l=(n.match(/\{/g)||[]).length,r=(n.match(/;/g)||[]).length;return["✅ CSS parsed successfully!",`📊 Found ${l} rule${l!==1?"s":""} with ${r} propert${r!==1?"ies":"y"}`,"💡 Tip: CSS styles HTML elements. Try combining with HTML!"]};function F(){const[n,l]=y.useState("elementary"),[r,g]=y.useState("javascript"),[p,w]=y.useState(C.javascript[0].code),[s,c]=y.useState([]),[a,m]=y.useState(!1),[v,j]=y.useState(!1),x=t=>{g(t),w(C[t][0].code),c([])},i=()=>{m(!0),c([]),setTimeout(()=>{let t;switch(r){case"python":t=W(p);break;case"html":t=L(p);break;case"css":t=E(p);break;default:t=P(p)}c(t),m(!1)},150)},o=t=>{w(t.code),c([])},u=()=>{c([])},h=async()=>{try{await navigator.clipboard.writeText(p),j(!0),setTimeout(()=>j(!1),1500)}catch{}},d=_[r],f=s.length>=1&&s[0].startsWith("__HTML_PREVIEW__"),$=s.some(t=>t.startsWith("__SVG_PREVIEW__")),S=["javascript","python","html","css"];return e.jsx(N,{title:"Code Playground",subtitle:"Write real code, hit Run, and watch what happens.",emoji:"💻",standards:["OH.CS.5-8.DA"],right:e.jsx(T,{level:n,onChange:l}),children:e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"rounded-2xl p-5 bg-gradient-to-r from-fuchsia-500/10 via-pink-500/10 to-rose-500/10 border border-fuchsia-500/20",children:e.jsxs("div",{className:"flex items-center justify-between flex-wrap gap-3",children:[e.jsx("div",{className:"text-sm text-ink/70",children:n==="elementary"?"Pick a language, load an example, press Run, read the output.":"Four languages, one sandbox. JS executes in a sandboxed Function; Python is transpiled; HTML renders in an iframe; CSS is parsed for feedback."}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{onClick:h,className:"btn-ghost text-sm",children:v?"✓ Copied":"📋 Copy code"}),e.jsx("button",{onClick:i,disabled:a,className:"btn-primary text-sm disabled:opacity-50",children:a?"Running…":"▶ Run code"})]})]})}),e.jsx("div",{className:"flex flex-wrap gap-2",children:S.map(t=>{const b=_[t],k=r===t;return e.jsxs("button",{onClick:()=>x(t),className:`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${k?"bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-sm":"bg-white border border-ink/10 text-ink/70 hover:border-ink/30"}`,children:[e.jsx("span",{className:k?"text-white":b.badgeColor,children:b.badge}),b.label]},t)})}),e.jsxs("div",{className:"card p-5",children:[e.jsxs("div",{className:"text-xs uppercase tracking-wide text-ink/60 mb-3",children:["Try these ",d.label," examples — click to load"]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:C[r].map(t=>e.jsxs("button",{onClick:()=>o(t),className:"px-3 py-2 rounded-xl bg-white border border-ink/10 hover:border-fuchsia-400 hover:bg-fuchsia-50 transition text-left",children:[e.jsx("span",{className:"font-bold text-sm text-ink",children:t.name}),e.jsx("span",{className:"text-xs text-ink/60 ml-2",children:t.description})]},t.name))})]}),e.jsxs("div",{className:"grid lg:grid-cols-2 gap-6",children:[e.jsxs("div",{className:"card overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between px-4 py-2.5 border-b border-ink/10 bg-slate-50",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-red-400"}),e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-yellow-400"}),e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-green-400"})]}),e.jsx("span",{className:`text-xs font-mono ${d.badgeColor}`,children:d.extension})]}),e.jsx("textarea",{value:p,onChange:t=>w(t.target.value),className:"w-full h-[400px] px-3 py-2 rounded-none bg-slate-900 text-emerald-300 font-mono text-sm focus:outline-none border-0 resize-none",placeholder:`Write your ${d.label} code here…`,spellCheck:!1})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"card overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between px-4 py-2.5 border-b border-ink/10 bg-slate-50",children:[e.jsx("span",{className:"text-sm font-semibold text-ink/80",children:r==="html"?"Preview":"Output"}),e.jsx("button",{onClick:u,className:"text-xs font-semibold text-ink/60 hover:text-ink",children:"↺ Clear"})]}),e.jsx("div",{className:"h-[360px] overflow-auto font-mono text-sm bg-slate-900 text-slate-100 p-3",children:s.length===0?e.jsxs("div",{className:"text-slate-500",children:["Press Run to see your ",r==="html"?"preview":"output"," here."]}):f?e.jsx("iframe",{srcDoc:s[0].replace("__HTML_PREVIEW__",""),className:"w-full h-full bg-white rounded-lg border-0",title:"HTML Preview",sandbox:"allow-scripts"}):$?e.jsx("div",{className:"space-y-3",children:s.map((t,b)=>t.startsWith("__SVG_PREVIEW__")?e.jsx("div",{className:"flex justify-center",dangerouslySetInnerHTML:{__html:t.replace("__SVG_PREVIEW__","")}},b):e.jsxs("div",{className:"py-0.5 text-emerald-300",children:[e.jsx("span",{className:"text-slate-500 mr-2",children:">"}),t]},b))}):s.map((t,b)=>e.jsxs("div",{className:`py-0.5 ${t.startsWith("❌")?"text-red-400":t.startsWith("💡")?"text-slate-400":t.startsWith("⚠")?"text-yellow-300":"text-emerald-300"}`,children:[e.jsx("span",{className:"text-slate-500 mr-2",children:">"}),t]},b))})]}),e.jsxs("div",{className:"rounded-2xl p-5 bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20",children:[e.jsxs("h4",{className:"font-bold mb-2 text-fuchsia-700",children:["✨ ",d.label," tips (",n==="elementary"?"basics":"going deeper",")"]}),e.jsx("ul",{className:"text-sm text-ink/80 space-y-1 list-disc ml-5",children:z[r][n].map((t,b)=>e.jsx("li",{children:t},b))})]})]})]}),e.jsx("div",{className:"card p-5 text-sm leading-relaxed",children:n==="elementary"?e.jsxs(e.Fragment,{children:[e.jsx("h3",{className:"font-bold mb-1",children:"Try this"}),e.jsxs("ol",{className:"list-decimal ml-5 space-y-1 text-ink/80",children:[e.jsxs("li",{children:["Load the ",e.jsx("b",{children:"Hello World"})," example for ",d.label," and press Run."]}),e.jsx("li",{children:"Change the message to your own name. Run it again."}),e.jsxs("li",{children:["Open ",e.jsx("b",{children:"Countdown"})," and change 5 to 10. What happens?"]}),e.jsx("li",{children:"Switch languages — does the same idea look different in Python vs JavaScript?"}),e.jsxs("li",{children:["In HTML, try adding a new ",e.jsx("code",{className:"bg-ink/10 px-1 rounded",children:"<li>"})," to the list."]})]})]}):e.jsxs(e.Fragment,{children:[e.jsx("h3",{className:"font-bold mb-1",children:"Investigate"}),e.jsxs("ul",{className:"list-disc ml-5 space-y-1 text-ink/80",children:[e.jsxs("li",{children:["Write a JS function that returns the first ",e.jsx("i",{children:"n"})," Fibonacci numbers and ",e.jsx("code",{className:"bg-ink/10 px-1 rounded",children:"print()"})," them."]}),e.jsx("li",{children:"In the Python sandbox, compare indentation-based blocks to JS braces. Which do you find clearer?"}),e.jsx("li",{children:"In the FizzBuzz example, what order do the conditions need to be in? Why?"}),e.jsxs("li",{children:["HTML provides structure, CSS provides style — combine a CSS example into your HTML with a ",e.jsx("code",{className:"bg-ink/10 px-1 rounded",children:"<style>"})," tag."]}),e.jsxs("li",{children:["Try the Python ",e.jsx("b",{children:"Colored Shapes"})," example — the graphics library here is just SVG under the hood. Can you add a new shape type?"]}),e.jsx("li",{children:"What happens if you divide by zero or reference an undefined variable? Read the error carefully."})]})]})})]})})}export{F as default};
