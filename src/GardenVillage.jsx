import React,{useState} from "react";
import {gardenInventory} from "./collection.js";
import {VILLAGE_DISTRICTS,VILLAGE_PLOTS,villagePlotId} from "./village.js";
import {VILLAGE_ACTIVITIES,villageActivityTarget,advanceVillageActivity,villageVisitingPets} from "./village-life.js";
import {normalizeVillageWander,villageWalkingParty,nextVillageWalkDistrict,
  advanceVillageWalk,currentLandmarkMoment,advanceVillageLandmark} from "./village-wander.js";
import {VILLAGE_SKIES,normalizeVillageAtmosphere,villageVisibleGlow} from "./village-atmosphere.js";
import {VILLAGE_SEASONS,VILLAGE_SEASON_DECOR,normalizeVillageSeason,
  seasonalVillageDescription} from "./village-season.js";
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
  collection,settings,onPlace,onStore,onActivity,onStroll,onLandmark,onSky,onGlow,onSeason,onBack,onVisitWorld,onVisitPorch
}){
  const [districtId,setDistrictId]=useState("square");
  const [chosenId,setChosenId]=useState(null);
  const [activityFeedback,setActivityFeedback]=useState("");
  const [visitorGreeting,setVisitorGreeting]=useState("");
  const [landmarkFeedback,setLandmarkFeedback]=useState("");
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
  const activity=VILLAGE_ACTIVITIES[district.id];
  const villageLife=collection.villageLife||{};
  const activityState=villageLife[district.id]||{rounds:0,step:0};
  const targetChoice=villageActivityTarget(villageLife,district.id);
  const visitors=villageVisitingPets(pets,collection.companion,district.id,villageLife);
  const wander=normalizeVillageWander(collection.villageWander);
  const walking=villageWalkingParty(pets,collection.companion,wander);
  const nextWalkingDistrict=nextVillageWalkDistrict(wander);
  const nextNeighborhood=VILLAGE_DISTRICTS.find(d=>d.id===nextWalkingDistrict);
  const walkingNeighborhood=VILLAGE_DISTRICTS.find(d=>d.id===walking.district);
  const landmarkMoment=currentLandmarkMoment(wander,district.id);
  const atmosphere=normalizeVillageAtmosphere(collection.villageAtmosphere);
  const glow=villageVisibleGlow(atmosphere);
  const sky=VILLAGE_SKIES.find(entry=>entry.id===atmosphere.timeOfDay);
  const season=normalizeVillageSeason(collection.villageSeason);

  function interact(choice){
    const result=advanceVillageActivity(villageLife,district.id,choice);
    setActivityFeedback(result.message);
    if(result.valid)onActivity(district.id,choice);
  }
  function waveVisitor(pet){
    setVisitorGreeting(pet.name+" waves hello! The whole village feels brighter today.");
  }
  function goDistrict(id){
    setDistrictId(id);
    setNotice("Welcome to "+VILLAGE_DISTRICTS.find(d=>d.id===id).name+"!");
    setActivityFeedback("");setVisitorGreeting("");setLandmarkFeedback("");
  }
  function takeStroll(){
    const result=advanceVillageWalk(wander);
    onStroll();
    goDistrict(result.district);
  }
  function touchLandmark(){
    const result=advanceVillageLandmark(wander,district.id);
    if(!result.valid)return;
    onLandmark(district.id);
    setLandmarkFeedback(result.moment.message);
  }

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

    <section className="village-season-picker" aria-labelledby="village-season-heading">
      <h3 id="village-season-heading">🍁 Choose the village season</h3>
      <p>Your village can be in Spring, Summer, Autumn or Winter whenever you like.
        Seasons are free scenery and never change the weather outside or your earned treasures.</p>
      <div className="village-season-choices" role="group" aria-label="Village season">
        {VILLAGE_SEASONS.map(item=><button type="button" key={item.id}
          data-village-season={item.id} aria-pressed={season===item.id}
          className={season===item.id?"chosen":""} onClick={()=>onSeason(item.id)}>
          <span aria-hidden="true">{item.icon}</span><strong>{item.name}</strong>
        </button>)}
      </div>
      <p className="village-season-description" role="status">
        {VILLAGE_SEASONS.find(item=>item.id===season).description}
        {" "}Season and time of day can be mixed, even Winter Sunset!
      </p>
    </section>

    <section className="village-atmosphere" data-village-lighting={atmosphere.timeOfDay}
      aria-labelledby="village-atmosphere-heading">
      <h3 id="village-atmosphere-heading">🌤️ Set the village sky</h3>
      <p>Choose the time of day yourself. Nothing changes on a clock.
        Your choice is remembered on this device, and changing the sky won't
        change a single ornament or saved game.</p>
      <div className="village-sky-choices" role="group" aria-label="Village time of day">
        {VILLAGE_SKIES.map(option=><button key={option.id} type="button"
          data-village-sky={option.id} aria-pressed={atmosphere.timeOfDay===option.id}
          className={atmosphere.timeOfDay===option.id?"chosen":""}
          onClick={()=>onSky(option.id)}>
          <span aria-hidden="true">{option.icon}</span><strong>{option.name}</strong>
        </button>)}
      </div>
      <div className="village-glow-choices" role="group" aria-label="Village decorative lights">
        <button type="button" data-village-glow="lanterns"
          aria-pressed={atmosphere.lanterns} onClick={()=>onGlow("lanterns")}>
          <span aria-hidden="true">🏮</span>
          <span>Lanterns <strong>{atmosphere.lanterns?"On":"Off"}</strong></span>
        </button>
        <button type="button" data-village-glow="fireflies"
          aria-pressed={atmosphere.fireflies} onClick={()=>onGlow("fireflies")}>
          <span aria-hidden="true">✨</span>
          <span>Fireflies <strong>{atmosphere.fireflies?"On":"Off"}</strong></span>
        </button>
      </div>
      <p className="village-sky-description" role="status">
        {sky.description} Lanterns and fireflies appear at Sunset or Night,
        when their switches are on. Decorative lights are free scenery,
        not earned garden items.
      </p>
    </section>

    <section className="village-stroll-section" aria-labelledby="village-stroll-heading">
      <h3 id="village-stroll-heading">🐾 A gentle walk around the village</h3>
      <p>Follow your rescued friends from neighborhood to neighborhood.
        Their little walk is saved, and they only move when you tap the stroll button.
        No clock, chores or pet needs.</p>
      <div className="village-stroll-path" role="group" aria-label="Four village walking stops">
        {VILLAGE_DISTRICTS.map(d=><button type="button" key={d.id}
          data-village-walk-stop={d.id}
          aria-pressed={walking.district===d.id}
          className={"village-stroll-stop"+(walking.district===d.id?" current":"")}
          onClick={()=>goDistrict(d.id)}>
          <span aria-hidden="true">{d.icon}</span>
          <strong>{d.name}</strong>
          {walking.district===d.id&&
            <span className={"village-walking-crew"+(settings?.motion?" moving":"")}
              aria-label="Visitors are strolling here">
              {walking.pets.length?
                walking.pets.map(pet=><span key={pet.id} aria-label={pet.name}
                  title={pet.name}>{pet.icon}</span>):
                <span aria-label="Wild birds">🐦</span>}
            </span>}
        </button>)}
      </div>
      <div className="village-stroll-action">
        <p data-village-walk-status role="status">
          {walking.pets.length?
            walking.pets.map(p=>p.name).join(" and ")+" are strolling through "+walkingNeighborhood.name+".":
            "The wild birds are exploring "+walkingNeighborhood.name+"."}
        </p>
        <button type="button" data-village-stroll onClick={takeStroll}>
          🚶 Take a Gentle Stroll to {nextNeighborhood.name}
        </button>
      </div>
      <p className="village-stroll-help">Tap a neighborhood on the path to visit it
        without moving your walking friends.</p>
    </section>

    <section className="village-map-section" aria-labelledby="village-neighborhood-heading">
      <h3 id="village-neighborhood-heading">🏘️ Explore four neighborhoods</h3>
      <div className="village-district-tabs" role="group" aria-label="Choose a village neighborhood">
        {VILLAGE_DISTRICTS.map(d=><button key={d.id} type="button"
          data-village-district={d.id} aria-pressed={districtId===d.id}
          className={districtId===d.id?"selected":""}
          onClick={()=>goDistrict(d.id)}>
          <span aria-hidden="true">{d.icon}</span><strong>{d.name}</strong>
          <small>{Object.values(placements).filter(s=>s.startsWith(d.id+":")).length}/{VILLAGE_PLOTS} placed</small>
        </button>)}
      </div>
      <div className={"village-scene village-scene-"+district.id+
        " village-season-"+season+
        " village-time-"+atmosphere.timeOfDay+
        (glow.lanterns?" village-lanterns-on":"")+
        (glow.fireflies?" village-fireflies-on":"")}
        data-village-scene-time={atmosphere.timeOfDay}
        data-village-scene-season={season}>
        <div className="village-sky" aria-hidden="true">
          {atmosphere.timeOfDay==="night"?
            <><span>✦</span><span>🌙</span><span>✧</span></>:
            atmosphere.timeOfDay==="sunset"?
            <><span>☁️</span><span>🌅</span><span>✨</span></>:
            <><span>☁️</span><span>{district.id==="pond"?"🌤️":"☀️"}</span><span>☁️</span></>}
        </div>
        <div className="village-season-ornaments" data-village-season-ornaments={season}
          aria-label={"Seasonal scenery: "+season} role="img">
          {VILLAGE_SEASON_DECOR[season].map((item,i)=>
            <span key={i} aria-hidden="true">{item}</span>)}
        </div>
        <p className="village-season-caption" data-village-season-caption>
          {seasonalVillageDescription(season,district.id)}</p>
        {glow.lanterns&&
          <div className="village-ambient-lanterns" data-village-lanterns
            role="img" aria-label="Decorative village lanterns glowing">
            <span aria-hidden="true">🏮</span><span aria-hidden="true">🏮</span>
            <span aria-hidden="true">🏮</span>
          </div>}
        {glow.fireflies&&
          <div className={"village-ambient-fireflies"+(settings?.motion?" moving":"")}
            data-village-fireflies role="img" aria-label="Friendly fireflies glowing">
            {Array.from({length:7},(_,i)=><span key={i} aria-hidden="true"
              className={"village-firefly village-firefly-"+i}>✦</span>)}
          </div>}
        {district.id==="pond"&&glow.moonlitPond&&
          <div className="village-moonlit-pond" data-village-moon-pond
            role="img" aria-label="Moonlight reflecting on the quiet duck pond">
            <span aria-hidden="true">🌙</span><span aria-hidden="true">〰 〰 〰</span>
          </div>}
        <button type="button" className="village-landmark village-landmark-interactive"
          data-village-landmark={district.id}
          onClick={touchLandmark}
          aria-label={"Explore "+district.landmarkName}>
          <span className={"village-landmark-icon"+(settings?.motion?" moving":"")}
            aria-hidden="true">{landmarkMoment?.icon||district.landmark}</span>
          <strong>{district.landmarkName}</strong>
          <small>{district.description}</small>
          <em>Tap the landmark to discover a little moment</em>
        </button>
        {(landmarkFeedback||landmarkMoment)&&
          <p className="village-landmark-feedback" role="status"
            data-village-landmark-feedback>{landmarkFeedback||landmarkMoment.message}</p>}
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
        <div className="village-visitors" aria-label="Visiting rescue friends">
          {visitors.length?
            <>
              <strong>🐾 Visiting friends</strong>
              <div className="village-visitor-buttons">
                {visitors.map(pet=><button type="button" key={pet.id}
                  data-village-visitor={pet.id}
                  onClick={()=>waveVisitor(pet)}
                  aria-label={"Wave hello to "+pet.name}>
                  <span aria-hidden="true">{pet.icon}</span>
                  <small>{pet.name}</small>
                  <em>Wave hello!</em>
                </button>)}
              </div>
            </>:
            <p>🐦 The birds are visiting. More rescued friends can stop by
              as you earn them in the original four puzzle worlds!</p>}
          {visitorGreeting&&<p className="village-visitor-greeting" role="status">
            {visitorGreeting}</p>}
        </div>
      </div>
    </section>

    <section className="village-activity" data-village-activity={district.id} aria-labelledby="village-activity-heading">
      <h3 id="village-activity-heading">{activity.icon} {activity.name}</h3>
      <p>{activity.intro} Tap the friendly picture shown in the prompt.
        Wrong answers never cost anything, and there's no clock.</p>
      <div className="village-activity-progress" aria-label="Neighborhood activity progress">
        <strong>Step {activityState.step+1} of 3</strong>
        <span>Find the {activity.options[targetChoice].name} {activity.options[targetChoice].icon}</span>
        <small>{activityState.rounds} {activityState.rounds===1?"round":"rounds"} finished</small>
      </div>
      <div className="village-activity-choices" role="group" aria-label={activity.name+" choices"}>
        {activity.options.map((option,i)=><button type="button" key={i}
          data-village-activity-choice={i}
          aria-label={"Choose "+option.name}
          onClick={()=>interact(i)}>
          <span aria-hidden="true">{option.icon}</span>
          <strong>{option.name}</strong>
        </button>)}
      </div>
      <p className="village-activity-feedback" data-village-activity-feedback
        role="status" aria-live="polite">{activityFeedback||
          "You can come back anytime. Your place in this activity is saved automatically."}</p>
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
