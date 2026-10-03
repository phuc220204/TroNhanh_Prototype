import{l as o}from"./index-8WYMH8Bb.js";function d(t,e,n=""){var a;return{...t,...e,costs:{...t.costs,...e.costs,deposit:((a=e.costs)==null?void 0:a.deposit)||n}}}const u=`

---METADATA---
`,i=`

---CURFEW_INFO---
`;function m(t){if(t==null||t==="")return"";const e=String(t).replace(/\D/g,"");return e?Number(e).toLocaleString("vi-VN"):""}function g(t){return t.replace(/\D/g,"")}function p(t){const e={curfew:{type:"free",time:""},costs:{electric:"",water:"",waterUnit:"person",service:"",deposit:"",other:""},nearby:[]};if(!t)return{cleanDescription:"",metadata:e};const n=t.indexOf(u);if(n!==-1){const s=t.substring(0,n),c=t.substring(n+u.length);try{const r=JSON.parse(c);return{cleanDescription:s,metadata:{...e,...r,curfew:{...e.curfew,...r.curfew},costs:{...e.costs,...r.costs},coords:r.coords?{...e.coords,...r.coords}:e.coords,nearby:r.nearby||[]}}}catch(r){o("listingMetadata.parseMetadataFromDescription",r)}}const a=t.indexOf(i);if(a!==-1){const s=t.substring(0,a),c=t.substring(a+i.length);try{const r=JSON.parse(c);return{cleanDescription:s,metadata:{...e,curfew:r}}}catch(r){o("listingMetadata.parseLegacyCurfew",r)}}return{cleanDescription:t,metadata:e}}export{g as c,m as f,d as m,p};
