import React,{useState} from "react";
import {newJigsaw,swapJigsaw,correctJigsawPieces,JIGSAW_SCENES} from "./jigsaw.js";
import "./family-game-house.css";
const imagePath=scene=>import.meta.env.BASE_URL+"jigsaws/"+scene+".svg";
export default function JigsawGame({game,onChange,onLeave}){
  const [selected,setSelected]=useState(null);
  const [hint,setHint]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [notice,setNotice]=useState("Tap one piece, then tap another to swap. You can also drag pieces on a computer.");
  const size=game.size,scene=JIGSAW_SCENES.find(s=>s.id===game.scene);
  function swap(a,b){
    const outcome=swapJigsaw(game,a,b);
    if(outcome.valid){onChange(outcome.game);
      setNotice(outcome.game.won?"You did it! Picture complete!": "Lovely! Keep going.");
    }
    setSelected(null);
  }
  function choose(i){
    if(game.won)return;
    if(selected===null){setSelected(i);setNotice("Now tap the place where you'd like this piece.");}
    else if(selected===i)setSelected(null);
    else swap(selected,i);
  }
  function changePuzzle(newScene,newSize){
    if(!confirm){setConfirm({scene:newScene,size:newSize});return;}
    if(confirm.scene!==newScene||confirm.size!==newSize){setConfirm({scene:newScene,size:newSize});return;}
    onChange(newJigsaw(Date.now(),newScene,newSize));
    setSelected(null);setConfirm(false);setHint(false);setNotice("Your new picture is ready. Enjoy!");
  }
  const done=correctJigsawPieces(game);
  return <section className="family-mini-game family-jigsaw" aria-label="Picture jigsaw puzzles">
    <div className="cardgame-top"><div>
      <p className="trail-eyebrow">🌷 Cozy puzzle room</p>
      <h2>Picture Puzzle Porch</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">Rebuild the picture by swapping mixed-up pieces. No clock,
      no lives to lose. Start with nine big pieces, or try sixteen or twenty-five.</p>
    <div className="family-jigsaw-stats">
      <strong>{scene.icon} {scene.name}</strong>
      <span>{done} / {size*size} in the right place</span><span>{game.moves} swaps</span>
    </div>
    <div className="family-jigsaw-layout">
      <div>
        <div className="family-jigsaw-board" style={{"--piece-size":size,
          "--picture-url":'url("'+imagePath(game.scene)+'")'}}
          aria-label={size+" by "+size+" picture puzzle"} role="group">
          {game.tiles.map((tile,index)=>{
            const col=tile%size,row=Math.floor(tile/size);
            return <button type="button" key={tile}
              className={"family-jigsaw-tile"+(selected===index?" selected":"")+
                (hint&&tile===index?" correct":"")}
              style={{backgroundImage:'url("'+imagePath(game.scene)+'")',
                backgroundSize:(size*100)+"% "+(size*100)+"%",
                backgroundPosition:(col*100/(size-1))+"% "+(row*100/(size-1))+"%"}}
              aria-label={"Picture piece "+(tile+1)+" in position "+(index+1)+
                (tile===index?", correct position":"")}
              aria-pressed={selected===index}
              onClick={()=>choose(index)}
              draggable={!game.won}
              onDragStart={event=>{
                event.dataTransfer.setData("text/plain",String(index));
                event.dataTransfer.effectAllowed="move";
              }}
              onDragOver={event=>event.preventDefault()}
              onDrop={event=>{
                event.preventDefault();
                const from=Number(event.dataTransfer.getData("text/plain"));
                if(Number.isInteger(from))swap(from,index);
              }} />;
          })}
        </div>
        <div className="family-jigsaw-guidance">
          <button type="button" onClick={()=>setHint(p=>!p)}>
            {hint?"Hide Correct Pieces":"💡 Show Correct Pieces"}
          </button>
          <p className="family-mini-notice" role="status">{game.won?
            "🏆 Beautiful! You completed this picture!":notice}</p>
        </div>
      </div>
      <div className="family-jigsaw-reference">
        <strong>🌼 Your picture</strong>
        <img src={imagePath(game.scene)} alt={scene.description} loading="lazy"/>
        <p>Pick another picture or size whenever you're ready.</p>
        <div className="family-jigsaw-options">
          {JIGSAW_SCENES.map(s=><button type="button" key={s.id}
            onClick={()=>changePuzzle(s.id,size)} disabled={s.id===game.scene&&!game.won}>
            {s.icon} {s.name}
          </button>)}
        </div>
        <div className="family-jigsaw-options">
          {[3,4,5].map(n=><button type="button" key={n}
            onClick={()=>changePuzzle(game.scene,n)} disabled={n===size&&!game.won}>
            {n} × {n} {n===3?"Easy":n===4?"Cozy":"Challenge"}
          </button>)}
        </div>
        {confirm&&<div className="family-jigsaw-confirm" role="status">
          <p>Replace this puzzle with a fresh one? Your other game saves remain safe.</p>
          <button type="button" onClick={()=>changePuzzle(confirm.scene,confirm.size)}>
            ✓ Confirm New Picture
          </button>
          <button type="button" onClick={()=>setConfirm(false)}>Keep This Puzzle</button>
        </div>}
      </div>
    </div>
    <p className="cardgame-foot">Three original illustrated scenes. Saved on this device.
      Touch to swap pieces or use drag-and-drop on a computer.</p>
  </section>;
}
