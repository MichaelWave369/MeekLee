import React,{useState} from "react";
import {gardenInventory} from "./collection.js";
import {VILLAGE_DISTRICTS,VILLAGE_PLOTS,villagePlotId} from "./village.js";
import "./village.css";

const WORLD_PORTALS=Object.freeze([
  {id:"harvest",icon:"🌻",name:"Harvest Valley"},
  {id:"sweets",icon:"🍬",name:"Sugar Mountain"},
  {id:"rescue",icon:"🐾",name:"Critter Rescue"},
  {id:"bubbles",icon:"🫧",name:"Bubble Lagoon"},
  {id:"meadow",icon:"🌷",name:"Flower Meadow"},
  {id:"pumpkin",icon:"🎃",name:"Pumpkin Patch"},
  {id:"moonlight",icon:"🌙",name:"Moonlight Orchard"},
  {id:"kitchen",icon:"🥣",name:"Grandma's Kitchen"}
]);

export default function GardenVillage({
  collection,settings,onPlace,onStore,onBack,onVisitWorld,onVisitPorch
}){
  const [districtId,setDistrictId]=useState("square");
  const [chosenId,setChosenId]=useState(null);
  const [notice,setNotice]=useState(
    "Choose an earned decoration below, then tap an empty village plot to place it.");
  const district=VILLAGE_DISTRICTS.find(d=>d.id===districtId)||VILLAGE_DISTRICTS[0];
  const {decor,pets}=gardenInventory(collection);
  const hidden=new Set(collection.hiddenDecorations||[]);
  const visible=decor.filter(item=>!hidden.has(item.id));
  const byId=new Map(decor.map(item=>[item.id,item]));
  const placements=collection.villagePlacements||{};
  const selected=chosenId?byId.get(chosenId):null;
  const placedCount=Object.keys(placements).length;
  const occupied=new Map(Object.entries(placements).map(([id,spot])=>[spot,id]));
  const companion=pets.find(p=>p.id===collection.companion);

  function chooseDecoration(id){
    if(!byId.has(id))return;
    if(chosenId===id){
      setChosenId(null);setNotice("Selection cleared. All your treasures are safe.");return;
    }
    setChosenId(id);
    const item=byId.get(id);
    setNotice(hidden.has(id)?
      item.name+" is put away in your original garden. Store its village location, or plant it again in the Garden first.":
      "Moving "+item.name+". Tap an empty plot in any neighborhood.");
  }
  function choosePlot(index){
    const plot=villagePlotId(district.id,index);
    const existing=occupied.get(plot);
    if(existing){
      chooseDecoration(existing);
      return;
    }
    if(!selected){
      setNotice("Choose an earned decoration below first. Empty plots cost nothing.");return;
    }
    if(hidden.has(selected.id)){
      setNotice("Plant "+selected.name+" again in your Garden before moving it into the Village.");return;
    }
    onPlace(selected.id,plot);
    setNotice(selected.name+" now lives at "+district.name+", plot "+(index+1)+".");
  }
  function storeSelected(){
    if(!selected||!placements[selected.id])return;
    onStore(selected.id);
    setNotice(selected.name+" returned to the village collection. You still own it.");
  }

  return <section className="garden-village" aria-label="Garden Village">
    <header className="garden-village-heading">
      <button type="button" className="trail-back" onClick={onBack}>‹ Back to My Garden</button>
      <div><p className="trail-eyebrow">🏡 A home for every earned treasure</p>
        <h2>Mom's Garden Village</h2></div>
    </header>
    <p className="garden-village-intro">Create your own cozy little village! Every plot is
      free. Pick an ornament you have already earned, choose a neighborhood, and tap
      an empty spot. Move it as often as you like. Your original Garden, chests,
      companions and saved games stay just as they were.</p>
    <div className="village-counters">
      <strong>🌷 {decor.length} owned treasures</strong>
      <strong>🏡 {placedCount} placed in the village</strong>
      <strong>🪴 {visible.length} ready to plant</strong>
    </div>

    <section className="village-map-section" aria-labelledby="village-neighborhood-heading">
      <h3 id="village-neighborhood-heading">🏘️ Explore four neighborhoods</h3>
      <div className="village-district-tabs" role="group" aria-label="Choose a village neighborhood">
        {VILLAGE_DISTRICTS.map(d=><button key={d.id} type="button"
          data-village-district={d.id} aria-pressed={districtId===d.id}
          className={districtId===d.id?"selected":""}
          onClick={()=>{setDistrictId(d.id);setNotice("Welcome to "+d.name+"!");}}>
          <span aria-hidden="true">{d.icon}</span><strong>{d.name}</strong>
          <small>{Object.values(placements).filter(s=>s.startsWith(d.id+":")).length}/{VILLAGE_PLOTS} placed</small>
        </button>)}
      </div>
      <div className={"village-scene village-scene-"+district.id}>
        <div className="village-sky" aria-hidden="true">
          <span>☁️</span><span>{district.id==="pond"?"🌤️":"☀️"}</span><span>☁️</span>
        </div>
        <div className="village-landmark" role="img"
          aria-label={district.landmarkName}>
          <span aria-hidden="true">{district.landmark}</span>
          <strong>{district.name}</strong>
          <small>{district.description}</small>
        </div>
        <div className="village-plots" aria-label={district.name+" planting plots"}>
          {Array.from({length:VILLAGE_PLOTS},(_,i)=>{
            const plot=villagePlotId(district.id,i);
            const id=occupied.get(plot),item=id?byId.get(id):null;
            const stored=id&&hidden.has(id),current=chosenId===id;
            return <button type="button" key={plot} data-village-plot={plot}
              className={"village-plot"+(item?" filled":"")+
                (stored?" stored":"")+(current?" chosen":"")+
                (selected&&!item?" available":"")}
              aria-label={district.name+" plot "+(i+1)+": "+
                (item?(stored?"stored decoration":item.name)+
                  (current?", selected":", select to move"):
                  "empty"+(selected?", place "+selected.name:""))}
              aria-pressed={Boolean(current)}
              onClick={()=>choosePlot(i)}>
              <span aria-hidden="true">{!item?"＋":stored?"📦":item.icon}</span>
              <small>{item?stored?"Stored":item.name:"Plot "+(i+1)}</small>
            </button>;
          })}
        </div>
        <div className="village-companion">
          <span aria-hidden="true">{companion?.icon||"🐝"}</span>
          <small>{companion?.name||"A friendly visitor"} says hello!</small>
        </div>
      </div>
    </section>

    <section className="village-workbench" aria-labelledby="village-decoration-heading">
      <h3 id="village-decoration-heading">🪴 Choose an earned decoration</h3>
      <p>Tap a decoration below, then any <strong>empty plot</strong> above.
        Tap an occupied plot to select its decoration for moving. A different
        piece never gets removed or overwritten by accident.</p>
      {selected&&<div className="village-selection">
        <span aria-hidden="true">{selected.icon}</span>
        <div><strong>Selected: {selected.name}</strong>
          <small>{placements[selected.id]?"Placed at "+placements[selected.id].replace(":"," plot "):
            "In your village collection"}</small></div>
        {placements[selected.id]&&
          <button type="button" data-village-store onClick={storeSelected}>Return to Collection</button>}
        <button type="button" onClick={()=>setChosenId(null)}>Clear Selection</button>
      </div>}
      {visible.length? <div className="village-available" aria-label="Earned village decorations">
        {visible.map(item=><button type="button" key={item.id} data-village-item={item.id}
          className={chosenId===item.id?"selected":""}
          aria-pressed={chosenId===item.id} onClick={()=>chooseDecoration(item.id)}>
          <span aria-hidden="true">{item.icon}</span><strong>{item.name}</strong>
          <small>{placements[item.id]?"✓ Placed":"Choose to place"}</small>
        </button>)}
      </div>:<div className="village-empty">
        <span aria-hidden="true">🌱</span><strong>Every village begins with a seed!</strong>
        <p>Complete a puzzle milestone or picture puzzle to earn an ornament.
          Then come back and choose where to plant it.</p>
      </div>}
      {decor.length>visible.length&&<p className="village-stored-note">
        {decor.length-visible.length} decoration(s) are put away in your original
        Garden. Plant them there to make them available here again.</p>}
      <p className="village-message" role="status">{notice}</p>
    </section>

    <section className="village-portals" aria-labelledby="village-portal-heading">
      <h3 id="village-portal-heading">🧭 Follow the paths to your games</h3>
      <p>Every world is free to visit. The village is just a shortcut to the
        saved adventures you already know.</p>
      <div className="village-portal-grid">
        {WORLD_PORTALS.map(world=><button type="button" key={world.id}
          data-village-world={world.id}
          onClick={()=>onVisitWorld(world.id)}>
          <span aria-hidden="true">{world.icon}</span><strong>Visit {world.name}</strong>
        </button>)}
        <button type="button" data-village-porch onClick={onVisitPorch}>
          <span aria-hidden="true">📖</span><strong>Visit the Private Family Porch</strong>
        </button>
      </div>
    </section>
    <p className="village-footnote">Village layouts are saved offline on this device,
      independently from your original Garden. No accounts, paid plots, advertisements
      or automatic family-note sharing.</p>
  </section>;
}
