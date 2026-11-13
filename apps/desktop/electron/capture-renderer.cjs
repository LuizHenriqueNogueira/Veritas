const image = document.getElementById('screen');
const selection = document.getElementById('selection');
let start;
window.captureAPI.ready().then(data => { image.src = data; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.captureAPI.finish(null); });
document.addEventListener('pointerdown', e => { if(e.button !== 0) return; start = { x: e.clientX, y: e.clientY }; });
function region(e) { return { x: Math.min(start.x, e.clientX), y: Math.min(start.y, e.clientY), width: Math.abs(start.x - e.clientX), height: Math.abs(start.y - e.clientY), viewportWidth: innerWidth, viewportHeight: innerHeight }; }
document.addEventListener('pointermove', e => {
  if (!start) return; const r = region(e); selection.style.display = 'block';
  Object.assign(selection.style, { left: r.x+'px', top: r.y+'px', width: r.width+'px', height: r.height+'px' });
});
document.addEventListener('pointerup', e => {
  if (!start) return; const r = region(e); start = null;
  if (r.width > 5 && r.height > 5) window.captureAPI.finish(r);
  else selection.style.display = 'none';
});
