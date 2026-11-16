import React, { useState } from "react";
import GardenVillage from "./GardenVillage.jsx";
import {
  availableChests, totalAvailableChests, gardenInventory, MEADOW_GARDEN_DECOR, PUMPKIN_GARDEN_DECOR, MOONLIGHT_GARDEN_DECOR, KITCHEN_GARDEN_DECOR
} from "./collection.js";

const WORLD_NAMES={
  harvest:"Harvest Valley",sweets:"Sugar Mountain",
  rescue:"Critter Rescue",bubbles:"Bubble Lagoon"
};

export function CompanionBadge({collection,settings}) {
  const {pets}=gardenInventory(collection);
  const active=pets.find(p=>p.id===collection?.companion);
  return active ?
    <span className={"companion-badge"+(settings.motion?" companion-moving":"")}
      aria-label={active.name+" is cheering you on"} title={active.name}>
      <span aria-hidden="true">{active.icon}</span><small>{active.name}</small>
    </span> : null;
}

export default function Garden({saved, onClaim, onSelectPet, onToggleDecor, onPlaceVillage, onStoreVillage, onVillageActivity, onVillageStroll, onVillageLandmark, onVillageSky, onVillageGlow, onVisitWorld, onVisitPorch, onBonus, onBack}) {
  const [reveal,setReveal]=useState(null);
  const [allBonus,setAllBonus]=useState(false);
  const [villageOpen,setVillageOpen]=useState(false);
  const collection=saved.collection;
  const {decor,pets,rewards}=gardenInventory(collection);
  const chests=availableChests(saved);
  const pendingChests=totalAvailableChests(saved);
  const visible=decor.filter(item=>!collection.hiddenDecorations.includes(item.id));
  const chosen=pets.find(p=>p.id===collection.companion);
  const bonusKeys=Object.keys(collection.claimed).reverse();
  if(villageOpen)return <GardenVillage collection={collection} settings={saved.settings}
    onPlace={onPlaceVillage} onStore={onStoreVillage} onActivity={onVillageActivity}
    onStroll={onVillageStroll} onLandmark={onVillageLandmark}
    onSky={onVillageSky} onGlow={onVillageGlow}
    onVisitWorld={onVisitWorld} onVisitPorch={onVisitPorch}
    onBack={()=>setVillageOpen(false)}/>;
  return <section className="garden-home" aria-label="Mom's collectible garden">
    <header className="garden-heading">
      <button type="button" className="trail-back" onClick={onBack}>‹ Back to Game</button>
      <div><p className="trail-eyebrow">🌼 MeekLee's Growing Garden</p>
        <h2>Mom's Happy Garden</h2></div>
    </header>
    <p className="garden-intro">Every ten completed levels in the four original worlds earns a treasure chest.
      Open one to welcome a new garden decoration, an adorable friend, and a special bonus game!
      Complete picture puzzles to earn nine extra treasures, explore Flower Meadow for
      six spring decorations, Pumpkin Patch for six autumn decorations, Moonlight Orchard for six evening treasures, or Grandma's Kitchen for six homestead decorations!</p>
    <div className="garden-village-invite">
      <div><span aria-hidden="true">🏘️</span><strong>Explore Mom's Garden Village</strong>
        <small>Arrange your earned treasures across four neighborhoods and follow the paths to every game!</small></div>
      <button type="button" onClick={()=>setVillageOpen(true)}
        aria-label="Explore Garden Village">🏡 Explore Garden Village</button>
    </div>

    <div className="garden-landscape" aria-label="Your collected garden decorations and companion">
      <span className="garden-sun" aria-hidden="true">☀️</span>
      <span className="garden-cloud cloud-one" aria-hidden="true">☁️</span>
      <span className="garden-cloud cloud-two" aria-hidden="true">☁️</span>
      <div className="garden-meadow" aria-hidden="true"/>
      <div className="garden-fence" aria-hidden="true">🌱 🌱 🌱 🌱 🌱</div>
      <div className="garden-placed" aria-label={visible.length+" displayed decorations"}>
        {visible.length===0 ?
          <div className="garden-starter">🌱 <strong>Your garden begins here!</strong><small>Complete ten levels or a picture puzzle to earn your first decoration.</small></div> :
          visible.map((item,i)=><div className="garden-ornament" key={item.id}
            title={item.name} style={{"--ornament-delay":(i%6)*-0.18+"s"}}
            aria-label={item.name}><span aria-hidden="true">{item.icon}</span></div>)}
      </div>
      <div className={"garden-visitor"+(saved.settings.motion?" companion-moving":"")}
        aria-live="polite">
        <span aria-hidden="true">{chosen?.icon || "🐝"}</span>
        <strong>{chosen?.name || "A friendly visitor"}</strong>
      </div>
    </div>
    <div className="garden-totals" aria-label="Your collection">
      <span>🏡 {decor.length} decorations</span>
      <span>🐾 {pets.length} friends</span>
      <span>🎁 {rewards.length} chests opened</span>
    </div>

    <section className="garden-section" aria-labelledby="garden-chest-title">
      <h3 id="garden-chest-title">🎁 Treasure Chests {pendingChests>0?"("+pendingChests+" ready)":""}</h3>
      {chests.length===0 ?
        <p className="garden-section-help">Your next chest appears after Level 10, 20, 30, and so on in the original four worlds. Flower Meadow, Pumpkin Patch, Moonlight Orchard and Grandma's Kitchen have their own decorations.</p> :
        <div className="chest-list">
          {chests.slice(0,4).map(reward=>
            <button className="chest-button" type="button" key={reward.key}
              onClick={()=>{onClaim(reward.mode,reward.chapter);setReveal(reward);}}>
              <span className="chest-icon" aria-hidden="true">🎁</span>
              <span><strong>Open {WORLD_NAMES[reward.mode]} Chest</strong>
                <small>Level {reward.level} completed · tap to reveal!</small></span>
            </button>)}
          {pendingChests>4&&<p className="garden-section-help">Plus {pendingChests-4} more chests. Open these to see the next ones!</p>}
        </div>}
      {reveal && collection.claimed[reveal.key] &&
        <div className="chest-reveal" role="status" aria-label="Treasure opened">
          <strong>🎉 Your treasure chest is open!</strong>
          <div className="chest-prizes">
            <span>{reveal.decor.icon} {reveal.decor.name}</span>
            <span>{reveal.pet.icon} {reveal.pet.name}</span>
          </div>
          <p>And you've unlocked a special Treasure Match bonus board!</p>
          <button type="button" onClick={()=>onBonus(reveal.key)}>🎲 Play My Bonus Board →</button>
        </div>}
    </section>

    <section className="garden-section" aria-labelledby="meadow-prize-title">
      <h3 id="meadow-prize-title">🌷 Flower Meadow Rewards</h3>
      <p className="garden-section-help">Gather bouquets in Flower Meadow to earn six extra garden decorations.
        Each prize is earned once across both board sizes, with no purchases or timers.</p>
      <div className="garden-collection-grid" aria-label="Flower Meadow earned decorations">
        {MEADOW_GARDEN_DECOR.map(prize=>{
          const owned=collection.meadowPrizes?.includes(prize.id);
          return <div key={prize.id} className={"garden-collectible meadow-prize"+(owned?" showing":"")}
            aria-label={prize.name+(owned?", earned":", unlock at Meadow level "+prize.level)}>
            <span aria-hidden="true">{owned?prize.icon:"🌱"}</span>
            <strong>{prize.name}</strong>
            <small>{owned?"✓ Earned! Plant from the garden list":"Complete Meadow Level "+prize.level}</small>
          </div>;
        })}
      </div>
    </section>

    <section className="garden-section" aria-labelledby="pumpkin-prize-title">
      <h3 id="pumpkin-prize-title">🎃 Pumpkin Patch Rewards</h3>
      <p className="garden-section-help">Harvest pumpkins and crops to earn six autumn decorations
        at levels 3, 6, 9, 12, 15 and 18. Each is earned once across both board sizes,
        with no purchases or time limits.</p>
      <div className="garden-collection-grid" aria-label="Pumpkin Patch earned decorations">
        {PUMPKIN_GARDEN_DECOR.map(prize=>{
          const owned=collection.pumpkinPrizes?.includes(prize.id);
          return <div key={prize.id}
            className={"garden-collectible pumpkin-prize"+(owned?" showing":"")}
            aria-label={prize.name+(owned?", earned":", unlock at Pumpkin Patch level "+prize.level)}>
            <span aria-hidden="true">{owned?prize.icon:"🍂"}</span>
            <strong>{prize.name}</strong>
            <small>{owned?"✓ Earned! Plant from the garden list":
              "Complete Pumpkin Level "+prize.level}</small>
          </div>;
        })}
      </div>
    </section>

    <section className="garden-section" aria-labelledby="moonlight-prize-title">
      <h3 id="moonlight-prize-title">🌙 Moonlight Orchard Rewards</h3>
      <p className="garden-section-help">Follow the moon phases and collect fruit to earn six
        evening garden decorations at levels 3, 6, 9, 12, 15 and 18. Each prize is
        earned only once across both board sizes. No accounts, purchases or timers.</p>
      <div className="garden-collection-grid" aria-label="Moonlight Orchard earned decorations">
        {MOONLIGHT_GARDEN_DECOR.map(prize=>{
          const owned=collection.moonlightPrizes?.includes(prize.id);
          return <div key={prize.id}
            className={"garden-collectible moonlight-prize"+(owned?" showing":"")}
            aria-label={prize.name+(owned?", earned":", unlock at Moonlight Orchard level "+prize.level)}>
            <span aria-hidden="true">{owned?prize.icon:"🌙"}</span>
            <strong>{prize.name}</strong>
            <small>{owned?"✓ Earned! Plant from the garden list":
              "Complete Orchard Level "+prize.level}</small>
          </div>;
        })}
      </div>
    </section>

    <section className="garden-section" aria-labelledby="kitchen-prize-title">
      <h3 id="kitchen-prize-title">🥣 Grandma's Kitchen Rewards</h3>
      <p className="garden-section-help">Complete cozy ingredient orders and earn six
        homestead decorations at levels 3, 6, 9, 12, 15 and 18. Each prize is earned
        once across both board sizes, with no purchases, accounts or timers.</p>
      <div className="garden-collection-grid" aria-label="Grandma's Kitchen earned decorations">
        {KITCHEN_GARDEN_DECOR.map(prize=>{
          const owned=collection.kitchenPrizes?.includes(prize.id);
          return <div key={prize.id}
            className={"garden-collectible kitchen-prize"+(owned?" showing":"")}
            aria-label={prize.name+(owned?", earned":", unlock at Grandma's Kitchen level "+prize.level)}>
            <span aria-hidden="true">{owned?prize.icon:"🥣"}</span>
            <strong>{prize.name}</strong>
            <small>{owned?"✓ Earned! Plant from the garden list":
              "Complete Kitchen Level "+prize.level}</small>
          </div>;
        })}
      </div>
    </section>

    <section className="garden-section" aria-labelledby="decor-title">
      <h3 id="decor-title">🌷 Decorate Your Garden</h3>
      <p className="garden-section-help">Tap a collected decoration to plant it or put it away. Everything stays yours!</p>
      {decor.length===0?<p className="garden-empty">The first treasure chest brings your first decoration.</p>:
        <div className="garden-collection-grid">
          {decor.map(item=>{
            const showing=!collection.hiddenDecorations.includes(item.id);
            return <button type="button" key={item.id} className={"garden-collectible"+(showing?" showing":"")}
              aria-pressed={showing} aria-label={item.name+", "+(showing?"in garden":"put away")}
              onClick={()=>onToggleDecor(item.id)}>
              <span aria-hidden="true">{item.icon}</span><strong>{item.name}</strong>
              <small>{showing?"✓ Planted":"Tap to plant"}</small>
            </button>;
          })}
        </div>}
    </section>

    <section className="garden-section" aria-labelledby="friends-title">
      <h3 id="friends-title">🐾 Your Rescue Friends</h3>
      <p className="garden-section-help">Tap a friend to have them cheer you on during puzzles. They never need feeding or buying!</p>
      {pets.length===0?<p className="garden-empty">Your first little friend is waiting in a treasure chest.</p>:
        <div className="garden-collection-grid pet-collection">
          {pets.map(pet=>
            <button type="button" key={pet.id} className={"garden-collectible"+(chosen?.id===pet.id?" showing":"")}
              aria-pressed={chosen?.id===pet.id}
              aria-label={"Choose "+pet.name+(chosen?.id===pet.id?", selected":"")}
              onClick={()=>onSelectPet(pet.id)}>
              <span aria-hidden="true">{pet.icon}</span><strong>{pet.name}</strong>
              <small>{chosen?.id===pet.id?"♥ Your companion":"Tap to choose"}</small>
            </button>)}
        </div>}
    </section>

    <section className="garden-section" aria-labelledby="bonus-title">
      <h3 id="bonus-title">🎲 Treasure Match Bonus Boards</h3>
      <p className="garden-section-help">Every opened chest unlocks a new, relaxing picture-matching bonus board. No timers, lives or cost.</p>
      {bonusKeys.length===0?<p className="garden-empty">Your first bonus board arrives with your first chest.</p>:
        <div className="garden-bonus-list">
          {(allBonus?bonusKeys:bonusKeys.slice(0,4)).map(key=>{
            const [world,chapter]=key.split(":");
            const best=collection.completedBonuses[key];
            return <button type="button" key={key} className="garden-bonus-button" onClick={()=>onBonus(key)}>
              <span aria-hidden="true">{best?"🏅":"🎲"}</span>
              <span><strong>{WORLD_NAMES[world]} · Chest {chapter}</strong>
                <small>{best?"Completed! Best: "+best+" turns":"New bonus board ready"}</small></span>
            </button>;
          })}
          {bonusKeys.length>4&&<button className="garden-more" type="button"
            onClick={()=>setAllBonus(!allBonus)}>{allBonus?"Show fewer bonus boards":"Show all "+bonusKeys.length+" bonus boards"}</button>}
        </div>}
    </section>
  </section>;
}
