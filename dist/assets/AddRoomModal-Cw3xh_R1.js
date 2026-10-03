import{h as u,l as p,o as J,p as Q,d as n,j as t,f as s,r as g,C as a,t as X}from"./index-8WYMH8Bb.js";import{M as Y}from"./ModalShell-BWPkjicA.js";import"./browser-B3A2iuiy.js";import{F as c}from"./FormField-Dkgjq3sh.js";import{B as z}from"./Button-A2ESXNfs.js";async function ne(e){if(!e)return[];try{const{data:r,error:o}=await u.from("rooms").select(`
        *,
        properties(name),
        contracts(
          id,
          start_date,
          end_date,
          rent_price,
          deposit,
          status,
          occupancies!occupancies_contract_id_fkey(
            id,
            full_name,
            phone_number,
            occupant_count
          )
        ),
        invoices(
          id,
          period,
          due_date,
          total_amount,
          status,
          invoice_items(
            id,
            type,
            description,
            quantity,
            unit_price,
            amount
          )
        )
      `).eq("owner_id",e).is("deleted_at",null).order("created_at",{ascending:!1});if(o)throw o;return r||[]}catch(r){return p("room-service.getRoomsByOwner",r),[]}}async function se(e){const{data:r,error:o}=await u.from("rooms").select(`
      *,
      properties(name),
      contracts(
        id, start_date, end_date, rent_price, deposit, status,
        occupancies!occupancies_contract_id_fkey(id, full_name, phone_number, occupant_count)
      ),
      invoices(
        id, period, due_date, total_amount, status,
        invoice_items(id, type, description, quantity, unit_price, amount)
      )
    `).eq("owner_id",e).is("deleted_at",null).order("created_at",{ascending:!1});if(o)throw p("room-service.getRoomsByOwnerOrThrow",o),o;return r??[]}async function ce(e){if(!e)return[];try{const{data:r,error:o}=await u.from("rooms").select("*, properties(name)").eq("property_id",e).is("deleted_at",null).order("created_at",{ascending:!1});if(o)throw o;return r||[]}catch(r){return p("room-service.getRoomsByProperty",r),[]}}async function Z(e){var r;try{const{data:o,error:l}=await u.from("rooms").insert({property_id:e.propertyId,room_code:e.roomCode.trim(),area:e.area,price:e.price,floor:e.floor??1,status:e.status??"Available",description:((r=e.description)==null?void 0:r.trim())||null,electricity_price:e.electricityPrice??null,water_price:e.waterPrice??null,service_fee:e.serviceFee??null}).select("id").single();if(l)throw l;return o.id}catch(o){throw p("room-service.createRoom",o),o}}async function le(e){if(!e)return null;try{const{data:r,error:o}=await u.from("rooms").select("id, property_id, room_code, floor, area, price, status, description, electricity_price, water_price, service_fee").eq("id",e).is("deleted_at",null).maybeSingle();if(o)throw o;return r?{id:r.id,propertyId:r.property_id,roomCode:r.room_code,floor:r.floor,area:Number(r.area),price:Number(r.price),status:r.status,description:r.description??"",electricityPrice:r.electricity_price??null,waterPrice:r.water_price??null,serviceFee:r.service_fee??null}:null}catch(r){return p("room-service.getRoomById",r),null}}async function de(e){var r;try{const o={p_room_id:e.roomId,p_room_code:e.roomCode.trim(),p_area:e.area,p_price:e.price,p_floor:e.floor??null,p_status:e.status,p_description:((r=e.description)==null?void 0:r.trim())||null,p_electricity_price:e.electricityPrice,p_water_price:e.waterPrice,p_service_fee:e.serviceFee},{error:l}=await u.rpc("update_room",o);if(l)throw l}catch(o){throw p("room-service.updateRoom",o),o}}const ee=[{value:"Available",label:"Trống"},{value:"Deposited",label:"Đã cọc"},{value:"Rented",label:"Đang thuê"},{value:"Hidden",label:"Đang ẩn / bảo trì"}];function ue({properties:e,defaultPropertyId:r,onClose:o,onCreated:l}){var T;const b=J(),V=Q(),[m,v]=n.useState(r||((T=e[0])==null?void 0:T.id)||""),[f,q]=n.useState(""),[w,A]=n.useState(""),[j,I]=n.useState(""),[S,M]=n.useState(""),[P,E]=n.useState("Available"),[k,$]=n.useState(""),[F,R]=n.useState(!1),[C,d]=n.useState(""),[h,G]=n.useState(!1),[D,H]=n.useState(""),[B,U]=n.useState(""),[N,K]=n.useState("");n.useEffect(()=>{!m&&e.length>0&&v(e[0].id)},[e,m]);const L=async()=>{if(!b)return;if(d(""),!m){d("Vui lòng chọn khu trọ.");return}const i=Number(j.replace(/\D/g,"")),y=Number(S.replace(/\D/g,""));if(!f.trim()){d("Vui lòng nhập mã phòng.");return}if(!Number.isFinite(i)||i<=0){d("Diện tích phải là số lớn hơn 0.");return}if(!Number.isFinite(y)||y<=0){d("Giá thuê phải là số lớn hơn 0.");return}const _=x=>{const W=x.replace(/\D/g,"");if(W==="")return null;const O=Number(W);return Number.isFinite(O)?O:null};try{R(!0),await Z({propertyId:m,roomCode:f,area:i,price:y,floor:Number(w)||1,status:P,description:k,electricityPrice:h?_(D):null,waterPrice:h?_(B):null,serviceFee:h?_(N):null}),l(),o()}catch(x){d(X(x))}finally{R(!1)}};return t.jsxs(Y,{title:"Thêm phòng mới",onClose:o,footer:t.jsxs(t.Fragment,{children:[t.jsx(z,{variant:"ghost",onClick:o,disabled:F,children:"Hủy"}),t.jsx(z,{variant:"primary",requiresWrite:!0,loading:F,onClick:L,"data-testid":"add-room-save-btn",children:"Lưu phòng"})]}),children:[!b&&t.jsxs("div",{"data-testid":"add-room-readonly-banner",style:{background:a.white,border:`1px solid ${a.error}`,color:a.error,padding:"10px 14px",borderRadius:g.sm,fontFamily:s,fontSize:13,fontWeight:600,marginBottom:14},children:["⚠️ ",V]}),C&&t.jsx("div",{"data-testid":"add-room-form-error",style:{background:a.white,border:`1px solid ${a.error}`,color:a.error,padding:"10px 14px",borderRadius:g.sm,fontFamily:s,fontSize:13,fontWeight:600,marginBottom:14},children:C}),t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[t.jsxs("label",{style:{display:"flex",flexDirection:"column",gap:5},children:[t.jsx("span",{style:{fontFamily:s,fontSize:13,fontWeight:700,color:a.textPrimary},children:"Khu trọ *"}),t.jsx("select",{value:m,onChange:i=>v(i.target.value),"data-testid":"add-room-property",style:{fontFamily:s,fontSize:14,color:a.textPrimary,border:`1.5px solid ${a.border}`,borderRadius:g.sm,padding:"10px 13px",width:"100%",background:a.white,outline:"none"},children:e.map(i=>t.jsx("option",{value:i.id,children:i.name},i.id))})]}),t.jsx(c,{label:"Mã phòng *","data-testid":"add-room-code",value:f,onChange:q,placeholder:"VD: P101"}),t.jsx(c,{label:"Số tầng",value:w,onChange:A,placeholder:"VD: 1"}),t.jsx(c,{label:"Diện tích (m²) *","data-testid":"add-room-area",value:j,onChange:I,placeholder:"VD: 25"}),t.jsx(c,{label:"Giá thuê (đ/tháng) *","data-testid":"add-room-price",value:S,onChange:M,placeholder:"VD: 3.200.000"}),t.jsxs("label",{style:{display:"flex",flexDirection:"column",gap:5},children:[t.jsx("span",{style:{fontFamily:s,fontSize:13,fontWeight:700,color:a.textPrimary},children:"Trạng thái ban đầu"}),t.jsx("select",{value:P,onChange:i=>E(i.target.value),style:{fontFamily:s,fontSize:14,color:a.textPrimary,border:`1.5px solid ${a.border}`,borderRadius:g.sm,padding:"10px 13px",width:"100%",background:a.white,outline:"none"},children:ee.map(i=>t.jsx("option",{value:i.value,children:i.label},i.value))})]}),t.jsxs("div",{style:{borderTop:`1px solid ${a.border}`,paddingTop:12},children:[t.jsxs("label",{style:{display:"flex",alignItems:"flex-start",gap:9,cursor:"pointer"},children:[t.jsx("input",{type:"checkbox",checked:h,onChange:i=>G(i.target.checked),"data-testid":"add-room-custom-price-toggle",style:{marginTop:3,width:16,height:16,accentColor:a.primary,cursor:"pointer"}}),t.jsxs("span",{children:[t.jsx("span",{style:{display:"block",fontFamily:s,fontSize:13.5,fontWeight:700,color:a.textPrimary},children:"Phòng này có đơn giá riêng"}),t.jsx("span",{style:{display:"block",fontFamily:s,fontSize:12,color:a.textSecondary,lineHeight:1.45},children:"Bỏ trống thì phòng dùng đơn giá của khu trọ. Bật khi phòng này ký hợp đồng ở mức giá khác các phòng còn lại."})]})]}),h&&t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10,marginTop:12},children:[t.jsx(c,{label:"Đơn giá điện (VND/kWh)","data-testid":"add-room-elec-price",value:D,onChange:H,placeholder:"Để trống = theo khu"}),t.jsx(c,{label:"Đơn giá nước",value:B,onChange:U,placeholder:"Để trống = theo khu"}),t.jsx(c,{label:"Phí dịch vụ (VND/tháng)",value:N,onChange:K,placeholder:"Để trống = theo khu"})]})]}),t.jsx(c,{label:"Ghi chú nội bộ",value:k,onChange:$,placeholder:"Ghi chú về phòng này",textarea:!0,rows:3})]})]})}export{ue as A,se as a,le as b,ne as c,ce as g,de as u};
