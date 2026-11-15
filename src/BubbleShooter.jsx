import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BUBBLE_RADIUS, BUBBLE_COLORS, BUBBLE_SYMBOLS, bubbleCenter,
  bubbleGeometry, fireBubble, rainbowRescue, simulateBubblePath, usePearl, retryShooter
} from "./shooter.js";

function alongPath(points, fraction) {
  if (!points?.length) return {x:0,y:0};
  const lengths=[], total=points.slice(1).reduce((sum,p,i)=>{
    const a=points[i], length=Math.hypot(p.x-a.x,p.y-a.y);
    lengths.push(length);return sum+length;
  },0);
  let remaining=total * Math.max(0,Math.min(1,fraction));
  for(let i=0;i<lengths.length;i++){
    const length=lengths[i];
    if(remaining<=length || i===lengths.length-1){
      const a=points[i], b=points[i+1], t=length?remaining/length:1;
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
    }
    remaining-=length;
  }
  return points.at(-1);
}
function Orb({index,color,size,className=""}) {
  const {x,y}=bubbleCenter(index,size);
  return <g className={className}>
    <circle cx={x} cy={y} r={BUBBLE_RADIUS-1} fill={BUBBLE_COLORS[color]}
      stroke="#ffffff" strokeWidth="2.5"/>
    <circle cx={x-6} cy={y-7} r="6" fill="#ffffff" opacity=".32"/>
    <text x={x} y={y+6} textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff"
      stroke="#36536a" strokeWidth=".5" paintOrder="stroke">{BUBBLE_SYMBOLS[color]}</text>
  </g>;
}

export default function BubbleShooter({ game, onChange, onPath, onGarden, chapterChestReady, companion, settings }) {
  const svgRef=useRef(null), touchRef=useRef(null), rafRef=useRef(null);
  const {width,height,origin}=bubbleGeometry(game.size);
  const [aim,setAim]=useState({x:origin.x,y:20});
  const [flying,setFlying]=useState(null);
  const [orb,setOrb]=useState(origin);
  const [notice,setNotice]=useState("");
  const blocked=Boolean(flying), remaining=game.cells.filter(v=>v!==null).length;
  const trajectory=useMemo(()=>simulateBubblePath(game,aim.x,aim.y),
    [game,aim.x,aim.y]);
  const visibleCells = [...game.cells];
  if(flying?.phase==="pop" && flying.result.path?.landing!==undefined)
    visibleCells[flying.result.path.landing]=flying.result.landedColor;

  function point(event){
    const rect=svgRef.current?.getBoundingClientRect();
    if(!rect)return {x:origin.x,y:0};
    return {x:Math.max(BUBBLE_RADIUS,Math.min(width-BUBBLE_RADIUS,(event.clientX-rect.left)*width/rect.width)),
      y:Math.max(0,Math.min(height,(event.clientY-rect.top)*height/rect.height))};
  }
  function shoot(x=aim.x,y=aim.y){
    if(blocked||game.won||game.failed)return;
    if(game.shotsLeft===0){setNotice("Use a saved Pearl or Rainbow Boost, or retry the level.");return;}
    const result=fireBubble(game,x,y);
    if(!result.valid){
      setNotice("No room for that shot. Try another angle!");
      return;
    }
    setNotice("");
    setOrb(origin);
    setFlying({phase:"moving",result});
  }
  function redeemPearl(){
    if(blocked)return;
    const result=usePearl(game);
    if(result.valid){onChange(result.game);setNotice("Pearl Boost! Three extra balls ready.");}
  }
  function redeemRainbow(){
    if(blocked)return;
    const result=rainbowRescue(game);
    if(result.valid){setNotice("Rainbow Burst! Watch those bubbles pop!");setFlying({phase:"pop",result});}
  }
  function retry(allowRestart = false){
    const result=retryShooter(game, allowRestart);
    if(!result.valid||blocked)return;
    setNotice("");
    setAim({x:origin.x,y:20});
    setOrb(origin);
    onChange(result.game);
  }
  function onDown(event){
    if(blocked||game.won)return;
    if(event.isPrimary===false || (event.pointerType==="mouse"&&event.button!==0))return;
    const next=point(event);setAim(next);touchRef.current=event.pointerId;
    try {svgRef.current.setPointerCapture(event.pointerId);}catch{}
  }
  function onMove(event){
    if(touchRef.current!==event.pointerId || blocked)return;
    setAim(point(event));
  }
  function onUp(event){
    if(touchRef.current!==event.pointerId)return;
    touchRef.current=null;
    const target=point(event);setAim(target);shoot(target.x,target.y);
  }
  function onCancel(){touchRef.current=null;}

  useEffect(()=>{
    if(flying?.phase!=="moving")return;
    let stopped=false;
    const path=flying.result.path.points, initial=performance.now();
    const duration=settings.motion?(settings.motionSpeed==="relaxed"?760:520):140;
    function frame(now){
      if(stopped)return;
      const t=Math.min(1,(now-initial)/duration);
      setOrb(alongPath(path,t));
      if(t>=1){setFlying(prev=>prev && {...prev,phase:"pop"});return;}
      rafRef.current=requestAnimationFrame(frame);
    }
    rafRef.current=requestAnimationFrame(frame);
    return ()=>{stopped=true;cancelAnimationFrame(rafRef.current);};
  },[flying?.phase,flying?.result,settings.motion,settings.motionSpeed]);

  useEffect(()=>{
    if(flying?.phase!=="pop")return;
    const timer=setTimeout(()=>{
      onChange(flying.result.game);
      setFlying(null);
    },settings.motion?(settings.motionSpeed==="relaxed"?660:450):0);
    return ()=>clearTimeout(timer);
  },[flying?.phase,flying?.result,settings.motion,settings.motionSpeed,onChange]);

  const busyColor=game.currentColor;
  const pathPoints=trajectory.points?.filter((_,i)=>i%6===0 || i===trajectory.points.length-1)
    .map(p=>p.x+","+p.y).join(" ");
  const won=game.won && !blocked;
  if(won)return (
    <section className="shooter-panel">
      <div className="trail-victory" role="status">
        <div className="victory-garden" aria-hidden="true">🐠 🫧 ⭐</div>
        <h3>Level {game.level} Complete!</h3>
        <p>The lagoon is clear! Your marker moved another step along the Adventure Path.</p>
        <div className="victory-stars" aria-label={game.stars + " out of 3 stars"}>{"★".repeat(game.stars || 1)}<span>{"☆".repeat(3-(game.stars||1))}</span></div>
        <div className="victory-results"><span>⭐ {game.score} points</span><span>🎯 {game.moves} shots</span><span>🫧 {game.shotsLeft} balls left</span></div>
        {chapterChestReady && <button className="victory-chest" type="button" onClick={onGarden}>
          🎁 Open Your Chapter Treasure Chest!
        </button>}
        <button className="trail-play" type="button" onClick={onPath}>🐚 See My Adventure Path →</button>
        <p>Every 10 completed levels earns two bonus Pearls for the next chapter.</p>
      </div>
    </section>
  );
  if(game.failed && !blocked)return (
    <section className="shooter-panel">
      <div className="trail-victory shooter-retry" role="status">
        <div className="victory-garden" aria-hidden="true">🫧 🐠 💛</div>
        <h3>Out of Bubbles!</h3>
        <p>Good try! This level has a fresh set of balls ready for you, plus a few extra to help.</p>
        <div className="victory-results"><span>⭐ {game.score} points</span><span>🎯 {game.moves} shots</span></div>
        <button type="button" className="trail-play" onClick={() => retry()}>↻ Try Level {game.level} Again</button>
        <button type="button" className="shooter-return" onClick={onPath}>🗺️ Back to Adventure Path</button>
        <p>No lives lost, no waiting, no purchases. Your completed levels and stars are safe.</p>
      </div>
    </section>
  );

  return <section className="shooter-panel" aria-label="Bubble Lagoon bubble-shooter game">
    <div className="shooter-topline">
      <div><p className="eyebrow">🫧 Bubble Lagoon</p><h2>Level {game.level}</h2>
        {companion && <span className={"shooter-companion"+(settings.motion?" companion-moving":"")}
          title={companion.name} aria-label={companion.name+" is cheering you on"}>
          <span aria-hidden="true">{companion.icon}</span>
        </span>}</div>
      <button type="button" className="map-shortcut" disabled={blocked} onClick={onPath}>🗺️ Path</button>
      <div className="score-chip">⭐ {game.score}</div>
    </div>
    <p className="shooter-goal">Clear all bubbles! <strong>{remaining} left</strong> · <strong className="shots-left" aria-label={game.shotsLeft + " balls remaining"}>{game.shotsLeft} balls left</strong></p>
    <p className="shooter-instruction"><span className="shooter-tip-long">Aim & release to shoot. Match 3 for a Pearl, 4+ for a Rainbow!</span><span className="shooter-tip-short">3 = 🦪 Pearl · 4+ = 🌈 Rainbow!</span></p>
    <div className="shooter-arena">
      {flying?.phase==="pop" && (flying.result.popped.length+flying.result.dropped.length>0) &&
        <div className="shooter-combo" aria-hidden="true">
          <strong>{flying.result.earned?.rainbow ? "🌈 Rainbow Earned!" :
            flying.result.earned?.pearl ? "🦪 Pearl Earned!" : "✨ Bubble Pop!"}</strong>
          <small>{flying.result.popped.length} popped · {flying.result.dropped.length} dropped</small>
        </div>}
      <svg ref={svgRef} viewBox={"0 0 "+width+" "+height}
        className="shooter-svg" role="group" aria-label="Aimable bubble arena"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        onPointerCancel={onCancel} onLostPointerCapture={onCancel}>
        <defs>
          <linearGradient id="lagoon-bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#b9f1fa"/><stop offset="1" stopColor="#467aab"/>
          </linearGradient>
        </defs>
        <rect width={width} height={height} rx="16" fill="url(#lagoon-bg)"/>
        <path d={"M 0 "+(height-45)+" Q "+(width/2)+" "+(height-66)+" "+width+" "+(height-45)} fill="none" stroke="#9ae7fa" strokeWidth="3" opacity=".35"/>
        {!blocked && <polyline points={pathPoints} fill="none" stroke="#fff"
          strokeDasharray="4 9" strokeWidth="3" strokeLinecap="round" opacity=".8"/>}
        {visibleCells.map((v,i)=>v===null?null:<Orb key={i} index={i} color={v} size={game.size}
          className={flying?.phase==="pop" && flying.result.popped.includes(i) ? "shooter-popping" :
            flying?.phase==="pop" && flying.result.dropped.includes(i) ? "shooter-dropping" : ""}/>)}
        <g className="shooter-launcher">
          <path d={"M "+(origin.x-27)+" "+(height-8)+" L "+(origin.x-20)+" "+(origin.y+8)+" Q "+origin.x+" "+(origin.y-9)+" "+(origin.x+20)+" "+(origin.y+8)+" L "+(origin.x+27)+" "+(height-8)+" Z"} fill="#285b85" stroke="#b8efff" strokeWidth="3"/>
          {!blocked && <g><circle cx={origin.x} cy={origin.y} r={BUBBLE_RADIUS-1} fill={BUBBLE_COLORS[busyColor]} stroke="#fff" strokeWidth="3"/><text x={origin.x} y={origin.y+6} textAnchor="middle" fontSize="20" fill="#fff" fontWeight="900">{BUBBLE_SYMBOLS[busyColor]}</text></g>}
        </g>
        {flying?.phase==="moving" && <g><circle cx={orb.x} cy={orb.y} r={BUBBLE_RADIUS-1} fill={BUBBLE_COLORS[flying.result.landedColor]} stroke="#fff" strokeWidth="3"/><text x={orb.x} y={orb.y+6} textAnchor="middle" fontSize="20" fill="#fff" fontWeight="900">{BUBBLE_SYMBOLS[flying.result.landedColor]}</text></g>}
      </svg>
      <div className="shooter-powers" role="group" aria-label="Earned power-ups">
        <button type="button" className="shooter-power pearl" disabled={blocked || game.pearls < 1}
          aria-label={"Use Pearl Boost, " + game.pearls + " saved, adds three balls"} onClick={redeemPearl}>
          <span>🦪 +3</span><small>×{game.pearls}</small>
        </button>
        <button type="button" className="shooter-power rainbow" disabled={blocked || game.rainbows < 1}
          aria-label={"Use Rainbow Burst, " + game.rainbows + " saved, pops a bubble cluster"} onClick={redeemRainbow}>
          <span>🌈 Burst</span><small>×{game.rainbows}</small>
        </button>
      </div>
    </div>
    <div className="shooter-controls">
      <div className="shooter-next">Next <span style={{background:BUBBLE_COLORS[game.nextColor]}}>{BUBBLE_SYMBOLS[game.nextColor]}</span></div>
      <button type="button" disabled={blocked || game.shotsLeft===0} onClick={()=>setAim(prev=>({x:Math.max(0,prev.x-24),y:prev.y}))} aria-label="Aim left">← Aim</button>
      <button type="button" disabled={blocked || game.shotsLeft===0} onClick={()=>shoot()} className="shooter-fire">Shoot!</button>
      <button type="button" disabled={blocked || game.shotsLeft===0} onClick={()=>setAim(prev=>({x:Math.min(width,prev.x+24),y:prev.y}))} aria-label="Aim right">Aim →</button>
    </div>
    {notice && <p className="shooter-notice" role="status">{notice}</p>}
    {notice.startsWith("No room") && <button type="button" className="shooter-return"
      onClick={() => retry(true)}>↻ Restart Level (Free)</button>}
    <p className="shooter-footnote">Earn a Pearl with 3 matching bubbles (+3 balls), or a Rainbow with 4+ (burst a cluster). Each level has a shot budget, but retries are always free. No lives or purchases.</p>
  </section>;
}
