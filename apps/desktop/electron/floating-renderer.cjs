const button=document.querySelector('button');let start=null,moved=false;
button.addEventListener('pointerdown',e=>{if(e.button!==0)return;start={x:e.screenX,y:e.screenY,dx:e.clientX,dy:e.clientY};moved=false;button.setPointerCapture(e.pointerId);});
button.addEventListener('pointermove',e=>{if(!start)return;if(Math.hypot(e.screenX-start.x,e.screenY-start.y)>5)moved=true;if(moved)window.veritasBubble.send({action:'move',x:e.screenX-start.dx,y:e.screenY-start.dy});});
button.addEventListener('pointerup',()=>{if(!start)return;if(moved)window.veritasBubble.send({action:'save'});start=null;});
button.addEventListener('click',()=>{if(!moved)window.veritasBubble.send({action:'restore'});moved=false;});
button.addEventListener('pointercancel',()=>{start=null;});
button.addEventListener('contextmenu',e=>{e.preventDefault();window.veritasBubble.send({action:'menu'});});
button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '||e.key==='Escape'){e.preventDefault();window.veritasBubble.send({action:'restore'});}});
