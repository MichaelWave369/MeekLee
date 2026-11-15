import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BUBBLE_RADIUS, BUBBLE_COLORS, BUBBLE_SYMBOLS, bubbleCenter,
  bubbleGeometry, fireBubble, rainbowRescue, simulateBubblePath
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

export default function BubbleShooter({ game, onChange, onPath, settings }) {
  const svgRef=useRef(null), touchRef=useRef(null), rafRef=useRef(null);
  const {width,height,origin}=bubbleGeometry(game.size);
  const [aim,setAim]=useState({x:origin.x,y:20});
  const [flying,setFlying]=useState(null);
  const [orb,setOrb]=useState(origin);
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
    if(blocked||game.won)return;
    const result=fireBubble(game,x,y);
    if(!result.valid){
      // If every landing is packed, Rainbow Rescue clears a cluster for free.
      const rescue=rainbowRescue(game);
      if(rescue.valid)setFlying({phase:"pop",result:rescue});
      return;
    }
    setOrb(origin);
    setFlying({phase:"moving",result});
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
        <div className="victory-results"><span>⭐ {game.score} points</span><span>🎯 {game.moves} shots</span></div>
        <button className="trail-play" type="button" onClick={onPath}>🐚 See My Adventure Path →</button>
      </div>
    </section>
  );

  return <section className="shooter-panel" aria-label="Bubble Lagoon bubble-shooter game">
    <div className="shooter-topline">
      <div><p className="eyebrow">🫧 Bubble Lagoon</p><h2>Level {game.level}</h2></div>
      <button type="button" className="map-shortcut" disabled={blocked} onClick={onPath}>🗺️ Path</button>
      <div className="score-chip">⭐ {game.score}</div>
    </div>
    <p className="shooter-goal">Clear all bubbles! <strong>{remaining} left</strong> · {game.moves} shots</p>
    <p className="shooter-instruction">Touch where you want to aim, then release to shoot!</p>
    <div className="shooter-arena">
      {flying?.phase==="pop" && (flying.result.popped.length+flying.result.dropped.length>0) &&
        <div className="shooter-combo" aria-hidden="true">✨ Pop! +{flying.result.popped.length+flying.result.dropped.length}</div>}
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
    </div>
    <div className="shooter-controls">
      <div className="shooter-next">Next <span style={{background:BUBBLE_COLORS[game.nextColor]}}>{BUBBLE_SYMBOLS[game.nextColor]}</span></div>
      <button type="button" disabled={blocked} onClick={()=>setAim(prev=>({x:Math.max(0,prev.x-24),y:prev.y}))} aria-label="Aim left">← Aim</button>
      <button type="button" disabled={blocked} onClick={()=>shoot()} className="shooter-fire">Shoot!</button>
      <button type="button" disabled={blocked} onClick={()=>setAim(prev=>({x:Math.min(width,prev.x+24),y:prev.y}))} aria-label="Aim right">Aim →</button>
    </div>
    <button type="button" disabled={blocked} className="shooter-rainbow" onClick={()=>{
      const result=rainbowRescue(game);
      if(result.valid)setFlying({phase:"pop",result});
    }}>🌈 Free Rainbow Rescue</button>
    <p className="shooter-footnote">No lives, no shot limits and no paid boosters. Each group of 3+ matching bubbles pops; loose bubbles fall away!</p>
  </section>;
}
