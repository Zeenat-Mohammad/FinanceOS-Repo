import{c as _,Y as u,Z as d}from"./index-Bt7K2wyK.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=_("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=_("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]),k={async create(t){const{data:s,error:e}=await u.from("import_batches").insert({household_id:t.household_id,file_name:t.file_name,source:"csv",summary:t.summary??{}}).select("*").single();return e&&d("Failed to create import batch",e),s},async complete(t,s){const{data:e,error:a}=await u.from("import_batches").update({status:"imported",summary:s}).eq("id",t).select("*").single();return a&&d("Failed to complete import batch",a),e},async rollback(t){const{data:s,error:e}=await u.rpc("rollback_import_batch",{p_import_batch_id:t});return e&&d("Failed to rollback import batch",e),Number(s??0)}};function w(t){const s=t.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean),e=b(s[0]??"").map(r=>r.trim().toLowerCase()),a=new Set;return s.slice(1).map(r=>{const n=b(r),o=e.reduce((h,F,g)=>{var f;return h[F]=((f=n[g])==null?void 0:f.trim())??"",h},{}),i=Number(o.amount??o.value??"NaN"),p=o.date??"",m=o.description??o.memo??o.merchant??"",l=`${p}|${m}|${i}`.toLowerCase(),y=a.has(l),c=[];return a.add(l),p||c.push("Missing date"),m||c.push("Missing description"),Number.isNaN(i)&&c.push("Invalid amount"),{date:p,description:m,amount:Math.abs(i),type:i>=0?"income":"expense",duplicate:y,errors:c,import_hash:l}})}function x(t,s){return{...s,amount:t.amount,type:t.type,date:t.date,description:t.description,import_hash:t.import_hash,import_source:"csv"}}function b(t){const s=[];let e="",a=!1;for(let r=0;r<t.length;r+=1){const n=t[r],o=t[r+1];n==='"'&&a&&o==='"'?(e+='"',r+=1):n==='"'?a=!a:n===","&&!a?(s.push(e),e=""):e+=n}return s.push(e),s}export{L as A,N as F,k as I,w as p,x as t};
