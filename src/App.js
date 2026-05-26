import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { useFireCollection, useFireDoc } from "./hooks";

// ─── CONFIG ──────────────────────────────────────────────
const JOKER_FLOOZ  = "+22879621085";
const JOKER_TMONEY = "+22893643596";
const LIVRAISON_TARIF = 500;

// ─── PALETTE ─────────────────────────────────────────────
const BLU  = "#1A3EBD";
const BLU2 = "#4A7BF7";
const CYAN = "#00C2FF";
const DARK = "#060D1F";
const CARD = "#111D3D";
const BDR  = "rgba(74,123,247,0.15)";

const statutColor = { "Prêt":CYAN, "En cours":"#FFB800", "Récupéré":"#8892B0" };
const statutBg    = { "Prêt":"#0D2A3D", "En cours":"#3B2E0D", "Récupéré":"#1A2240" };

// ─── DONNÉES INITIALES ────────────────────────────────────
const TARIFS_INIT = [
  { id:1, label:"Lavage standard", prix:600 },
  { id:2, label:"Lavage délicat",  prix:800 },
  { id:3, label:"Repassage",       prix:700 },
  { id:4, label:"Pressing veste",  prix:1500 },
  { id:5, label:"Pliage",          prix:300 },
];

const PAIEMENTS = [
  { id:"flooz",  label:"Flooz",   emoji:"🟢", color:"#00A651" },
  { id:"tmoney", label:"T-Money", emoji:"🔴", color:"#E30613" },
  { id:"cash",   label:"Espèces", emoji:"💵", color:"#4A7BF7" },
];

const REWARDS_INIT = [
  { id:1, label:"Lavage offert",   desc:"1 cycle gratuit",   pts:100, emoji:"🫧", color:CYAN },
  { id:2, label:"-50% séchage",    desc:"Prochain séchage",  pts:60,  emoji:"🌀", color:BLU2 },
  { id:3, label:"Lessive offerte", desc:"1 dose premium",    pts:30,  emoji:"🧴", color:"#A855F7" },
  { id:4, label:"Sac JOKER",       desc:"Sac à linge",       pts:80,  emoji:"👜", color:"#FFB800" },
];

const FRIPERIE_INIT = [
  { id:1, nom:"Chemise Oxford", taille:"L",  prix:2500, etat:"Excellent", emoji:"👔" },
  { id:2, nom:"Jean slim noir", taille:"M",  prix:3000, etat:"Bon",       emoji:"👖" },
  { id:3, nom:"Robe fleurie",   taille:"S",  prix:2000, etat:"Très bon",  emoji:"👗" },
];

const LIVREURS_INIT = [
  { id:"L1", nom:"Kofi A.", tel:"+228 91 11 22 33", actif:true, courses:0 },
];

const COMMANDES_INIT = [];

const LEVEL_SEUILS = [
  { label:"Bronze",   min:0,   max:99,       color:"#CD7F32" },
  { label:"Silver",   min:100, max:299,      color:"#C0C0C0" },
  { label:"Gold",     min:300, max:599,      color:"#FFD700" },
  { label:"Platinum", min:600, max:Infinity, color:"#E0E0FF" },
];

// ─── HELPERS ─────────────────────────────────────────────
function genId()  { return "JK-"+String(Math.floor(Math.random()*900)+100); }
function fmt(n)   { return Number(n).toLocaleString("fr-FR"); }
function getLevel(pts) { return LEVEL_SEUILS.find(l=>pts>=l.min&&pts<=l.max)||LEVEL_SEUILS[0]; }
function calcTotal(poids,tarif,livraison){ return Math.round(parseFloat(poids)*tarif)+(livraison?LIVRAISON_TARIF:0); }
function todayStr(){ return new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"short"}); }

function sendWhatsApp(tel,msg){
  const n=tel.replace(/\D/g,"");
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`,"_blank");
}



// ─── UI ATOMS ─────────────────────────────────────────────
function Logo({ size=64, style={} }){
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,#0D1F6E,${BLU})`,border:`3px solid ${BLU2}`,boxShadow:`0 0 24px rgba(74,123,247,0.45)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:size*0.45,...style}}>
      🃏
    </div>
  );
}

function Badge({ statut }){
  return <span style={{background:statutBg[statut]||"#1A2240",color:statutColor[statut]||"#8892B0",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700}}>{statut}</span>;
}

function STitle({ text }){
  return <p style={{fontSize:11,color:"#8892B0",letterSpacing:2,textTransform:"uppercase",marginBottom:10,marginTop:14}}>{text}</p>;
}

function Inp({ label,value,onChange,placeholder,type="text",big=false,warn=false }){
  return (
    <div style={{marginBottom:12}}>
      {label&&<label style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{width:"100%",background:CARD,border:`1px solid ${warn?"#FFB80060":BDR}`,borderRadius:13,padding:big?"14px":"13px 15px",color:big?(warn?"#FFB800":CYAN):"#F8FAFF",fontSize:big?26:14,fontWeight:big?700:400,outline:"none",textAlign:big?"center":"left"}} />
    </div>
  );
}

function Btn({ label,onClick,disabled,color="primary",small=false }){
  const bg = color==="primary"?`linear-gradient(135deg,${BLU},${BLU2})`:color==="danger"?"#1A0A0A":color==="green"?"#0D3B1A":CARD;
  const brd= color==="danger"?"1px solid #FF444430":color==="green"?"1px solid #25D36640":`1px solid ${BDR}`;
  const col= color==="danger"?"#FF6B6B":color==="green"?"#25D366":"#fff";
  return <button onClick={onClick} disabled={disabled} style={{background:disabled?CARD:bg,border:disabled?`1px solid ${BDR}`:brd,borderRadius:small?10:14,padding:small?"8px 14px":"14px",color:disabled?"#8892B0":col,fontWeight:700,fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",width:small?"auto":"100%",opacity:disabled?0.6:1}}>{label}</button>;
}

// ─── PIN SCREEN ───────────────────────────────────────────
function PinScreen({ onSuccess, correctPin }){
  const [pin,setPin]=useState("");
  const [err,setErr]=useState(false);
  const [shk,setShk]=useState(false);
  const keys=["1","2","3","4","5","6","7","8","9","⌫","0","✓"];

  function tryPin(p){
    if(p===correctPin){ onSuccess(); }
    else{ setErr(true);setShk(true); setTimeout(()=>{setPin("");setErr(false);setShk(false);},800); }
  }
  function press(k){
    if(k==="⌫"){setPin(p=>p.slice(0,-1));return;}
    if(k==="✓"){tryPin(pin);return;}
    if(pin.length>=4) return;
    const nx=pin+k; setPin(nx);
    if(nx.length===4) setTimeout(()=>tryPin(nx),120);
  }

  return (
    <div style={{padding:"40px 24px",textAlign:"center",animation:"fadeIn 0.4s ease"}}>
      <Logo size={72} style={{margin:"0 auto 16px"}} />
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,marginBottom:4}}>ESPACE GÉRANT</h2>
      <p style={{color:"#8892B0",fontSize:13,marginBottom:28}}>PIN à 4 chiffres</p>
      <div style={{animation:shk?"shake 0.4s ease":"none"}}>
        <div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:28}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<pin.length?(err?"#FF4444":BLU2):"transparent",border:`2px solid ${i<pin.length?(err?"#FF4444":BLU2):"#8892B0"}`,transition:"all 0.15s"}} />)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,maxWidth:280,margin:"0 auto"}}>
          {keys.map(k=>(
            <button key={k} onClick={()=>press(k)} style={{background:k==="✓"?`linear-gradient(135deg,${BLU},${BLU2})`:k==="⌫"?"#1A2240":CARD,border:`1px solid ${BDR}`,borderRadius:18,padding:"18px",color:"#F8FAFF",fontSize:k==="✓"||k==="⌫"?20:22,fontWeight:700,cursor:"pointer"}}>{k}</button>
          ))}
        </div>
      </div>
      {err&&<p style={{color:"#FF4444",fontSize:13,marginTop:16,fontWeight:600}}>❌ PIN incorrect</p>}
      <div style={{marginTop:24,background:CARD,borderRadius:14,padding:"12px 18px",border:`1px solid ${BDR}`,textAlign:"left"}}>
        <p style={{color:"#8892B0",fontSize:11,marginBottom:4}}>PIN par défaut</p>
        <p style={{color:BLU2,fontWeight:700,fontSize:18,letterSpacing:6}}>1 2 3 4</p>
      </div>
    </div>
  );
}

// ─── NOUVELLE COMMANDE ────────────────────────────────────
function NouvelleCommande({ commandes,setCommandes,tarifs,onBack,onDone }){
  const [nom,setNom]=useState("");
  const [tel,setTel]=useState("");
  const [poids,setPoids]=useState("");
  const [tarif,setTarif]=useState(tarifs[0]||TARIFS_INIT[0]);
  const [paiement,setPaiement]=useState(PAIEMENTS[0]);
  const [livraison,setLiv]=useState(null);
  const [adresse,setAdresse]=useState("");
  const [ticket,setTicket]=useState(null);

  const isDepot=livraison==="depot"||livraison==="les-deux";
  const sousTotal=poids?Math.round(parseFloat(poids)*tarif.prix):0;
  const frais=livraison?LIVRAISON_TARIF:0;
  const total=sousTotal+frais;
  const pts=Math.floor(total/100);

  function creer(){
    if(!nom||!poids) return;
    const c={id:genId(),client:nom,tel,poids:parseFloat(poids),poidsStatut:isDepot?"estimated":"confirmed",
      tarifId:tarif.id,tarif:tarif.prix,total,statut:"En cours",date:todayStr(),
      points:pts,paiement:paiement.id,livraison,adresse,
      livraisonStatut:livraison?"pending":null,livreurNom:null,livreurTel:null,paiementConfirme:false};
    setCommandes(p=>[c,...p]);
    setTicket(c);
  }

  function waTicket(c){
    if(!c.tel) return;
    sendWhatsApp(c.tel,`🃏 *JOKER Laverie & Service*\n\n🎫 Ticket: ${c.id}\n👤 ${c.client}\n⚖️ ${c.poids}kg\n💰 ${fmt(c.total)} FCFA\n💳 ${PAIEMENTS.find(p=>p.id===c.paiement)?.label}\n🏅 +${c.points} points\n\nLomé, Togo — Merci! 🙏`);
  }

  if(ticket) return (
    <div style={{padding:"24px 20px",animation:"fadeIn 0.4s ease"}}>
      <div style={{textAlign:"center",marginBottom:16}}>
        <Logo size={56} style={{margin:"0 auto 10px"}} />
        <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2}}>🎫 Ticket créé !</h2>
        {ticket.poidsStatut==="estimated"&&<div style={{background:"#1A0D00",borderRadius:12,padding:10,marginTop:8,border:"1px solid #FFB80040"}}><p style={{color:"#FFB800",fontSize:13,fontWeight:600}}>⚖️ Poids estimé — à confirmer à la laverie</p></div>}
      </div>
      <div style={{background:CARD,borderRadius:18,padding:20,border:`1px solid ${BDR}`,marginBottom:16}}>
        {[["N°",ticket.id],["Client",ticket.client],["Téléphone",ticket.tel||"—"],["Poids",ticket.poids+"kg"],["Service",tarif.label],["Sous-total",fmt(sousTotal)+" FCFA"],livraison?["Livraison 🛵",fmt(LIVRAISON_TARIF)+" FCFA"]:null,["TOTAL",fmt(total)+" FCFA"],["Paiement",PAIEMENTS.find(p=>p.id===ticket.paiement)?.label],["+Points","+"+pts+" 🏅"]].filter(Boolean).map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:"#8892B0",fontSize:13}}>{k}</span>
            <span style={{fontWeight:700,fontSize:13,color:k==="TOTAL"?CYAN:k==="+Points"?BLU2:"#F8FAFF"}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {ticket.tel&&<button onClick={()=>sendWhatsApp(ticket.tel, buildFacture(ticket, tarifs))} style={{background:"linear-gradient(135deg,#0D3B1A,#006b2b)",border:"1px solid #25D36640",borderRadius:14,padding:14,color:"#25D366",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>💬 Envoyer la facture WhatsApp</button>}
        <Btn label="Voir les commandes →" onClick={onDone} />
      </div>
    </div>
  );

  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",marginBottom:14,fontSize:14}}>← Retour</button>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:16}}>Nouvelle Commande</h2>
      <Inp label="Nom *" value={nom} onChange={e=>setNom(e.target.value)} placeholder="Aminata Mensah" />
      <Inp label="Téléphone" value={tel} onChange={e=>setTel(e.target.value)} placeholder="+228 90 00 00 00" />
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Service *</label>
        {tarifs.map(tr=>(
          <div key={tr.id} onClick={()=>setTarif(tr)} style={{background:tarif.id===tr.id?"#0D1F6E":CARD,border:`1px solid ${tarif.id===tr.id?BLU2:BDR}`,borderRadius:12,padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",marginBottom:7}}>
            <span style={{fontWeight:600,fontSize:14}}>{tr.label}</span>
            <span style={{color:CYAN,fontWeight:700}}>{fmt(tr.prix)} F/kg</span>
          </div>
        ))}
      </div>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Poids (kg) * {isDepot&&<span style={{color:"#FFB800",fontSize:10}}>⚖️ Estimé</span>}</label>
        <input type="number" value={poids} onChange={e=>setPoids(e.target.value)} placeholder="3.5" style={{width:"100%",background:CARD,border:`1px solid ${isDepot?"rgba(255,184,0,0.4)":BDR}`,borderRadius:13,padding:"13px",color:isDepot?"#FFB800":CYAN,fontSize:28,fontWeight:700,outline:"none",textAlign:"center"}} />
      </div>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Livraison 🛵 (+{fmt(LIVRAISON_TARIF)} FCFA)</label>
        <div style={{display:"flex",gap:8}}>
          {[{id:null,l:"Non"},{id:"depot",l:"Dépôt"},{id:"recuperation",l:"Récup."},{id:"les-deux",l:"A/R"}].map(o=>(
            <button key={String(o.id)} onClick={()=>setLiv(o.id)} style={{flex:1,background:livraison===o.id?"#1A0D3D":CARD,border:`1px solid ${livraison===o.id?"#A855F7":BDR}`,borderRadius:12,padding:"10px 4px",color:livraison===o.id?"#A855F7":"#8892B0",fontWeight:600,fontSize:11,cursor:"pointer"}}>{o.l}</button>
          ))}
        </div>
        {livraison&&<input value={adresse} onChange={e=>setAdresse(e.target.value)} placeholder="Adresse à Lomé" style={{width:"100%",marginTop:10,background:CARD,border:"1px solid rgba(168,85,247,0.3)",borderRadius:12,padding:"12px 14px",color:"#F8FAFF",fontSize:14,outline:"none"}} />}
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Paiement</label>
        <div style={{display:"flex",gap:8}}>
          {PAIEMENTS.map(p=>(
            <button key={p.id} onClick={()=>setPaiement(p)} style={{flex:1,background:paiement.id===p.id?`${p.color}22`:CARD,border:`1px solid ${paiement.id===p.id?p.color:BDR}`,borderRadius:14,padding:"12px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <span style={{fontSize:18}}>{p.emoji}</span>
              <span style={{fontSize:11,fontWeight:700,color:paiement.id===p.id?p.color:"#8892B0"}}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      {poids&&(
        <div style={{background:`linear-gradient(135deg,#0D1F6E,#1A3EBD22)`,borderRadius:18,padding:18,marginBottom:16,border:`1px solid ${isDepot?"rgba(255,184,0,0.3)":"rgba(0,194,255,0.3)"}`}}>
          {frais>0&&<><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:"#8892B0",fontSize:13}}>Lavage</span><span style={{fontSize:13}}>{fmt(sousTotal)} FCFA</span></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:"#8892B0",fontSize:13}}>Livraison</span><span style={{color:"#A855F7",fontSize:13}}>+{fmt(LIVRAISON_TARIF)} FCFA</span></div></>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#8892B0",fontSize:14}}>TOTAL</span>
            <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:isDepot?"#FFB800":CYAN}}>{fmt(total)} FCFA</span>
          </div>
          <p style={{fontSize:12,color:BLU2,marginTop:6}}>+{pts} pts · {paiement.label}</p>
        </div>
      )}
      <Btn label="🎫 Créer le ticket" onClick={creer} disabled={!nom||!poids} />
    </div>
  );
}

// ─── COMMANDE CARD ────────────────────────────────────────
function CmdCard({ c,onNext,onConfirmPoids,onValLiv,onRefLiv,onNotify,onPay,hasTel }){
  const [edit,setEdit]=useState(false);
  const [nvP,setNvP]=useState(String(c.poids));
  const nextLabel={"En cours":"✅ Prêt","Prêt":"📦 Rendu"};
  return (
    <div style={{background:CARD,borderRadius:20,padding:16,marginBottom:12,border:`1px solid ${c.poidsStatut==="estimated"?"rgba(255,184,0,0.25)":BDR}`}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <p style={{fontWeight:700,fontSize:15}}>{c.client}</p>
          <p style={{fontSize:12,color:"#8892B0"}}>{c.id} · {c.date} {c.livraison?"· 🛵":""}</p>
        </div>
        <Badge statut={c.statut} />
      </div>
      <div style={{background:c.poidsStatut==="estimated"?"#1A0D00":"#0A0F1E",borderRadius:10,padding:"10px 14px",marginBottom:10,border:`1px solid ${c.poidsStatut==="estimated"?"#FFB80040":BDR}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{fontSize:11,color:c.poidsStatut==="estimated"?"#FFB800":"#8892B0"}}>⚖️ {c.poidsStatut==="estimated"?"Estimé":"Confirmé"}</p>
            <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:c.poidsStatut==="estimated"?"#FFB800":CYAN}}>{c.poids} kg</p>
          </div>
          {c.poidsStatut==="estimated"&&!edit&&<button onClick={()=>setEdit(true)} style={{background:"#FFB80022",border:"1px solid #FFB80050",borderRadius:10,color:"#FFB800",padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Confirmer ⚖️</button>}
        </div>
        {edit&&(
          <div style={{marginTop:10}}>
            <input type="number" value={nvP} onChange={e=>setNvP(e.target.value)} style={{width:"100%",background:CARD,border:"1px solid #FFB80060",borderRadius:10,padding:"10px",color:"#FFB800",fontSize:20,fontWeight:700,outline:"none",textAlign:"center",marginBottom:8}} />
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{onConfirmPoids(c.id,parseFloat(nvP)||c.poids);setEdit(false);}} style={{flex:1,background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:10,padding:"10px",color:"#fff",fontWeight:700,cursor:"pointer"}}>✅ Valider</button>
              <button onClick={()=>setEdit(false)} style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:10,padding:"10px 14px",color:"#8892B0",cursor:"pointer"}}>✕</button>
            </div>
          </div>
        )}
      </div>
      {c.livraison&&c.livraisonStatut==="pending"&&(
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button onClick={onValLiv} style={{flex:1,background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:12,padding:"10px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>✅ Valider liv.</button>
          <button onClick={onRefLiv} style={{flex:1,background:"#1A1030",border:"1px solid #FF444440",borderRadius:12,padding:"10px",color:"#FF6B6B",fontWeight:700,fontSize:13,cursor:"pointer"}}>❌ Refuser</button>
        </div>
      )}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{color:CYAN,fontWeight:700,fontSize:15,flex:1}}>{fmt(c.total)} F {c.paiementConfirme?"✅":""}</span>
        {c.statut!=="Récupéré"&&<button onClick={onPay} style={{background:c.paiementConfirme?"#0D3B2E":`linear-gradient(135deg,#004d20,${BLU})`,border:`1px solid ${c.paiementConfirme?CYAN+"40":"rgba(0,166,81,0.3)"}`,borderRadius:10,color:c.paiementConfirme?CYAN:"#fff",padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{c.paiementConfirme?"✅ Payé":"💳 Payer"}</button>}
        {hasTel&&c.statut==="Prêt"&&<button onClick={onNotify} style={{background:"#0D3B1A",border:"1px solid #25D36640",borderRadius:10,color:"#25D366",padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>💬 WA</button>}
        {nextLabel[c.statut]&&c.poidsStatut!=="estimated"&&<button onClick={onNext} style={{background:"#0D1F6E",border:`1px solid #4A7BF740`,borderRadius:10,color:CYAN,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{nextLabel[c.statut]}</button>}
        {nextLabel[c.statut]&&c.poidsStatut==="estimated"&&<span style={{fontSize:11,color:"#FFB800"}}>⚠️ Confirmer poids</span>}
      </div>
    </div>
  );
}

// ─── MODAL PAIEMENT ───────────────────────────────────────
function PayModal({ c,onClose,onConfirm }){
  const [mode,setMode]=useState(null);
  const [sent,setSent]=useState(false);

  function envoyer(m){
    setMode(m);
    const num=m==="flooz"?JOKER_FLOOZ:JOKER_TMONEY;
    const name=m==="flooz"?"Flooz (Moov)":"T-Money (Togocel)";
    if(c.tel) sendWhatsApp(c.tel,`🃏 *JOKER Laverie & Service*\n\n💳 *Paiement ${name}*\n\nEnvoyez *${fmt(c.total)} FCFA* au :\n📱 *${num}*\nNom : JOKER LAVERIE\n\n🎫 Référence : *${c.id}*\n👤 Client : ${c.client}\n\n✅ Confirmez après paiement.`);
    setSent(true);
  }

  function envoyerCash(){
    setMode("cash");
    setSent(true);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#0D1629",borderRadius:"24px 24px 0 0",padding:"28px 24px 40px",width:"100%",maxWidth:420,animation:"slideUp 0.3s ease"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <p style={{fontSize:28,marginBottom:6}}>💳</p>
          <h3 style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:2}}>PAIEMENT MOBILE MONEY</h3>
          <p style={{color:"#8892B0",fontSize:13}}>{c.client} · {c.id}</p>
        </div>
        <div style={{background:`linear-gradient(135deg,#0D1F6E,#1A3EBD22)`,borderRadius:18,padding:20,marginBottom:20,border:"1px solid rgba(0,194,255,0.3)",textAlign:"center"}}>
          <p style={{color:"#8892B0",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Montant à payer</p>
          <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:44,color:CYAN,letterSpacing:2,lineHeight:1}}>{fmt(c.total)}</p>
          <p style={{color:BLU2,fontSize:14,marginTop:4}}>FCFA · Réf: {c.id}</p>
        </div>
        {!sent?(
          <>
            <button onClick={()=>envoyer("flooz")} style={{width:"100%",background:"linear-gradient(135deg,#004d20,#006b2b)",border:"1px solid #00A65140",borderRadius:16,padding:18,marginBottom:12,display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
              <span style={{fontSize:28}}>🟢</span>
              <div style={{textAlign:"left"}}>
                <p style={{fontWeight:700,fontSize:16,color:"#fff"}}>Flooz — Moov Money</p>
                <p style={{fontSize:12,color:"#00A651"}}>📱 {JOKER_FLOOZ}</p>
              </div>
              <span style={{color:"#00A651",fontSize:20,marginLeft:"auto"}}>→</span>
            </button>
            <button onClick={()=>envoyer("tmoney")} style={{width:"100%",background:"linear-gradient(135deg,#4d0000,#6b0000)",border:"1px solid #E3061340",borderRadius:16,padding:18,marginBottom:12,display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
              <span style={{fontSize:28}}>🔴</span>
              <div style={{textAlign:"left"}}>
                <p style={{fontWeight:700,fontSize:16,color:"#fff"}}>T-Money — Togocel</p>
                <p style={{fontSize:12,color:"#E30613"}}>📱 {JOKER_TMONEY}</p>
              </div>
              <span style={{color:"#E30613",fontSize:20,marginLeft:"auto"}}>→</span>
            </button>
            <button onClick={()=>envoyerCash()} style={{width:"100%",background:"linear-gradient(135deg,#1A2240,#1A3EBD)",border:"1px solid #4A7BF740",borderRadius:16,padding:18,marginBottom:20,display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
              <span style={{fontSize:28}}>💵</span>
              <div style={{textAlign:"left"}}>
                <p style={{fontWeight:700,fontSize:16,color:"#fff"}}>Espèces — Cash</p>
                <p style={{fontSize:12,color:BLU2}}>Paiement reçu en main propre</p>
              </div>
              <span style={{color:BLU2,fontSize:20,marginLeft:"auto"}}>→</span>
            </button>
          </>
        ):(
          <>
            <div style={{background:mode==="cash"?"#0D1F6E22":"#0D3B2E",borderRadius:16,padding:18,marginBottom:16,border:`1px solid ${mode==="cash"?BLU2:CYAN}40`}}>
              {mode==="cash"
                ? <><p style={{color:BLU2,fontWeight:700,fontSize:15,marginBottom:8}}>💵 Paiement en espèces</p><p style={{color:"#8892B0",fontSize:13,lineHeight:1.6}}>Confirme la réception de <strong style={{color:"#F8FAFF"}}>{fmt(c.total)} FCFA</strong> en main propre.</p></>
                : <><p style={{color:CYAN,fontWeight:700,fontSize:15,marginBottom:8}}>✅ Instructions envoyées sur WhatsApp !</p><p style={{color:"#8892B0",fontSize:13,lineHeight:1.6}}>Le client doit envoyer <strong style={{color:"#F8FAFF"}}>{fmt(c.total)} FCFA</strong> au {mode==="flooz"?JOKER_FLOOZ:JOKER_TMONEY}.</p></>
              }
            </div>
            <div style={{background:CARD,borderRadius:14,padding:14,marginBottom:16,border:`1px solid ${BDR}`}}>
              <p style={{color:"#FFB800",fontWeight:700,fontSize:13,marginBottom:8}}>⚠️ Vérification</p>
              {["1. Vérifie la réception sur ton téléphone","2. Confirme le montant : "+fmt(c.total)+" FCFA","3. Note la référence : "+c.id].map((s,i)=><p key={i} style={{color:"#8892B0",fontSize:12,marginBottom:4}}>{s}</p>)}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setSent(false);setMode(null);}} style={{flex:1,background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:14,color:"#8892B0",fontWeight:700,cursor:"pointer"}}>← Changer</button>
              <button onClick={()=>onConfirm(mode)} style={{flex:2,background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:14,padding:14,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>✅ Confirmer paiement</button>
            </div>
          </>
        )}
        <button onClick={onClose} style={{width:"100%",background:"none",border:"none",color:"#8892B0",fontWeight:600,fontSize:14,cursor:"pointer",marginTop:14}}>Annuler</button>
      </div>
    </div>
  );
}

// ─── TARIFS ───────────────────────────────────────────────
function GestionTarifs({ tarifs,setTarifs }){
  const [newLabel,setNewLabel]=useState("");
  const [newPrix,setNewPrix]=useState("");
  const [msg,setMsg]=useState("");
  function flash(m){setMsg(m);setTimeout(()=>setMsg(""),2000);}
  function updatePrix(id,val){setTarifs(p=>p.map(t=>t.id===id?{...t,prix:parseInt(val)||t.prix}:t));}
  function updateLabel(id,val){setTarifs(p=>p.map(t=>t.id===id?{...t,label:val}:t));}
  function addTarif(){if(!newLabel||!newPrix)return;setTarifs(p=>[...p,{id:Date.now(),label:newLabel,prix:parseInt(newPrix)}]);setNewLabel("");setNewPrix("");flash("✅ Tarif ajouté !");}
  function removeTarif(id){setTarifs(p=>p.filter(t=>t.id!==id));}
  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>Tarifs</h2>
      {msg&&<div style={{background:"#0D3B2E",borderRadius:12,padding:"10px 16px",marginBottom:14,border:`1px solid ${CYAN}40`}}><p style={{color:CYAN,fontWeight:700}}>{msg}</p></div>}
      {tarifs.map(t=>(
        <div key={t.id} style={{background:CARD,borderRadius:18,padding:16,marginBottom:12,border:`1px solid ${BDR}`}}>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            <input value={t.label} onChange={e=>updateLabel(t.id,e.target.value)} style={{flex:1,background:DARK,border:`1px solid ${BDR}`,borderRadius:10,padding:"10px 12px",color:"#F8FAFF",fontSize:14,outline:"none"}} />
            <button onClick={()=>removeTarif(t.id)} style={{background:"none",border:"none",color:"#FF4444",fontSize:18,cursor:"pointer"}}>🗑️</button>
          </div>
          <input type="number" value={t.prix} onChange={e=>updatePrix(t.id,e.target.value)} style={{width:"100%",background:DARK,border:`1px solid ${BLU2}`,borderRadius:10,padding:"12px",color:CYAN,fontSize:22,fontWeight:700,outline:"none",textAlign:"center"}} />
          <div style={{display:"flex",gap:8,marginTop:10}}>
            {[-100,-50,+50,+100].map(d=>(
              <button key={d} onClick={()=>updatePrix(t.id,t.prix+d)} style={{flex:1,background:d<0?"#1A0A0A":"#0D1F6E",border:`1px solid ${d<0?"#FF444330":BLU2+"40"}`,borderRadius:10,padding:"8px 4px",color:d<0?"#FF6B6B":CYAN,fontSize:12,fontWeight:700,cursor:"pointer"}}>{d>0?"+":""}{d}</button>
            ))}
          </div>
        </div>
      ))}
      <STitle text="Ajouter un tarif" />
      <div style={{background:CARD,borderRadius:18,padding:16,border:`1px solid ${BDR}`,marginBottom:14}}>
        <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Nom du service" style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"12px 14px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
        <input type="number" value={newPrix} onChange={e=>setNewPrix(e.target.value)} placeholder="Prix FCFA/kg" style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"12px",color:CYAN,fontSize:18,fontWeight:700,outline:"none",textAlign:"center",marginBottom:12}} />
        <Btn label="➕ Ajouter" onClick={addTarif} disabled={!newLabel||!newPrix} />
      </div>
    </div>
  );
}

// ─── LIVREURS ─────────────────────────────────────────────
function GestionLivreurs({ livreurs,setLivreurs,commandes,setCommandes }){
  const [newNom,setNewNom]=useState("");
  const [newTel,setNewTel]=useState("");
  const [msg,setMsg]=useState("");
  function flash(m){setMsg(m);setTimeout(()=>setMsg(""),2000);}
  function addLivreur(){if(!newNom)return;setLivreurs(p=>[...p,{id:"L"+Date.now(),nom:newNom,tel:newTel,actif:true,courses:0}]);setNewNom("");setNewTel("");flash("✅ Livreur ajouté !");}
  function assigner(cmdId,l){
    setCommandes(p=>p.map(c=>c.id===cmdId?{...c,livreurNom:l.nom,livreurTel:l.tel,livraisonStatut:"confirmed"}:c));
    setLivreurs(p=>p.map(x=>x.id===l.id?{...x,courses:x.courses+1}:x));
    const cmd=commandes.find(c=>c.id===cmdId);
    if(cmd&&l.tel) sendWhatsApp(l.tel,`🛵 *JOKER — Nouvelle course*\n\n👤 ${cmd.client}\n📍 ${cmd.adresse||"À confirmer"}\n📞 ${cmd.tel||"—"}\n🎫 ${cmd.id}\n💰 ${fmt(cmd.total)} FCFA\n\nBonne route ! 🃏`);
    flash("✅ Livreur assigné + notifié !");
  }
  const pending=commandes.filter(c=>c.livraison&&c.livraisonStatut==="pending");
  const active =commandes.filter(c=>c.livraison&&c.livraisonStatut==="confirmed"&&c.statut!=="Récupéré");
  const actifs =livreurs.filter(l=>l.actif);
  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>🛵 Livraisons</h2>
      {msg&&<div style={{background:"#0D3B2E",borderRadius:12,padding:"10px 16px",marginBottom:14,border:`1px solid ${CYAN}40`}}><p style={{color:CYAN,fontWeight:700}}>{msg}</p></div>}

      {pending.length>0&&(
        <>
          <div style={{background:"#1A0D3D",borderRadius:14,padding:"10px 14px",marginBottom:14,border:"1px solid #A855F750",display:"flex",gap:8,alignItems:"center"}}>
            <span>⚡</span><p style={{color:"#A855F7",fontWeight:700,fontSize:13}}>{pending.length} course(s) en attente</p>
          </div>
          {pending.map(c=>(
            <div key={c.id} style={{background:CARD,borderRadius:20,padding:16,marginBottom:12,border:"1px solid rgba(168,85,247,0.25)"}}>
              <p style={{fontWeight:700,fontSize:15,marginBottom:4}}>{c.client}</p>
              <p style={{fontSize:12,color:"#8892B0",marginBottom:4}}>{c.id} · {c.livraison}</p>
              {c.adresse&&<p style={{fontSize:12,color:BLU2,marginBottom:4}}>📍 {c.adresse}</p>}
              {c.tel&&<p style={{fontSize:12,color:"#8892B0",marginBottom:12}}>📞 {c.tel}</p>}
              {actifs.length===0?<p style={{color:"#FF6B6B",fontSize:13}}>Aucun livreur actif</p>:(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <p style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase"}}>Appuyer pour assigner</p>
                  {actifs.map(l=>(
                    <button key={l.id} onClick={()=>assigner(c.id,l)} style={{background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",width:"100%"}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🛵</div>
                        <div style={{textAlign:"left"}}>
                          <p style={{fontWeight:700,fontSize:15,color:"#fff"}}>{l.nom}</p>
                          <p style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>{l.courses} course(s)</p>
                        </div>
                      </div>
                      <span style={{color:"#fff",fontWeight:700}}>Assigner →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {active.length>0&&(
        <>
          <STitle text="En cours" />
          {active.map(c=>(
            <div key={c.id} style={{background:CARD,borderRadius:18,padding:14,marginBottom:10,border:`1px solid ${BDR}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div><p style={{fontWeight:700,fontSize:14}}>{c.client}</p><p style={{fontSize:12,color:"#8892B0"}}>{c.id}</p>{c.adresse&&<p style={{fontSize:12,color:BLU2,marginTop:2}}>📍 {c.adresse}</p>}</div>
                <span style={{background:"#0D1F6E",color:CYAN,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700}}>En route</span>
              </div>
              <div style={{background:"#0A0F1E",borderRadius:12,padding:"10px 14px",border:`1px solid ${BDR}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>🛵</span>
                  <div><p style={{fontWeight:700,fontSize:14}}>{c.livreurNom||"—"}</p><p style={{fontSize:12,color:"#8892B0"}}>{c.livreurTel||""}</p></div>
                </div>
                {c.livreurTel&&<button onClick={()=>sendWhatsApp(c.livreurTel,"📍 Bonjour, où en êtes-vous ? Ref: "+c.id)} style={{background:"#0D3B1A",border:"1px solid #25D36640",borderRadius:10,padding:"8px 12px",color:"#25D366",fontWeight:700,fontSize:13,cursor:"pointer"}}>💬</button>}
              </div>
            </div>
          ))}
        </>
      )}

      {pending.length===0&&active.length===0&&(
        <div style={{background:CARD,borderRadius:14,padding:24,textAlign:"center",border:`1px solid ${BDR}`,marginBottom:14}}>
          <p style={{fontSize:36,marginBottom:8}}>🛵</p>
          <p style={{color:"#8892B0",fontSize:14}}>Aucune course en cours.</p>
        </div>
      )}

      <STitle text="Équipe livreurs" />
      {livreurs.map(l=>(
        <div key={l.id} style={{background:CARD,borderRadius:16,padding:14,marginBottom:10,border:`1px solid ${l.actif?BDR:"rgba(255,68,68,0.15)"}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:42,height:42,borderRadius:12,background:l.actif?`${BLU}40`:"#1A0A0A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🛵</div>
            <div><p style={{fontWeight:700,fontSize:14}}>{l.nom}</p><p style={{fontSize:12,color:"#8892B0"}}>{l.tel||"—"} · {l.courses} course(s)</p></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setLivreurs(p=>p.map(x=>x.id===l.id?{...x,actif:!x.actif}:x))} style={{background:l.actif?"#1A0A0A":"#0D3B2E",border:`1px solid ${l.actif?"#FF444430":CYAN+"40"}`,borderRadius:10,padding:"7px 10px",color:l.actif?"#FF6B6B":CYAN,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l.actif?"Désact.":"Activer"}</button>
            <button onClick={()=>setLivreurs(p=>p.filter(x=>x.id!==l.id))} style={{background:"none",border:"none",color:"#FF4444",fontSize:16,cursor:"pointer"}}>🗑️</button>
          </div>
        </div>
      ))}
      <div style={{background:CARD,borderRadius:18,padding:16,border:`1px solid ${BDR}`,marginTop:4,marginBottom:24}}>
        <p style={{fontWeight:700,fontSize:14,marginBottom:12}}>➕ Ajouter un livreur</p>
        <input value={newNom} onChange={e=>setNewNom(e.target.value)} placeholder="Nom *" style={{width:"100%",background:DARK,border:`1px solid ${newNom?BLU2:BDR}`,borderRadius:12,padding:"13px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
        <input value={newTel} onChange={e=>setNewTel(e.target.value)} placeholder="Téléphone (+228…)" style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"13px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:12}} />
        <Btn label="➕ Ajouter" onClick={addLivreur} disabled={!newNom} />
      </div>
    </div>
  );
}

// ─── CAISSE ───────────────────────────────────────────────
function Caisse({ commandes,tarifs }){
  const [period,setPeriod]=useState("today");
  const today=todayStr();
  const filtered=period==="today"?commandes.filter(c=>c.date===today):commandes;
  const ca=filtered.reduce((s,c)=>s+c.total,0);
  const byPmt=PAIEMENTS.map(p=>({...p,total:filtered.filter(c=>c.paiement===p.id).reduce((s,c)=>s+c.total,0),count:filtered.filter(c=>c.paiement===p.id).length}));
  const maxPmt=Math.max(...byPmt.map(p=>p.total),1);

  // Grouper par date pour l'historique
  const byDate={};
  commandes.forEach(c=>{if(!byDate[c.date])byDate[c.date]=[];byDate[c.date].push(c);});
  const dates=Object.keys(byDate).reverse();

  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>Caisse & Recettes</h2>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[{id:"today",l:"Aujourd'hui"},{id:"all",l:"Total"}].map(p=>(
          <button key={p.id} onClick={()=>setPeriod(p.id)} style={{flex:1,background:period===p.id?`linear-gradient(135deg,${BLU},${BLU2})`:CARD,border:`1px solid ${period===p.id?BLU2:BDR}`,borderRadius:12,padding:"10px",color:period===p.id?"#fff":"#8892B0",fontWeight:700,fontSize:13,cursor:"pointer"}}>{p.l}</button>
        ))}
      </div>
      <div style={{background:`linear-gradient(135deg,#0D1F6E,#1A3EBD22)`,borderRadius:22,padding:22,marginBottom:14,border:"1px solid rgba(0,194,255,0.3)",textAlign:"center"}}>
        <p style={{color:"#8892B0",fontSize:12,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>{period==="today"?"CA du jour":"CA total"}</p>
        <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:44,color:CYAN,letterSpacing:2,lineHeight:1}}>{fmt(ca)} FCFA</p>
        <p style={{color:BLU2,fontSize:12,marginTop:6}}>{filtered.length} commande(s)</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[{l:"Panier moyen",v:filtered.length?fmt(Math.round(ca/filtered.length))+" F":"—",c:BLU2},{l:"Livraisons",v:filtered.filter(c=>c.livraison).length,c:"#A855F7"}].map(k=>(
          <div key={k.l} style={{background:CARD,borderRadius:14,padding:14,border:`1px solid ${BDR}`,textAlign:"center"}}>
            <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:k.c}}>{k.v}</p>
            <p style={{fontSize:11,color:"#8892B0",marginTop:3}}>{k.l}</p>
          </div>
        ))}
      </div>
      <STitle text="Par mode de paiement" />
      {byPmt.map(p=>(
        <div key={p.id} style={{background:CARD,borderRadius:16,padding:"14px 16px",marginBottom:10,border:`1px solid ${BDR}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>{p.emoji}</span>
              <div><p style={{fontWeight:700,fontSize:14}}>{p.label}</p><p style={{fontSize:12,color:"#8892B0"}}>{p.count} transaction(s)</p></div>
            </div>
            <p style={{color:p.total>0?CYAN:"#8892B0",fontWeight:700,fontSize:15}}>{fmt(p.total)} F</p>
          </div>
          <div style={{height:5,background:"#1A2240",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(p.total/maxPmt)*100}%`,background:p.color,borderRadius:99,transition:"width 0.6s ease"}} />
          </div>
        </div>
      ))}
      <STitle text="Recettes par jour" />
      {dates.map(date=>{
        const cmds=byDate[date];
        const dayCa=cmds.reduce((s,c)=>s+c.total,0);
        const maxCa=Math.max(...dates.map(d=>byDate[d].reduce((s,c)=>s+c.total,0)),1);
        return (
          <div key={date} style={{background:CARD,borderRadius:16,padding:"14px 16px",marginBottom:10,border:`1px solid ${BDR}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div><p style={{fontWeight:700,fontSize:14}}>📅 {date}</p><p style={{fontSize:12,color:"#8892B0"}}>{cmds.length} commande(s)</p></div>
              <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:CYAN}}>{fmt(dayCa)} F</p>
            </div>
            <div style={{height:5,background:"#1A2240",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(dayCa/maxCa)*100}%`,background:`linear-gradient(90deg,${BLU},${CYAN})`,borderRadius:99}} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── FIDÉLITÉ ─────────────────────────────────────────────
function Fidelite({ clients,setClients,rewards }){
  const [search,setSearch]=useState("");
  const [sel,setSel]=useState(null);
  const [addPts,setAddPts]=useState("");
  const [msg,setMsg]=useState("");
  function flash(m){setMsg(m);setTimeout(()=>setMsg(""),2000);}
  const filtered=clients.filter(c=>c.nom.toLowerCase().includes(search.toLowerCase())||c.tel.includes(search));
  const client=clients.find(c=>c.id===sel);
  function ajouterPts(){
    const p=parseInt(addPts);if(!p||p<=0)return;
    setClients(prev=>prev.map(c=>c.id!==sel?c:{...c,points:c.points+p,historique:[{date:todayStr(),pts:p,desc:"Ajout manuel"},...(c.historique||[])]}));
    setAddPts(""); flash(`✅ +${p} pts ajoutés !`);
  }
  function accorderReward(r){
    if(!client||client.points<r.pts)return;
    setClients(prev=>prev.map(c=>c.id!==sel?c:{...c,points:c.points-r.pts,historique:[{date:todayStr(),pts:-r.pts,desc:"Récompense: "+r.label},...(c.historique||[])]}));
    flash(`✅ "${r.label}" accordée !`);
  }
  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>Fidélité 🏅</h2>
      {msg&&<div style={{background:"#0D3B2E",borderRadius:12,padding:"10px 16px",marginBottom:14,border:`1px solid ${CYAN}40`}}><p style={{color:CYAN,fontWeight:700}}>{msg}</p></div>}
      <input value={search} onChange={e=>{setSearch(e.target.value);setSel(null);}} placeholder="🔍 Rechercher un client…" style={{width:"100%",background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:"13px 15px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:12}} />
      {filtered.map(c=>{
        const lv=getLevel(c.points);
        const isOpen=sel===c.id;
        return (
          <div key={c.id}>
            <div onClick={()=>setSel(isOpen?null:c.id)} style={{background:isOpen?"#0D1F6E":CARD,borderRadius:isOpen?"18px 18px 0 0":18,padding:16,marginBottom:isOpen?0:10,border:`1px solid ${isOpen?BLU2:BDR}`,cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${lv.color}22`,border:`2px solid ${lv.color}60`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',cursive",fontSize:18,color:lv.color}}>{lv.label[0]}</div>
                  <div><p style={{fontWeight:700,fontSize:15}}>{c.nom}</p><p style={{fontSize:12,color:"#8892B0"}}>{c.tel}</p></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:lv.color}}>{c.points}</p>
                  <p style={{fontSize:10,color:lv.color,fontWeight:700}}>{lv.label}</p>
                </div>
              </div>
            </div>
            {isOpen&&client&&(
              <div style={{background:"#0A1628",borderRadius:"0 0 18px 18px",padding:16,border:`1px solid ${BLU2}`,borderTop:"none",marginBottom:10,animation:"fadeIn 0.3s ease"}}>
                <STitle text="Ajouter des points" />
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  {[10,20,50,100].map(p=><button key={p} onClick={()=>setAddPts(String(p))} style={{flex:1,background:addPts===String(p)?`${BLU}40`:DARK,border:`1px solid ${addPts===String(p)?BLU2:BDR}`,borderRadius:10,padding:"10px 4px",color:addPts===String(p)?BLU2:"#8892B0",fontWeight:700,fontSize:13,cursor:"pointer"}}>+{p}</button>)}
                </div>
                <div style={{display:"flex",gap:10,marginBottom:14}}>
                  <input type="number" value={addPts} onChange={e=>setAddPts(e.target.value)} placeholder="Nb pts" style={{flex:1,background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"11px",color:CYAN,fontSize:18,fontWeight:700,outline:"none",textAlign:"center"}} />
                  <button onClick={ajouterPts} disabled={!addPts||parseInt(addPts)<=0} style={{flex:1,background:addPts?`linear-gradient(135deg,${BLU},${BLU2})`:DARK,border:"none",borderRadius:12,padding:"11px",color:addPts?"#fff":"#8892B0",fontWeight:700,cursor:addPts?"pointer":"not-allowed"}}>Ajouter</button>
                </div>
                <STitle text="Accorder une récompense" />
                {rewards.map(r=>{
                  const can=client.points>=r.pts;
                  return (
                    <div key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:CARD,borderRadius:14,padding:"12px 14px",marginBottom:8,border:`1px solid ${can?r.color+"30":BDR}`,opacity:can?1:0.5}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:20}}>{r.emoji}</span>
                        <div><p style={{fontWeight:700,fontSize:13}}>{r.label}</p><p style={{fontSize:11,color:r.color}}>{r.pts} pts</p></div>
                      </div>
                      <button onClick={()=>accorderReward(r)} disabled={!can} style={{background:can?`linear-gradient(135deg,${BLU},${BLU2})`:DARK,border:"none",borderRadius:10,padding:"8px 14px",color:can?"#fff":"#8892B0",fontWeight:700,fontSize:12,cursor:can?"pointer":"not-allowed"}}>Accorder</button>
                    </div>
                  );
                })}
                <STitle text="Historique" />
                {(client.historique||[]).slice(0,5).map((h,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div><p style={{fontSize:13,fontWeight:600}}>{h.desc}</p><p style={{fontSize:11,color:"#8892B0"}}>{h.date}</p></div>
                    <span style={{color:h.pts>0?CYAN:"#FF6B6B",fontWeight:700,fontSize:14}}>{h.pts>0?"+":""}{h.pts} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── RÉCOMPENSES ──────────────────────────────────────────
function GestionRecompenses({ rewards,setRewards }){
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const [newForm,setNewForm]=useState({label:"",desc:"",pts:50,emoji:"🎁",color:BLU2});
  const [msg,setMsg]=useState("");
  const EMOJIS=["🫧","🌀","🧴","👜","👔","🎁","🏆","🛍️","☕","🎟️","👗","🧺","✨","💳"];
  const COLORS=[CYAN,BLU2,"#A855F7","#FFB800","#00E5A0","#FF6B6B","#FFD700","#00A651"];
  function flash(m){setMsg(m);setTimeout(()=>setMsg(""),2000);}
  function startEdit(r){setEditing(r.id);setForm({label:r.label,desc:r.desc,pts:r.pts,emoji:r.emoji,color:r.color});}
  function saveEdit(){setRewards(p=>p.map(r=>r.id===editing?{...r,...form,pts:parseInt(form.pts)||r.pts}:r));setEditing(null);flash("✅ Récompense mise à jour !");}
  function remove(id){setRewards(p=>p.filter(r=>r.id!==id));flash("🗑️ Supprimée");}
  function addReward(){if(!newForm.label||!newForm.pts)return;setRewards(p=>[...p,{...newForm,id:Date.now(),pts:parseInt(newForm.pts)}]);setNewForm({label:"",desc:"",pts:50,emoji:"🎁",color:BLU2});setShowAdd(false);flash("✅ Récompense ajoutée !");}
  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>Récompenses 🎁</h2>
      {msg&&<div style={{background:"#0D3B2E",borderRadius:12,padding:"10px 16px",marginBottom:14,border:`1px solid ${CYAN}40`}}><p style={{color:CYAN,fontWeight:700}}>{msg}</p></div>}
      {rewards.map((r,idx)=>(
        <div key={r.id}>
          {editing!==r.id?(
            <div style={{background:CARD,borderRadius:18,padding:14,marginBottom:10,border:`1px solid ${r.color}30`}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <div style={{width:48,height:48,borderRadius:12,background:`${r.color}22`,border:`1px solid ${r.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{r.emoji}</div>
                <div style={{flex:1}}><p style={{fontWeight:700,fontSize:15}}>{r.label}</p><p style={{fontSize:12,color:"#8892B0"}}>{r.desc}</p><p style={{fontSize:13,color:r.color,fontWeight:700,marginTop:3}}>{r.pts} pts</p></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>startEdit(r)} style={{flex:1,background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:12,padding:"10px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>✏️ Modifier</button>
                <button onClick={()=>remove(r.id)} style={{background:"#1A0A0A",border:"1px solid #FF444440",borderRadius:12,padding:"10px 14px",color:"#FF6B6B",fontWeight:700,cursor:"pointer"}}>🗑️</button>
              </div>
            </div>
          ):(
            <div style={{background:"#0A1628",borderRadius:18,padding:16,marginBottom:10,border:`1px solid ${BLU2}`,animation:"fadeIn 0.25s ease"}}>
              <p style={{fontWeight:700,fontSize:14,color:BLU2,marginBottom:12}}>✏️ Modifier</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>{EMOJIS.map(e=><button key={e} onClick={()=>setForm(p=>({...p,emoji:e}))} style={{background:form.emoji===e?`${BLU}40`:DARK,border:`1px solid ${form.emoji===e?BLU2:BDR}`,borderRadius:10,padding:"8px",fontSize:20,cursor:"pointer",width:44,height:44}}>{e}</button>)}</div>
              <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="Nom" style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"12px 14px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
              <input value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} placeholder="Description" style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"12px 14px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
              <input type="number" value={form.pts} onChange={e=>setForm(p=>({...p,pts:e.target.value}))} style={{width:"100%",background:DARK,border:`1px solid ${BLU2}`,borderRadius:12,padding:"12px",color:CYAN,fontSize:22,fontWeight:700,outline:"none",textAlign:"center",marginBottom:10}} />
              <div style={{display:"flex",gap:8,marginBottom:14}}>{COLORS.map(c=><button key={c} onClick={()=>setForm(p=>({...p,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,border:`3px solid ${form.color===c?"#fff":"transparent"}`,cursor:"pointer"}} />)}</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={saveEdit} style={{flex:1,background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:12,padding:"13px",color:"#fff",fontWeight:700,cursor:"pointer"}}>💾 Sauvegarder</button>
                <button onClick={()=>setEditing(null)} style={{background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"13px 16px",color:"#8892B0",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {!showAdd?(
        <button onClick={()=>setShowAdd(true)} style={{width:"100%",background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:16,padding:16,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:20}}>➕ Ajouter une récompense</button>
      ):(
        <div style={{background:CARD,borderRadius:18,padding:18,marginBottom:20,border:`1px solid ${BDR}`,animation:"fadeIn 0.25s ease"}}>
          <p style={{fontWeight:700,fontSize:15,color:BLU2,marginBottom:12}}>➕ Nouvelle récompense</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>{EMOJIS.map(e=><button key={e} onClick={()=>setNewForm(p=>({...p,emoji:e}))} style={{background:newForm.emoji===e?`${BLU}40`:DARK,border:`1px solid ${newForm.emoji===e?BLU2:BDR}`,borderRadius:10,padding:"8px",fontSize:20,cursor:"pointer",width:44,height:44}}>{e}</button>)}</div>
          <input value={newForm.label} onChange={e=>setNewForm(p=>({...p,label:e.target.value}))} placeholder="Nom *" style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"12px 14px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
          <input value={newForm.desc} onChange={e=>setNewForm(p=>({...p,desc:e.target.value}))} placeholder="Description" style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"12px 14px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
          <input type="number" value={newForm.pts} onChange={e=>setNewForm(p=>({...p,pts:e.target.value}))} style={{width:"100%",background:DARK,border:`1px solid ${BLU2}`,borderRadius:12,padding:"12px",color:CYAN,fontSize:22,fontWeight:700,outline:"none",textAlign:"center",marginBottom:10}} />
          <div style={{display:"flex",gap:8,marginBottom:14}}>{COLORS.map(c=><button key={c} onClick={()=>setNewForm(p=>({...p,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,border:`3px solid ${newForm.color===c?"#fff":"transparent"}`,cursor:"pointer"}} />)}</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={addReward} disabled={!newForm.label||!newForm.pts} style={{flex:1,background:newForm.label&&newForm.pts?`linear-gradient(135deg,${BLU},${BLU2})`:DARK,border:"none",borderRadius:12,padding:"13px",color:newForm.label&&newForm.pts?"#fff":"#8892B0",fontWeight:700,cursor:newForm.label&&newForm.pts?"pointer":"not-allowed"}}>➕ Ajouter</button>
            <button onClick={()=>setShowAdd(false)} style={{background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"13px 16px",color:"#8892B0",cursor:"pointer"}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FRIPERIE ─────────────────────────────────────────────
function Friperie({ friperie, setFriperie }){
  const [show,     setShow]    = useState(false);
  const [editId,   setEditId]  = useState(null);
  const [editPrix, setEditPrix]= useState("");
  const [msg,      setMsg]     = useState("");
  const [form,     setForm]    = useState({nom:"",taille:"M",prix:"",etat:"Excellent",emoji:"👕",photo:""});

  const WA_NUM = "22879621085";

  function flash(m){ setMsg(m); setTimeout(()=>setMsg(""),2500); }

  function ajouter(){
    if(!form.nom||!form.prix) return;
    setFriperie(p=>[...p,{...form,id:Date.now(),prix:parseInt(form.prix)}]);
    setForm({nom:"",taille:"M",prix:"",etat:"Excellent",emoji:"👕",photo:""});
    setShow(false); flash("✅ Article ajouté !");
  }

  function savePrix(id){
    const p=parseInt(editPrix); if(!p||p<=0) return;
    setFriperie(prev=>prev.map(x=>x.id===id?{...x,prix:p}:x));
    setEditId(null); setEditPrix(""); flash("✅ Prix mis à jour !");
  }

  function commanderWA(item){
    const msg = `Bonjour JOKER Laverie ! 👋%0A%0AJe suis intéressé(e) par cet article :%0A%0A👗 *${item.nom}*%0A📏 Taille : ${item.taille}%0A✨ État : ${item.etat}%0A💰 Prix : ${item.prix.toLocaleString("fr-FR")} FCFA%0A%0AEst-il encore disponible ?`;
    window.open(`https://wa.me/${WA_NUM}?text=${msg}`, "_blank");
  }

  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2}}>Friperie 👗</h2>
        <button onClick={()=>setShow(!show)} style={{background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:12,padding:"8px 16px",color:"#fff",fontWeight:700,cursor:"pointer"}}>+ Ajouter</button>
      </div>

      {msg&&<div style={{background:"#0D3B2E",borderRadius:12,padding:"10px 16px",marginBottom:14,border:`1px solid ${CYAN}40`}}><p style={{color:CYAN,fontWeight:700,fontSize:13}}>{msg}</p></div>}

      {/* Formulaire ajout */}
      {show&&(
        <div style={{background:CARD,borderRadius:20,padding:18,marginBottom:14,border:`1px solid ${BDR}`,animation:"fadeIn 0.3s ease"}}>
          <p style={{fontWeight:700,fontSize:15,color:BLU2,marginBottom:12}}>Nouvel article</p>

          {/* URL Photo */}
          <div style={{marginBottom:12}}>
            <p style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Lien photo (URL)</p>
            <input
              value={form.photo}
              onChange={e=>setForm(p=>({...p,photo:e.target.value}))}
              placeholder="https://... (coller le lien de la photo)"
              style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"11px",color:"#F8FAFF",fontSize:13,outline:"none"}}
            />
            {form.photo&&(
              <img src={form.photo} alt="preview" style={{width:"100%",height:140,objectFit:"cover",borderRadius:12,marginTop:8}} onError={e=>e.target.style.display="none"} />
            )}
          </div>

          {[{k:"nom",ph:"Nom de l'article"},{k:"prix",ph:"Prix en FCFA",type:"number"}].map(f=>(
            <input key={f.k} type={f.type||"text"} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
              style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"11px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
          ))}

          <p style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Taille</p>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {["XS","S","M","L","XL","XXL"].map(sz=>(
              <button key={sz} onClick={()=>setForm(p=>({...p,taille:sz}))} style={{flex:1,background:form.taille===sz?`${BLU}40`:DARK,border:`1px solid ${form.taille===sz?BLU2:BDR}`,borderRadius:10,padding:"8px 4px",color:form.taille===sz?BLU2:"#8892B0",fontWeight:700,fontSize:11,cursor:"pointer"}}>{sz}</button>
            ))}
          </div>

          <p style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>État</p>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {["Neuf","Excellent","Très bon","Bon"].map(e=>(
              <button key={e} onClick={()=>setForm(p=>({...p,etat:e}))} style={{flex:1,background:form.etat===e?`${BLU}40`:DARK,border:`1px solid ${form.etat===e?BLU2:BDR}`,borderRadius:10,padding:"8px 4px",color:form.etat===e?BLU2:"#8892B0",fontWeight:600,fontSize:10,cursor:"pointer"}}>{e}</button>
            ))}
          </div>

          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {["👕","👔","👗","👖","🧥","👜"].map(e=>(
              <button key={e} onClick={()=>setForm(p=>({...p,emoji:e}))} style={{background:form.emoji===e?`${BLU}40`:DARK,border:`1px solid ${form.emoji===e?BLU2:BDR}`,borderRadius:10,padding:"8px",fontSize:18,cursor:"pointer"}}>{e}</button>
            ))}
          </div>

          <Btn label="Ajouter l'article" onClick={ajouter} disabled={!form.nom||!form.prix} />
        </div>
      )}

      {/* Liste articles */}
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
        {friperie.length===0&&(
          <div style={{background:CARD,borderRadius:14,padding:24,textAlign:"center",border:`1px solid ${BDR}`}}>
            <p style={{fontSize:36,marginBottom:8}}>👗</p>
            <p style={{color:"#8892B0",fontSize:14}}>Aucun article en stock.</p>
          </div>
        )}
        {friperie.map(item=>(
          <div key={item.id} style={{background:CARD,borderRadius:20,border:`1px solid ${BDR}`,overflow:"hidden"}}>
            {/* Photo */}
            <div style={{width:"100%",height:200,background:"#0A0F1E",position:"relative",overflow:"hidden"}}>
              {item.photo
                ? <img src={item.photo} alt={item.nom} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"} />
                : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:72}}>{item.emoji}</div>
              }
              <span style={{position:"absolute",top:8,left:8,background:"rgba(6,13,31,0.88)",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,color:CYAN}}>{item.etat}</span>
              <span style={{position:"absolute",top:8,right:8,background:`linear-gradient(135deg,${BLU},${BLU2})`,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,color:"#fff"}}>{item.taille}</span>
            </div>

            {/* Infos */}
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <p style={{fontWeight:700,fontSize:16,color:"#F8FAFF"}}>{item.nom}</p>
                {editId===item.id ? (
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="number" value={editPrix} onChange={e=>setEditPrix(e.target.value)} autoFocus
                      style={{width:90,background:DARK,border:`1px solid ${BLU2}`,borderRadius:10,padding:"6px 8px",color:CYAN,fontSize:16,fontWeight:700,outline:"none",textAlign:"center"}} />
                    <button onClick={()=>savePrix(item.id)} style={{background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>✓</button>
                    <button onClick={()=>{setEditId(null);setEditPrix("");}} style={{background:DARK,border:`1px solid ${BDR}`,borderRadius:8,padding:"6px 8px",color:"#8892B0",fontSize:12,cursor:"pointer"}}>✕</button>
                  </div>
                ) : (
                  <button onClick={()=>{setEditId(item.id);setEditPrix(String(item.prix));}} style={{background:"none",border:"none",cursor:"pointer",textAlign:"right"}}>
                    <p style={{color:CYAN,fontWeight:700,fontSize:20}}>{fmt(item.prix)} F</p>
                    <p style={{fontSize:10,color:BLU2,marginTop:2}}>✏️ Modifier prix</p>
                  </button>
                )}
              </div>

              {/* Bouton WhatsApp */}
              <button onClick={()=>commanderWA(item)} style={{width:"100%",background:"linear-gradient(135deg,#25D366,#128C7E)",border:"none",borderRadius:14,padding:"12px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span style={{fontSize:20}}>📲</span> Commander via WhatsApp
              </button>

              <button onClick={()=>setFriperie(p=>p.filter(f=>f.id!==item.id))} style={{background:"none",border:"none",color:"#FF4444",fontSize:12,cursor:"pointer",fontWeight:600}}>🗑️ Retirer l'article</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── RÉGLAGES ─────────────────────────────────────────────
function Reglages({ gerantPin,setGerantPin,adminPw,setAdminPw }){
  const [showAdmin,setShowAdmin]=useState(false);
  const [pwInput,setPwInput]=useState("");
  const [adminOk,setAdminOk]=useState(false);
  const [newPin,setNewPin]=useState("");
  const [newPw,setNewPw]=useState("");
  const [confirmPw,setConfirmPw]=useState("");
  const [msg,setMsg]=useState("");
  const [pwErr,setPwErr]=useState(false);
  function flash(m){setMsg(m);setTimeout(()=>setMsg(""),2000);}
  function tryPw(){if(pwInput===adminPw){setAdminOk(true);setShowAdmin(false);setPwInput("");}else{setPwErr(true);setTimeout(()=>{setPwInput("");setPwErr(false);},800);}}
  function savePin(){if(newPin.length!==4||isNaN(newPin)){flash("❌ 4 chiffres requis");return;}setGerantPin(newPin);setNewPin("");flash("✅ PIN mis à jour !");}
  function savePw(){if(newPw.length<6){flash("❌ Min. 6 caractères");return;}if(newPw!==confirmPw){flash("❌ Mots de passe différents");return;}setAdminPw(newPw);setNewPw("");setConfirmPw("");flash("✅ Mot de passe mis à jour !");}
  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>Réglages ⚙️</h2>
      {msg&&<div style={{background:msg.startsWith("✅")?"#0D3B2E":"#3B0D0D",borderRadius:12,padding:"10px 16px",marginBottom:14,border:`1px solid ${msg.startsWith("✅")?CYAN+"40":"#FF444440"}`}}><p style={{color:msg.startsWith("✅")?CYAN:"#FF6B6B",fontWeight:700}}>{msg}</p></div>}
      <div style={{background:CARD,borderRadius:18,padding:18,marginBottom:14,border:"1px solid rgba(0,194,255,0.2)"}}>
        <p style={{color:"#8892B0",fontSize:12,marginBottom:8}}>Numéros Mobile Money</p>
        {[{l:"🟢 Flooz",n:JOKER_FLOOZ},{l:"🔴 T-Money",n:JOKER_TMONEY}].map(n=>(
          <div key={n.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:"#8892B0",fontSize:13}}>{n.l}</span>
            <span style={{color:CYAN,fontWeight:700,fontSize:14}}>{n.n}</span>
          </div>
        ))}
      </div>
      {!adminOk&&!showAdmin&&<button onClick={()=>setShowAdmin(true)} style={{width:"100%",background:"linear-gradient(135deg,#6B21A8,#A855F7)",border:"none",borderRadius:16,padding:16,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:14}}>🔐 Panneau Admin</button>}
      {showAdmin&&!adminOk&&(
        <div style={{background:CARD,borderRadius:18,padding:18,marginBottom:14,border:"1px solid rgba(168,85,247,0.3)"}}>
          <input type="password" value={pwInput} onChange={e=>{setPwInput(e.target.value);setPwErr(false);}} onKeyDown={e=>e.key==="Enter"&&tryPw()} placeholder="Mot de passe admin (joker2026)" style={{width:"100%",background:DARK,border:`2px solid ${pwErr?"#FF4444":pwInput?BLU2:BDR}`,borderRadius:12,padding:"14px",color:"#F8FAFF",fontSize:16,outline:"none",textAlign:"center",marginBottom:10}} />
          {pwErr&&<p style={{color:"#FF4444",fontSize:13,marginBottom:8}}>❌ Mot de passe incorrect</p>}
          <Btn label="🔓 Accéder" onClick={tryPw} disabled={!pwInput} />
        </div>
      )}
      {adminOk&&(
        <div style={{background:CARD,borderRadius:18,padding:18,border:"1px solid rgba(168,85,247,0.3)"}}>
          <p style={{fontWeight:700,fontSize:15,color:"#A855F7",marginBottom:14}}>🔐 Panneau Admin</p>
          <p style={{fontWeight:600,fontSize:13,marginBottom:8}}>Nouveau PIN gérant (4 chiffres)</p>
          <input type="number" value={newPin} onChange={e=>setNewPin(e.target.value.slice(0,4))} placeholder="Ex: 5678" style={{width:"100%",background:DARK,border:`1px solid ${newPin.length===4?BLU2:BDR}`,borderRadius:12,padding:"12px",color:CYAN,fontSize:22,fontWeight:700,outline:"none",textAlign:"center",letterSpacing:8,marginBottom:10}} />
          <Btn label="💾 Sauvegarder PIN" onClick={savePin} disabled={newPin.length!==4} />
          <p style={{fontWeight:600,fontSize:13,marginBottom:8,marginTop:16}}>Nouveau mot de passe admin</p>
          <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 6 caractères" style={{width:"100%",background:DARK,border:`1px solid ${BDR}`,borderRadius:12,padding:"12px 14px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:8}} />
          <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Confirmer" style={{width:"100%",background:DARK,border:`1px solid ${confirmPw&&confirmPw===newPw?CYAN:BDR}`,borderRadius:12,padding:"12px 14px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
          <Btn label="💾 Sauvegarder MDP" onClick={savePw} disabled={newPw.length<6||newPw!==confirmPw} />
        </div>
      )}
    </div>
  );
}

// ─── ESPACE CLIENT ────────────────────────────────────────
function ClientSpace({ commandes,setCommandes,friperie,rewards }){
  const [tab,setTab]=useState("suivi");
  const [rech,setRech]=useState("");
  const [res,setRes]=useState(null);
  const [notFound,setNotFound]=useState(false);
  const [showLiv,setShowLiv]=useState(false);
  const [livType,setLivType]=useState("recuperation");
  const [adresse,setAdresse]=useState("");
  const [tel,setTel]=useState("");
  const [sent,setSent]=useState(false);

  function chercher(){
    const f=commandes.find(c=>c.id.toLowerCase()===rech.trim().toLowerCase()||c.client.toLowerCase().includes(rech.trim().toLowerCase()));
    if(f){setRes(f);setNotFound(false);}else{setRes(null);setNotFound(true);}
    setShowLiv(false);setSent(false);
  }
  function demanderLiv(){
    if(!adresse)return;
    setCommandes(p=>p.map(c=>c.id===res.id?{...c,livraison:livType,adresse,tel:tel||c.tel,livraisonStatut:"pending"}:c));
    setRes(p=>({...p,livraison:livType,adresse,livraisonStatut:"pending"}));
    setSent(true);setShowLiv(false);
  }

  return (
    <div style={{paddingBottom:70}}>
      <div style={{padding:"32px 20px 0",textAlign:"center"}}>
        <Logo size={80} style={{margin:"0 auto 12px"}} />
        <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:3}}>JOKER LAVERIE</h1>
        <p style={{color:BLU2,fontSize:11,letterSpacing:3,marginTop:2}}>PROPRETÉ · QUALITÉ · FIABILITÉ</p>
        <p style={{color:"#8892B0",fontSize:12,marginTop:4}}>Lomé, Togo</p>
      </div>
      <div style={{display:"flex",margin:"16px 20px 0",background:CARD,borderRadius:14,overflow:"hidden",border:`1px solid ${BDR}`}}>
        {[{id:"suivi",l:"📦 Commande"},{id:"fidelite",l:"🏅 Fidélité"},{id:"friperie",l:"👗 Friperie"}].map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{flex:1,background:tab===tb.id?`linear-gradient(135deg,${BLU},${BLU2})`:"transparent",border:"none",padding:"12px 4px",color:tab===tb.id?"#fff":"#8892B0",fontWeight:700,fontSize:11,cursor:"pointer"}}>{tb.l}</button>
        ))}
      </div>

      {tab==="suivi"&&(
        <div style={{padding:"16px 20px 0"}}>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <input value={rech} onChange={e=>setRech(e.target.value)} onKeyDown={e=>e.key==="Enter"&&chercher()} placeholder="N° ticket ou nom…" style={{flex:1,background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:"13px 15px",color:"#F8FAFF",fontSize:15,outline:"none"}} />
            <button onClick={chercher} style={{background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:14,padding:"13px 16px",color:"#fff",fontWeight:700,fontSize:18,cursor:"pointer"}}>🔍</button>
          </div>
          {notFound&&<p style={{color:"#FF6B6B",fontSize:14,marginBottom:12}}>Aucune commande trouvée.</p>}
          {res&&(
            <div style={{background:CARD,borderRadius:20,padding:18,marginBottom:16,border:`1px solid ${statutColor[res.statut]||BLU2}40`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div><p style={{fontWeight:700,fontSize:16}}>{res.client}</p><p style={{fontSize:13,color:"#8892B0"}}>{res.id} · {res.date}</p></div>
                <Badge statut={res.statut} />
              </div>
              {[["Poids",res.poids+"kg"+(res.poidsStatut==="estimated"?" (estimé)":"")],["Total",fmt(res.total)+" FCFA"+(res.poidsStatut==="estimated"?" (estimé)":"")],["+Points","+"+res.points+" 🏅"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{color:"#8892B0",fontSize:13}}>{k}</span>
                  <span style={{fontWeight:700,color:k==="+Points"?BLU2:"#F8FAFF",fontSize:13}}>{v}</span>
                </div>
              ))}
              {res.paiementConfirme&&<div style={{background:"#0D3B2E",borderRadius:10,padding:"10px",marginTop:10,border:`1px solid ${CYAN}40`}}><p style={{color:CYAN,fontWeight:700,fontSize:13}}>✅ Paiement confirmé</p></div>}
              {res.statut==="En cours"&&!res.paiementConfirme&&(
                <div style={{marginTop:12}}>
                  <p style={{fontSize:12,color:"#8892B0",marginBottom:10}}>Payer par mobile money :</p>
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>sendWhatsApp(JOKER_FLOOZ,`🃏 *JOKER Laverie*\n\n💳 Paiement Flooz\n\nEnvoyez *${fmt(res.total)} FCFA* au :\n📱 *${JOKER_FLOOZ}*\n\n🎫 Réf: *${res.id}*`)} style={{flex:1,background:"linear-gradient(135deg,#004d20,#006b2b)",border:"1px solid #00A65140",borderRadius:14,padding:"14px 8px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <span style={{fontSize:20}}>🟢</span><span>Flooz</span>
                    </button>
                    <button onClick={()=>sendWhatsApp(JOKER_TMONEY,`🃏 *JOKER Laverie*\n\n💳 Paiement T-Money\n\nEnvoyez *${fmt(res.total)} FCFA* au :\n📱 *${JOKER_TMONEY}*\n\n🎫 Réf: *${res.id}*`)} style={{flex:1,background:"linear-gradient(135deg,#4d0000,#6b0000)",border:"1px solid #E3061340",borderRadius:14,padding:"14px 8px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <span style={{fontSize:20}}>🔴</span><span>T-Money</span>
                    </button>
                  </div>
                </div>
              )}
              {res.livraison&&<div style={{background:res.livraisonStatut==="pending"?"#1A0D3D":"#0D1F6E",borderRadius:10,padding:"10px",marginTop:10,border:`1px solid ${res.livraisonStatut==="pending"?"#A855F7":BLU2}40`}}><p style={{color:res.livraisonStatut==="pending"?"#A855F7":CYAN,fontWeight:700,fontSize:13}}>{res.livraisonStatut==="pending"?"⏳ Livraison en attente":"✅ Livraison confirmée"}</p></div>}
              {res.statut==="Prêt"&&!res.livraison&&!sent&&(
                <div style={{marginTop:12}}>
                  <div style={{background:"#0D1F6E",borderRadius:10,padding:"10px",textAlign:"center",border:`1px solid ${BLU2}40`,marginBottom:10}}><p style={{color:CYAN,fontWeight:700}}>🎉 Votre linge est prêt !</p></div>
                  <button onClick={()=>setShowLiv(!showLiv)} style={{width:"100%",background:"#1A0D3D",border:"1px solid #A855F740",borderRadius:12,padding:"12px",color:"#A855F7",fontWeight:700,fontSize:14,cursor:"pointer"}}>🛵 Demander la livraison</button>
                </div>
              )}
              {sent&&<div style={{marginTop:10,background:"#0D2A3D",borderRadius:10,padding:"12px",border:`1px solid ${CYAN}40`,textAlign:"center"}}><p style={{color:CYAN,fontWeight:700}}>✅ Demande envoyée !</p></div>}
              {showLiv&&(
                <div style={{marginTop:12,background:DARK,borderRadius:14,padding:16,border:"1px solid rgba(168,85,247,0.3)"}}>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    {[{id:"recuperation",l:"Récupération"},{id:"les-deux",l:"Aller-retour"}].map(o=>(
                      <button key={o.id} onClick={()=>setLivType(o.id)} style={{flex:1,background:livType===o.id?"#1A0D3D":CARD,border:`1px solid ${livType===o.id?"#A855F7":BDR}`,borderRadius:12,padding:"10px",color:livType===o.id?"#A855F7":"#8892B0",fontWeight:600,fontSize:12,cursor:"pointer"}}>{o.l}</button>
                    ))}
                  </div>
                  <input value={adresse} onChange={e=>setAdresse(e.target.value)} placeholder="Votre adresse *" style={{width:"100%",background:CARD,border:"1px solid rgba(168,85,247,0.3)",borderRadius:12,padding:"11px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:10}} />
                  <input value={tel} onChange={e=>setTel(e.target.value)} placeholder="Téléphone" style={{width:"100%",background:CARD,border:`1px solid ${BDR}`,borderRadius:12,padding:"11px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:12}} />
                  <p style={{fontSize:11,color:"#A855F780",marginBottom:10}}>+{fmt(LIVRAISON_TARIF)} FCFA · Confirmation requise</p>
                  <button onClick={demanderLiv} disabled={!adresse} style={{width:"100%",background:adresse?"linear-gradient(135deg,#6B21A8,#A855F7)":CARD,border:"none",borderRadius:12,padding:"13px",color:adresse?"#fff":"#8892B0",fontWeight:700,fontSize:14,cursor:adresse?"pointer":"not-allowed"}}>Envoyer 🛵</button>
                </div>
              )}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[{icon:"⚖️",t:"Pesée directe",d:"Tarif calculé devant vous"},{icon:"🛵",t:"Livraison moto",d:"Dépôt & récupération"},{icon:"🏅",t:"Points fidélité",d:"1 pt / 100 FCFA"},{icon:"💳",t:"Mobile Money",d:"Flooz · T-Money"}].map(c=>(
              <div key={c.t} style={{background:CARD,borderRadius:18,padding:14,border:`1px solid ${BDR}`}}>
                <div style={{fontSize:22,marginBottom:6}}>{c.icon}</div>
                <p style={{fontWeight:700,fontSize:12,marginBottom:3}}>{c.t}</p>
                <p style={{fontSize:11,color:"#8892B0",lineHeight:1.4}}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="fidelite"&&(
        <div style={{padding:"16px 20px 0"}}>
          <div style={{background:`linear-gradient(135deg,#0D1F6E,#1A3EBD22)`,borderRadius:20,padding:20,marginBottom:16,border:"1px solid rgba(0,194,255,0.2)",textAlign:"center"}}>
            <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,marginBottom:4}}>Programme Fidélité</p>
            <p style={{color:"#8892B0",fontSize:13,marginBottom:16}}>Recherchez votre commande pour voir vos points.</p>
            {LEVEL_SEUILS.map(l=>(
              <div key={l.label} style={{display:"flex",alignItems:"center",gap:12,background:CARD,borderRadius:12,padding:"10px 14px",marginBottom:8,border:`1px solid ${l.color}30`}}>
                <span style={{fontSize:18}}>{l.label==="Bronze"?"🥉":l.label==="Silver"?"🥈":l.label==="Gold"?"🥇":"💎"}</span>
                <div style={{flex:1,textAlign:"left"}}><p style={{fontWeight:700,fontSize:13,color:l.color}}>{l.label}</p><p style={{fontSize:11,color:"#8892B0"}}>{l.max===Infinity?`dès ${fmt(l.min)} pts`:`${fmt(l.min)}–${fmt(l.max)} pts`}</p></div>
              </div>
            ))}
          </div>
          <STitle text="Récompenses disponibles" />
          {rewards.map(r=>(
            <div key={r.id} style={{background:CARD,borderRadius:18,padding:14,marginBottom:10,display:"flex",alignItems:"center",gap:14,border:`1px solid ${r.color}30`}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${r.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{r.emoji}</div>
              <div style={{flex:1}}><p style={{fontWeight:700,fontSize:14}}>{r.label}</p><p style={{fontSize:12,color:"#8892B0"}}>{r.desc}</p></div>
              <p style={{color:r.color,fontWeight:700,fontSize:14}}>{r.pts} pts</p>
            </div>
          ))}
          <div style={{background:"#0D1F6E22",borderRadius:14,padding:"12px 16px",border:`1px solid ${BLU2}30`,marginTop:8}}>
            <p style={{color:BLU2,fontSize:12,fontWeight:600}}>💡 1 point = 100 FCFA dépensés</p>
            <p style={{color:"#8892B0",fontSize:12,marginTop:4}}>Présentez votre ticket à la laverie pour utiliser vos récompenses.</p>
          </div>
        </div>
      )}

      {tab==="friperie"&&(
        <div style={{padding:"16px 20px 0"}}>
          <p style={{color:"#8892B0",fontSize:13,marginBottom:14}}>Articles sélectionnés · Lomé, Togo</p>
          {friperie.length===0&&<div style={{textAlign:"center",padding:24}}><p style={{fontSize:36,marginBottom:8}}>👗</p><p style={{color:"#8892B0",fontSize:14}}>Aucun article disponible.</p></div>}
          <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
          {friperie.map(item=>(
            <div key={item.id} style={{background:CARD,borderRadius:20,border:`1px solid ${BDR}`,overflow:"hidden"}}>
              {/* Photo */}
              <div style={{width:"100%",height:200,background:"#0A0F1E",position:"relative",overflow:"hidden"}}>
                {item.photo
                  ? <img src={item.photo} alt={item.nom} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:72}}>{item.emoji}</div>
                }
                <span style={{position:"absolute",top:10,left:10,background:"rgba(6,13,31,0.88)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700,color:CYAN}}>{item.etat}</span>
                <span style={{position:"absolute",top:10,right:10,background:`linear-gradient(135deg,${BLU},${BLU2})`,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,color:"#fff"}}>{item.taille}</span>
              </div>
              <div style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{fontWeight:700,fontSize:16}}>{item.nom}</p>
                  <p style={{fontSize:12,color:"#8892B0",marginTop:2}}>Taille {item.taille} · {item.etat}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{color:CYAN,fontWeight:700,fontSize:22}}>{fmt(item.prix)} F</p>
                  <p style={{fontSize:10,color:"#8892B0"}}>FCFA</p>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── GÉNÉRATION FACTURE WHATSAPP ──────────────────────────
function buildFacture(c, tarifs) {
  const tarif  = tarifs.find(t=>t.id===c.tarifId)||{label:"Service",prix:c.tarif};
  const pmt    = PAIEMENTS.find(p=>p.id===c.paiement)||{label:c.paiement||"—"};
  const frais  = c.livraison ? LIVRAISON_TARIF : 0;
  const sousT  = c.total - frais;
  const sep    = "─────────────────────";
  return [
    `🃏 *JOKER LAVERIE & SERVICE*`,
    `📍 Lomé, Togo`,
    ``,
    `🧾 *FACTURE / REÇU*`,
    sep,
    `🎫 N° : *${c.id}*`,
    `📅 Date : ${c.date}`,
    `👤 Client : *${c.client}*`,
    c.tel ? `📞 Tél : ${c.tel}` : null,
    sep,
    ``,
    `📋 *DÉTAIL*`,
    `Service : ${tarif.label}`,
    `Poids : ${c.poids} kg${c.poidsStatut==="estimated"?" (estimé)":""}`,
    `Tarif : ${fmt(c.tarif)} FCFA/kg`,
    `Sous-total : ${fmt(sousT)} FCFA`,
    c.livraison ? `Livraison 🛵 : +${fmt(frais)} FCFA` : null,
    ``,
    sep,
    `💰 *TOTAL : ${fmt(c.total)} FCFA*`,
    `💳 Paiement : ${pmt.label}`,
    `✅ Statut : ${c.paiementConfirme?"Payé ✅":"En attente"}`,
    sep,
    ``,
    `🏅 Points gagnés : +${c.points} pts`,
    ``,
    `_Merci de votre confiance !_`,
    `_JOKER Laverie — Propreté · Qualité · Fiabilité_`,
  ].filter(l=>l!==null).join("\n");
}

// ─── HISTORIQUE FACTURES ──────────────────────────────────
function HistoriqueFactures({ commandes, tarifs }) {
  const [search,   setSearch]   = useState("");
  const [period,   setPeriod]   = useState("all");
  const [selected, setSelected] = useState(null);
  const [sent,     setSent]     = useState({});

  // Filtrer
  const today = todayStr();
  const filtered = commandes
    .filter(c => {
      if (period==="today") return c.date===today;
      return true;
    })
    .filter(c =>
      c.client.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
    )
    .slice() // copie
    .reverse(); // plus récent en premier

  function envoyerWA(c) {
    if (!c.tel) return;
    sendWhatsApp(c.tel, buildFacture(c, tarifs));
    setSent(p=>({...p,[c.id]:true}));
    setTimeout(()=>setSent(p=>({...p,[c.id]:false})),3000);
  }

  const sel = commandes.find(c=>c.id===selected);

  return (
    <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:6}}>🧾 Factures</h2>
      <p style={{color:"#8892B0",fontSize:13,marginBottom:14}}>Retrouvez et envoyez vos factures par WhatsApp.</p>

      {/* Filtres */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[{id:"all",l:"Toutes"},{id:"today",l:"Aujourd'hui"}].map(p=>(
          <button key={p.id} onClick={()=>setPeriod(p.id)} style={{flex:1,background:period===p.id?`linear-gradient(135deg,${BLU},${BLU2})`:CARD,border:`1px solid ${period===p.id?BLU2:BDR}`,borderRadius:12,padding:"10px",color:period===p.id?"#fff":"#8892B0",fontWeight:700,fontSize:13,cursor:"pointer"}}>{p.l}</button>
        ))}
      </div>

      {/* Recherche */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Nom ou N° ticket…"
        style={{width:"100%",background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:"13px 15px",color:"#F8FAFF",fontSize:14,outline:"none",marginBottom:14}} />

      <p style={{fontSize:11,color:"#8892B0",marginBottom:10}}>{filtered.length} facture(s)</p>

      {/* Liste */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {filtered.length===0&&<div style={{background:CARD,borderRadius:14,padding:24,textAlign:"center",border:`1px solid ${BDR}`}}><p style={{fontSize:32,marginBottom:8}}>🧾</p><p style={{color:"#8892B0",fontSize:14}}>Aucune facture trouvée.</p></div>}
        {filtered.map(c=>(
          <div key={c.id}>
            {/* Ligne facture */}
            <div onClick={()=>setSelected(selected===c.id?null:c.id)} style={{background:selected===c.id?"#0D1F6E":CARD,borderRadius:selected===c.id?"18px 18px 0 0":18,padding:"14px 16px",border:`1px solid ${selected===c.id?BLU2:BDR}`,cursor:"pointer",transition:"all 0.2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{fontWeight:700,fontSize:14}}>{c.client}</p>
                  <p style={{fontSize:12,color:"#8892B0"}}>{c.id} · {c.date}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{color:CYAN,fontWeight:700,fontSize:15}}>{fmt(c.total)} F</p>
                  <span style={{background:c.paiementConfirme?"#0D3B2E":"#3B2E0D",color:c.paiementConfirme?CYAN:"#FFB800",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>
                    {c.paiementConfirme?"✅ Payé":"⏳ En attente"}
                  </span>
                </div>
              </div>
            </div>

            {/* Détail facture dépliée */}
            {selected===c.id&&sel&&(
              <div style={{background:"#0A1628",borderRadius:"0 0 18px 18px",padding:16,border:`1px solid ${BLU2}`,borderTop:"none",animation:"fadeIn 0.25s ease"}}>
                {/* Aperçu facture */}
                <div style={{background:DARK,borderRadius:14,padding:16,marginBottom:14,border:`1px solid ${BDR}`,fontFamily:"monospace"}}>
                  <p style={{textAlign:"center",fontWeight:900,fontSize:16,marginBottom:2}}>JOKER LAVERIE & SERVICE</p>
                  <p style={{textAlign:"center",color:"#8892B0",fontSize:11,marginBottom:12}}>Lomé, Togo</p>
                  {[
                    ["N° Ticket",sel.id],
                    ["Date",     sel.date],
                    ["Client",   sel.client],
                    ["Téléphone",sel.tel||"—"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <span style={{color:"#8892B0",fontSize:12}}>{k}</span>
                      <span style={{fontWeight:700,fontSize:12}}>{v}</span>
                    </div>
                  ))}
                  <div style={{height:1,background:"rgba(255,255,255,0.1)",margin:"10px 0"}} />
                  {[
                    ["Service",   (tarifs.find(t=>t.id===sel.tarifId)||{label:"—"}).label],
                    ["Poids",     sel.poids+"kg"],
                    ["Sous-total",fmt(sel.total-(sel.livraison?LIVRAISON_TARIF:0))+" FCFA"],
                    sel.livraison?["Livraison 🛵","+"+fmt(LIVRAISON_TARIF)+" FCFA"]:null,
                  ].filter(Boolean).map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <span style={{color:"#8892B0",fontSize:12}}>{k}</span>
                      <span style={{fontSize:12}}>{v}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",marginTop:4}}>
                    <span style={{fontWeight:900,fontSize:15}}>TOTAL</span>
                    <span style={{fontWeight:900,fontSize:18,color:CYAN}}>{fmt(sel.total)} FCFA</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
                    <span style={{color:"#8892B0",fontSize:12}}>Paiement</span>
                    <span style={{fontSize:12,fontWeight:700}}>{(PAIEMENTS.find(p=>p.id===sel.paiement)||{label:sel.paiement||"—"}).label}</span>
                  </div>
                  <div style={{textAlign:"center",marginTop:12,paddingTop:10,borderTop:"1px dashed rgba(255,255,255,0.1)"}}>
                    <p style={{color:BLU2,fontSize:12,fontWeight:700}}>Merci de votre confiance ! 🙏</p>
                    <p style={{color:"#8892B050",fontSize:10,marginTop:4}}>🏅 +{sel.points} points fidélité</p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {sel.tel ? (
                    <button onClick={()=>envoyerWA(sel)} style={{width:"100%",background:sent[sel.id]?"#0D3B2E":"linear-gradient(135deg,#0D3B1A,#006b2b)",border:`1px solid ${sent[sel.id]?CYAN+"40":"#25D36640"}`,borderRadius:14,padding:14,color:sent[sel.id]?CYAN:"#25D366",fontWeight:700,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      {sent[sel.id]?"✅ Facture envoyée !":"💬 Envoyer par WhatsApp"}
                    </button>
                  ):(
                    <div style={{background:"#1A2240",borderRadius:14,padding:12,border:`1px solid ${BDR}`,textAlign:"center"}}>
                      <p style={{color:"#FFB800",fontSize:13}}>⚠️ Pas de numéro WhatsApp pour ce client</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── BASE DE DONNÉES CLIENTS ──────────────────────────────
function ClientsDB({ commandes }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const BLU="#1A3EBD", BLU2="#4A7BF7", CYAN="#00C2FF", CARD="#0D1F6E22", BDR="#1A3EBD44", DARK="#060D1F";

  // Build client list from commandes
  const clientMap = {};
  commandes.forEach(c => {
    const key = c.tel || c.client;
    if (!clientMap[key]) {
      clientMap[key] = {
        nom: c.client,
        tel: c.tel || "—",
        commandes: [],
        totalDepense: 0,
        points: 0,
      };
    }
    clientMap[key].commandes.push(c);
    if (c.paiementConfirme) clientMap[key].totalDepense += (c.total || 0);
    clientMap[key].points = Math.max(clientMap[key].points, c.points || 0);
  });

  const clients = Object.values(clientMap).sort((a,b) => b.totalDepense - a.totalDepense);
  const filtered = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.tel.includes(search)
  );

  function getLevel(pts) {
    if (pts >= 600) return { label:"Platinum", color:"#E0E0FF" };
    if (pts >= 300) return { label:"Gold",     color:"#FFD700" };
    if (pts >= 100) return { label:"Silver",   color:"#C0C0C0" };
    return { label:"Bronze", color:"#CD7F32" };
  }

  if (selected) {
    const lvl = getLevel(selected.points);
    return (
      <div style={{padding:"0 0 80px"}}>
        <div style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${BDR}`}}>
          <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",fontSize:22}}>←</button>
          <div>
            <p style={{fontWeight:700,fontSize:17,color:"#F8FAFF"}}>{selected.nom}</p>
            <p style={{fontSize:12,color:"#8892B0"}}>{selected.tel}</p>
          </div>
          <span style={{marginLeft:"auto",background:lvl.color+"33",color:lvl.color,borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:700}}>{lvl.label}</span>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"16px 20px"}}>
          {[
            {l:"Commandes",  v:selected.commandes.length,         c:BLU2},
            {l:"Total dépensé", v:selected.totalDepense.toLocaleString("fr-FR")+" F", c:CYAN},
            {l:"Points",     v:selected.points,                   c:"#FFD700"},
          ].map(s=>(
            <div key={s.l} style={{background:CARD,borderRadius:14,padding:12,border:`1px solid ${BDR}`,textAlign:"center"}}>
              <p style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</p>
              <p style={{fontSize:10,color:"#8892B0",marginTop:4}}>{s.l}</p>
            </div>
          ))}
        </div>

        <div style={{padding:"0 20px"}}>
          <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,marginBottom:10,color:"#F8FAFF"}}>Historique des commandes</p>
          {selected.commandes.slice().reverse().map(c=>(
            <div key={c.id} style={{background:CARD,borderRadius:14,padding:"12px 16px",marginBottom:10,border:`1px solid ${BDR}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontWeight:700,color:BLU2,fontSize:13}}>{c.id}</span>
                <span style={{fontSize:12,color:"#8892B0"}}>{c.date}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:c.statut==="Récupéré"?"#4ADE80":c.statut==="Prêt"?CYAN:"#8892B0"}}>{c.statut}</span>
                <span style={{fontSize:15,fontWeight:700,color:"#F8FAFF"}}>{(c.total||0).toLocaleString("fr-FR")} F</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"20px 20px 80px",animation:"fadeIn 0.4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>Clients ({clients.length})</h2>

      <div style={{position:"relative",marginBottom:16}}>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="Rechercher par nom ou téléphone…"
          style={{width:"100%",background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:"12px 16px",color:"#F8FAFF",fontSize:14,outline:"none"}}
        />
      </div>

      {filtered.length===0&&(
        <p style={{color:"#8892B0",textAlign:"center",marginTop:40}}>
          {clients.length===0 ? "Aucun client pour l'instant. Les clients apparaîtront automatiquement après leurs commandes." : "Aucun résultat."}
        </p>
      )}

      {filtered.map(c=>{
        const lvl = getLevel(c.points);
        const derniere = c.commandes[c.commandes.length-1];
        return (
          <button key={c.tel+c.nom} onClick={()=>setSelected(c)} style={{width:"100%",background:CARD,border:`1px solid ${BDR}`,borderRadius:16,padding:"14px 16px",marginBottom:10,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${BLU}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>👤</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{fontWeight:700,color:"#F8FAFF",fontSize:15}}>{c.nom}</p>
                <span style={{fontSize:10,color:lvl.color,fontWeight:700,background:lvl.color+"22",borderRadius:99,padding:"2px 8px"}}>{lvl.label}</span>
              </div>
              <p style={{fontSize:12,color:"#8892B0",marginTop:2}}>{c.tel}</p>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span style={{fontSize:12,color:CYAN}}>{c.commandes.length} commande{c.commandes.length>1?"s":""}</span>
                <span style={{fontSize:12,color:"#FFD700"}}>{c.totalDepense.toLocaleString("fr-FR")} F</span>
              </div>
            </div>
            <span style={{color:"#8892B0",fontSize:20}}>›</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── GÉRANT DASHBOARD ─────────────────────────────────────
function GerantDashboard({ commandes,setCommandes,friperie,setFriperie,tarifs,setTarifs,rewards,setRewards,livreurs,setLivreurs,gerantPin,setGerantPin,adminPw,setAdminPw,clients,setClients,onLogout }){
  const [tab,setTab]=useState("home");
  const [payCmd,setPayCmd]=useState(null);

  const enAttente=commandes.filter(c=>c.livraison&&c.livraisonStatut==="pending").length;
  const aConfirmer=commandes.filter(c=>c.poidsStatut==="estimated").length;
  const alerts=enAttente+aConfirmer;
  const ca=commandes.reduce((s,c)=>s+c.total,0);

  function nextStatut(id){setCommandes(p=>p.map(c=>{if(c.id!==id)return c;const m={"En cours":"Prêt","Prêt":"Récupéré"};return{...c,statut:m[c.statut]||c.statut};}));}
  function confirmPoids(id,newP){setCommandes(p=>p.map(c=>{if(c.id!==id)return c;const t=calcTotal(newP,c.tarif,c.livraison);return{...c,poids:newP,total:t,points:Math.floor(t/100),poidsStatut:"confirmed"};}));}
  function validerLiv(id){setCommandes(p=>p.map(c=>c.id===id?{...c,livraisonStatut:"confirmed"}:c));}
  function refuserLiv(id){setCommandes(p=>p.map(c=>c.id===id?{...c,livraison:null,livraisonStatut:null}:c));}
  function notifyReady(c){if(c.tel)sendWhatsApp(c.tel,`🃏 *JOKER Laverie*\n\n🎉 Votre linge est prêt !\n\n🎫 ${c.id}\n👤 ${c.client}\n\nLomé, Togo 🙏`);}
  function confirmerPaiement(id,mode){setCommandes(p=>p.map(c=>c.id===id?{...c,paiement:mode,paiementConfirme:true}:c));setPayCmd(null);}

  const tabs=[
    {id:"home",      icon:"🏠",label:"Accueil"},
    {id:"commandes", icon:"📋",label:"Commandes"},
    {id:"livraisons",icon:"🛵",label:"Livreurs"},
    {id:"caisse",    icon:"💰",label:"Caisse"},
    {id:"plus",      icon:"⚙️",label:"Plus"},
  ];

  return (
    <div style={{paddingBottom:84}}>
      {payCmd&&<PayModal c={payCmd} onClose={()=>setPayCmd(null)} onConfirm={(m)=>confirmerPaiement(payCmd.id,m)} />}
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(6,13,31,0.97)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${BDR}`,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <Logo size={30} />
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:BLU2}}>GÉRANT</span>
        <button onClick={onLogout} style={{background:"none",border:"none",color:"#FF6B6B",cursor:"pointer",fontSize:12,fontWeight:700}}>🚪 Quitter</button>
      </div>

      {tab==="home"&&(
        <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <Logo size={80} style={{margin:"0 auto 12px"}} />
            <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3}}>JOKER LAVERIE & SERVICE</h1>
            <p style={{color:BLU2,fontSize:11,letterSpacing:2}}>PROPRETÉ · QUALITÉ · FIABILITÉ · Lomé</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            {[{l:"CA total",v:fmt(ca)+" F",i:"💰",c:CYAN},{l:"Commandes",v:commandes.length,i:"🧺",c:BLU2},{l:"Livreurs actifs",v:livreurs.filter(l=>l.actif).length,i:"🛵",c:"#A855F7"},{l:"Alertes",v:alerts,i:"🔔",c:"#FFB800"}].map(s=>(
              <div key={s.l} style={{background:`linear-gradient(135deg,#0D1F6E22,#1A3EBD11)`,borderRadius:18,padding:16,border:`1px solid ${s.c}30`}}>
                <div style={{fontSize:22,marginBottom:6}}>{s.i}</div>
                <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:s.c}}>{s.v}</p>
                <p style={{fontSize:11,color:"#8892B0",marginTop:2}}>{s.l}</p>
              </div>
            ))}
          </div>
          {alerts>0&&<div style={{background:"#1A0D3D",borderRadius:14,padding:"12px 16px",border:"1px solid #A855F750",display:"flex",gap:8,alignItems:"center",marginBottom:14}}><span>⚡</span><p style={{color:"#A855F7",fontWeight:700,fontSize:13}}>{aConfirmer>0?`${aConfirmer} poids à confirmer · `:""}{enAttente>0?`${enAttente} livraison(s) en attente`:""}</p></div>}
          <button onClick={()=>setTab("nouvelle")} style={{width:"100%",background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:16,padding:18,color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:`0 8px 24px rgba(26,62,189,0.4)`,marginBottom:14}}>➕ Nouvelle commande</button>
          <STitle text="Récentes" />
          {commandes.slice(0,3).map(c=>(
            <div key={c.id} style={{background:CARD,borderRadius:16,padding:"14px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${BDR}`}}>
              <div><p style={{fontWeight:700,fontSize:14}}>{c.client}</p><p style={{fontSize:12,color:"#8892B0"}}>{c.id} · {c.poids}kg</p></div>
              <div style={{textAlign:"right"}}><Badge statut={c.statut} /><p style={{fontSize:13,color:CYAN,fontWeight:700,marginTop:6}}>{fmt(c.total)} F</p></div>
            </div>
          ))}
        </div>
      )}

      {tab==="nouvelle"&&<NouvelleCommande commandes={commandes} setCommandes={setCommandes} tarifs={tarifs} onBack={()=>setTab("home")} onDone={()=>setTab("commandes")} />}

      {tab==="commandes"&&(
        <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
          <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>Commandes</h2>
          {commandes.length===0&&<p style={{color:"#8892B0"}}>Aucune commande.</p>}
          {commandes.map(c=>(
            <CmdCard key={c.id} c={c} onNext={()=>nextStatut(c.id)} onConfirmPoids={confirmPoids} onValLiv={()=>validerLiv(c.id)} onRefLiv={()=>refuserLiv(c.id)} onNotify={()=>notifyReady(c)} onPay={()=>setPayCmd(c)} hasTel={!!c.tel} />
          ))}
        </div>
      )}

      {tab==="livraisons"&&<GestionLivreurs livreurs={livreurs} setLivreurs={setLivreurs} commandes={commandes} setCommandes={setCommandes} />}

      {tab==="caisse"&&<Caisse commandes={commandes} tarifs={tarifs} />}

      {tab==="plus"&&(
        <div style={{padding:"20px 20px 0",animation:"fadeIn 0.4s ease"}}>
          <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,marginBottom:14}}>Plus</h2>
          {[
            {id:"clients",   icon:"👥", label:"Base clients",           sub:"Historique et fiche par client"},
            {id:"tarifs",    icon:"💲", label:"Gérer les tarifs",      sub:"Modifier les prix et services"},
            {id:"fidelite",  icon:"🏅", label:"Programme fidélité",    sub:"Gérer les points clients"},
            {id:"recompenses",icon:"🎁",label:"Récompenses",           sub:"Modifier les récompenses"},
            {id:"friperie",  icon:"👗", label:"Friperie",              sub:"Gérer les articles"},
            {id:"factures",  icon:"🧾", label:"Factures",             sub:"Historique et envoi WhatsApp"},
            {id:"reglages",  icon:"⚙️", label:"Réglages & Sécurité",  sub:"PIN, mots de passe, mobile money"},
          ].map(m=>(
            <button key={m.id} onClick={()=>setTab(m.id)} style={{width:"100%",background:CARD,border:`1px solid ${BDR}`,borderRadius:16,padding:"16px",marginBottom:10,display:"flex",alignItems:"center",gap:14,cursor:"pointer",textAlign:"left"}}>
              <div style={{width:46,height:46,borderRadius:12,background:`${BLU}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{m.icon}</div>
              <div><p style={{fontWeight:700,fontSize:15,color:"#F8FAFF"}}>{m.label}</p><p style={{fontSize:12,color:"#8892B0",marginTop:2}}>{m.sub}</p></div>
              <span style={{color:"#8892B0",marginLeft:"auto",fontSize:18}}>›</span>
            </button>
          ))}
        </div>
      )}

      {tab==="tarifs"&&(
        <div><button onClick={()=>setTab("plus")} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",padding:"16px 20px",fontSize:14}}>← Retour</button><GestionTarifs tarifs={tarifs} setTarifs={setTarifs} /></div>
      )}
      {tab==="fidelite"&&(
        <div><button onClick={()=>setTab("plus")} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",padding:"16px 20px",fontSize:14}}>← Retour</button><Fidelite clients={clients} setClients={setClients} rewards={rewards} /></div>
      )}
      {tab==="recompenses"&&(
        <div><button onClick={()=>setTab("plus")} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",padding:"16px 20px",fontSize:14}}>← Retour</button><GestionRecompenses rewards={rewards} setRewards={setRewards} /></div>
      )}
      {tab==="friperie"&&(
        <div><button onClick={()=>setTab("plus")} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",padding:"16px 20px",fontSize:14}}>← Retour</button><Friperie friperie={friperie} setFriperie={setFriperie} /></div>
      )}
      {tab==="factures"&&(
        <div><button onClick={()=>setTab("plus")} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",padding:"16px 20px",fontSize:14}}>← Retour</button><HistoriqueFactures commandes={commandes} tarifs={tarifs} /></div>
      )}
      {tab==="clients"&&(
        <div><button onClick={()=>setTab("plus")} style={{background:"none",border:"none",color:"#4A7BF7",cursor:"pointer",padding:"16px 20px",fontSize:13,display:"flex",alignItems:"center",gap:8}}><span>←</span> Retour</button><ClientsDB commandes={commandes} /></div>
      )}
      {tab==="reglages"&&(
        <div><button onClick={()=>setTab("plus")} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",padding:"16px 20px",fontSize:14}}>← Retour</button><Reglages gerantPin={gerantPin} setGerantPin={setGerantPin} adminPw={adminPw} setAdminPw={setAdminPw} /></div>
      )}

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:"rgba(6,13,31,0.97)",backdropFilter:"blur(20px)",borderTop:`1px solid ${BDR}`,display:"flex",justifyContent:"space-around",padding:"10px 0 18px",zIndex:100}}>
        {tabs.map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:tab===tb.id?BLU2:"#8892B0",position:"relative"}}>
            <span style={{fontSize:18}}>{tb.icon}</span>
            <span style={{fontSize:9,fontWeight:600}}>{tb.label}</span>
            {tb.id==="livraisons"&&alerts>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#A855F7",color:"#fff",borderRadius:99,fontSize:9,fontWeight:700,padding:"1px 5px"}}>{alerts}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}


// ─── ÉCRAN CONNEXION ──────────────────────────────────────
function LoginScreen() {
  const [email,   setEmail]   = useState("");
  const [pw,      setPw]      = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [vis,     setVis]     = useState(false);

  async function login() {
    if(!email||!pw) return;
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch(err) {
      const m = {
        "auth/invalid-credential":    "Email ou mot de passe incorrect.",
        "auth/user-not-found":        "Aucun compte avec cet email.",
        "auth/wrong-password":        "Mot de passe incorrect.",
        "auth/invalid-email":         "Email invalide.",
        "auth/too-many-requests":     "Trop de tentatives. Réessaie plus tard.",
        "auth/network-request-failed":"Pas de connexion internet.",
      };
      setError(m[err.code]||"Erreur de connexion.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,background:DARK}}>
      <div style={{width:"100%",maxWidth:380,animation:"fadeIn 0.5s ease"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <Logo size={90} style={{margin:"0 auto 16px"}} />
          <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:4}}>JOKER</h1>
          <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:BLU2,letterSpacing:3}}>LAVERIE & SERVICE</p>
          <p style={{color:"#8892B0",fontSize:12,marginTop:6}}>Lomé, Togo</p>
        </div>

        <div style={{background:CARD,borderRadius:24,padding:24,border:`1px solid ${BDR}`}}>
          <p style={{fontWeight:700,fontSize:16,marginBottom:20,textAlign:"center"}}>Connexion</p>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Email</label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&login()} placeholder="votre@email.com"
              style={{width:"100%",background:DARK,border:`1px solid ${error?"#FF4444":email?BLU2:BDR}`,borderRadius:14,padding:"14px 16px",color:"#F8FAFF",fontSize:15,outline:"none"}} />
          </div>

          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,color:"#8892B0",letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Mot de passe</label>
            <div style={{position:"relative"}}>
              <input type={vis?"text":"password"} value={pw} onChange={e=>{setPw(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&login()} placeholder="••••••••"
                style={{width:"100%",background:DARK,border:`1px solid ${error?"#FF4444":pw?BLU2:BDR}`,borderRadius:14,padding:"14px 48px 14px 16px",color:"#F8FAFF",fontSize:15,outline:"none"}} />
              <button onClick={()=>setVis(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#8892B0"}}>{vis?"🙈":"👁️"}</button>
            </div>
          </div>

          {error&&<div style={{background:"#3B0D0D",borderRadius:12,padding:"10px 14px",marginBottom:14,border:"1px solid #FF444440"}}><p style={{color:"#FF6B6B",fontSize:13,fontWeight:600}}>❌ {error}</p></div>}

          <button onClick={login} disabled={loading||!email||!pw} style={{width:"100%",background:email&&pw?`linear-gradient(135deg,${BLU},${BLU2})`:DARK,border:"none",borderRadius:16,padding:16,color:email&&pw?"#fff":"#8892B0",fontWeight:700,fontSize:16,cursor:email&&pw?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:email&&pw?`0 8px 24px rgba(26,62,189,0.4)`:"none"}}>
            {loading?"⏳ Connexion…":"🔐 Se connecter"}
          </button>
        </div>

        <div style={{marginTop:16,background:`${BLU}15`,borderRadius:14,padding:"12px 16px",border:`1px solid ${BLU2}20`}}>
          <p style={{color:BLU2,fontSize:12,fontWeight:600,marginBottom:4}}>🛡️ Accès sécurisé</p>
          <p style={{color:"#8892B0",fontSize:11,lineHeight:1.5}}>Seuls les comptes autorisés par le gérant peuvent accéder à l'application.</p>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────
export default function App(){
  // ── Auth Firebase ──────────────────────────────────────
  const [user,      setUser]      = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u=>{ setUser(u); setAuthReady(true); });
    return ()=>unsub();
  },[]);

  async function handleLogout(){
    await signOut(auth);
    setUser(null); setScreen("landing"); setGerantAuth(false);
  }

  // ── Firestore collections ──────────────────────────────
  const [commandes, upsertCmd,     removeCmd,  cmdReady]   = useFireCollection("commandes",  COMMANDES_INIT);
  const [clients,   upsertClient,  ,           cliReady]   = useFireCollection("clients",    []);
  const [friperie,  upsertFrip,    removeFrip, fripReady]  = useFireCollection("friperie",   FRIPERIE_INIT);
  const [livreurs,  upsertLivreur, ,           livReady]   = useFireCollection("livreurs",   LIVREURS_INIT);

  // ── Firestore docs (config) ────────────────────────────
  const [tarifs,    saveTarifs,    tarifReady]  = useFireDoc("config","tarifs",    TARIFS_INIT);
  const [rewards,   saveRewards,   rewardReady] = useFireDoc("config","rewards",   REWARDS_INIT);
  const [gerantPin, savePin,       pinReady]    = useFireDoc("config","pin",       "1234");
  const [adminPw,   saveAdminPw,   pwReady]     = useFireDoc("config","adminpw",   "joker2026");

  const allReady = cmdReady&&cliReady&&fripReady&&livReady&&tarifReady&&rewardReady&&pinReady&&pwReady;

  // ── Setters synchronisés Firestore ────────────────────
  function setCommandes(fn){
    const next = typeof fn==="function"?fn(commandes):fn;
    next.forEach(c=>upsertCmd(c));
    commandes.forEach(c=>{ if(!next.find(u=>u.id===c.id)) removeCmd(c.id); });
  }
  function setClients(fn){
    const next=typeof fn==="function"?fn(clients):fn;
    next.forEach(c=>upsertClient({...c,id:c.id||String(Date.now())}));
  }
  function setFriperie(fn){
    const next=typeof fn==="function"?fn(friperie):fn;
    next.forEach(f=>upsertFrip({...f,id:String(f.id)}));
    friperie.forEach(f=>{ if(!next.find(u=>String(u.id)===String(f.id))) removeFrip(String(f.id)); });
  }
  function setLivreurs(fn){
    const next=typeof fn==="function"?fn(livreurs):fn;
    next.forEach(l=>upsertLivreur({...l,id:l.id||String(Date.now())}));
  }
  function setTarifs(fn){  saveTarifs(typeof fn==="function"?fn(tarifs):fn); }
  function setRewards(fn){ saveRewards(typeof fn==="function"?fn(rewards):fn); }
  function setGerantPin(v){ savePin(v); }
  function setAdminPw(v){   saveAdminPw(v); }

  const [screen,    setScreen]    = useState("landing");
  const [gerantAuth,setGerantAuth]= useState(false);

  return (
    <div style={{minHeight:"100vh",background:DARK,fontFamily:"'DM Sans',sans-serif",color:"#F8FAFF",maxWidth:420,margin:"0 auto"}}>
      {/* Auth pas encore vérifiée */}
      {!authReady&&(
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <Logo size={80} style={{margin:"0 auto"}} />
          <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,color:BLU2}}>JOKER LAVERIE</p>
          <p style={{color:"#8892B0",fontSize:13}}>Vérification…</p>
          <div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:BLU2,animation:`pulse 1.2s ease ${i*0.2}s infinite`}} />)}</div>
        </div>
      )}

      {/* Non connecté → login gérant seulement */}
      {authReady&&!user&&screen==="gerant"&&<LoginScreen />}

      {/* Connecté mais données en cours de chargement */}
      {authReady&&user&&!allReady&&(
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <Logo size={80} style={{margin:"0 auto"}} />
          <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,color:BLU2}}>JOKER LAVERIE</p>
          <p style={{color:"#8892B0",fontSize:13}}>Chargement…</p>
          <div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:BLU2,animation:`pulse 1.2s ease ${i*0.2}s infinite`}} />)}</div>
        </div>
      )}

      {/* Connecté + données prêtes */}
      {authReady&&(user&&allReady||!user)&&(
      <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{display:none;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        input,button,select{font-family:'DM Sans',sans-serif;}
      `}</style>
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 20% 20%,#1A3EBD18 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,#0D1F6E22 0%,transparent 50%)",pointerEvents:"none",zIndex:0}} />
      <div style={{position:"relative",zIndex:1}}>

        {screen==="landing"&&(
          <div style={{padding:"64px 24px",textAlign:"center",animation:"fadeIn 0.5s ease"}}>
            <Logo size={120} style={{margin:"0 auto 20px"}} />
            <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:36,letterSpacing:4}}>JOKER</h1>
            <p style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:BLU2,letterSpacing:3}}>LAVERIE & SERVICE</p>
            <p style={{color:"#8892B0",fontSize:12,letterSpacing:2,marginTop:6,marginBottom:6}}>PROPRETÉ · QUALITÉ · FIABILITÉ</p>
            <p style={{color:`${BLU2}60`,fontSize:12,marginBottom:44}}>Lomé, Togo</p>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <button onClick={()=>setScreen("gerant-pin")} style={{background:`linear-gradient(135deg,${BLU},${BLU2})`,border:"none",borderRadius:20,padding:"20px",color:"#fff",fontWeight:700,fontSize:17,cursor:"pointer",boxShadow:"0 8px 32px rgba(26,62,189,0.5)"}}>👨‍💼 Espace Gérant</button>
              <button onClick={()=>setScreen("client")} style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:20,padding:"20px",color:"#F8FAFF",fontWeight:700,fontSize:17,cursor:"pointer"}}>👤 Espace Client</button>
            </div>
            <p style={{color:`${BLU2}50`,fontSize:11,marginTop:28}}>Flooz · T-Money · Espèces · 🛵 Livraison</p>
          </div>
        )}

        {screen==="gerant-pin"&&(
          <div>
            <button onClick={()=>setScreen("landing")} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",padding:"16px 20px",fontSize:13}}>← Retour</button>
            <PinScreen onSuccess={()=>{setGerantAuth(true);setScreen("gerant");}} correctPin={gerantPin} />
          </div>
        )}

        {screen==="gerant"&&gerantAuth&&(
          <GerantDashboard
            commandes={commandes}   setCommandes={setCommandes}
            clients={clients}       setClients={setClients}
            friperie={friperie}     setFriperie={setFriperie}
            tarifs={tarifs}         setTarifs={setTarifs}
            rewards={rewards}       setRewards={setRewards}
            livreurs={livreurs}     setLivreurs={setLivreurs}
            gerantPin={gerantPin}   setGerantPin={setGerantPin}
            adminPw={adminPw}       setAdminPw={setAdminPw}
            onLogout={handleLogout}
          />
        )}

        {screen==="client"&&(
          <div>
            <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(6,13,31,0.97)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${BDR}`,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <button onClick={()=>setScreen("landing")} style={{background:"none",border:"none",color:BLU2,cursor:"pointer",fontSize:13}}>← Accueil</button>
              <Logo size={30} />
              <span style={{fontSize:12,fontWeight:700,color:CYAN}}>CLIENT</span>
            </div>
            <ClientSpace commandes={commandes} setCommandes={setCommandes} friperie={friperie} rewards={rewards} />
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
