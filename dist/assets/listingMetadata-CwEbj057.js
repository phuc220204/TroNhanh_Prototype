const o=`

---METADATA---
`,i=`

---CURFEW_INFO---
`;function f(t){if(t==null||t==="")return"";const e=String(t).replace(/\D/g,"");return e?Number(e).toLocaleString("vi-VN"):""}function d(t){return t.replace(/\D/g,"")}function u(t){const e={curfew:{type:"free",time:""},costs:{electric:"",water:"",waterUnit:"person",service:"",deposit:"",other:""},nearby:[],coords:{lat:10.7712,lng:106.6823,address:""}};if(!t)return{cleanDescription:"",metadata:e};const n=t.indexOf(o);if(n!==-1){const c=t.substring(0,n),s=t.substring(n+o.length);try{const r=JSON.parse(s);return{cleanDescription:c,metadata:{...e,...r,curfew:{...e.curfew,...r.curfew},costs:{...e.costs,...r.costs},coords:r.coords?{...e.coords,...r.coords}:e.coords,nearby:r.nearby||[]}}}catch(r){console.error("Failed to parse listing metadata",r)}}const a=t.indexOf(i);if(a!==-1){const c=t.substring(0,a),s=t.substring(a+i.length);try{const r=JSON.parse(s);return{cleanDescription:c,metadata:{...e,curfew:r}}}catch(r){console.error("Failed to parse legacy curfew info",r)}}return{cleanDescription:t,metadata:e}}function l(t,e){const{cleanDescription:n}=u(t);return`${n}${o}${JSON.stringify(e)}`}export{l as a,d as c,f,u as p};
