import{c as _,a1 as u,a2 as d}from"./index-DL1ObbWE.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=_("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=_("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]),k={async create(t){const{data:a,error:e}=await u.from("import_batches").insert({household_id:t.household_id,file_name:t.file_name,source:"csv",summary:t.summary??{}}).select("*").single();return e&&d("Failed to create import batch",e),a},async complete(t,a){const{data:e,error:s}=await u.from("import_batches").update({status:"imported",summary:a}).eq("id",t).select("*").single();return s&&d("Failed to complete import batch",s),e},async rollback(t){const{data:a,error:e}=await u.rpc("rollback_import_batch",{p_import_batch_id:t});return e&&d("Failed to rollback import batch",e),Number(a??0)}};function w(t){const a=t.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean),e=b(a[0]??"").map(r=>r.trim().toLowerCase()),s=new Set;return a.slice(1).map(r=>{const n=b(r),o=e.reduce((h,F,g)=>{var f;return h[F]=((f=n[g])==null?void 0:f.trim())??"",h},{}),i=Number(o.amount??o.value??"NaN"),p=o.date??"",m=o.description??o.memo??o.merchant??"",l=`${p}|${m}|${i}`.toLowerCase(),y=s.has(l),c=[];return s.add(l),p||c.push("Missing date"),m||c.push("Missing description"),Number.isNaN(i)&&c.push("Invalid amount"),{date:p,description:m,amount:Math.abs(i),type:i>=0?"income":"expense",duplicate:y,errors:c,import_hash:l}})}function x(t,a){return{...a,amount:t.amount,type:t.type,date:t.date,description:t.description,import_hash:t.import_hash,import_source:"csv"}}function b(t){const a=[];let e="",s=!1;for(let r=0;r<t.length;r+=1){const n=t[r],o=t[r+1];n==='"'&&s&&o==='"'?(e+='"',r+=1):n==='"'?s=!s:n===","&&!s?(a.push(e),e=""):e+=n}return a.push(e),a}export{L as A,N as F,k as I,w as p,x as t};
