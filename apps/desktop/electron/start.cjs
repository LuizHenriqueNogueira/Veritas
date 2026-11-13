const { spawn } = require('node:child_process');
const path = require('node:path');
async function main() {
  const dev = process.argv.includes('--dev');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  if (dev) {
    const url = 'http://localhost:3000';
    let ready = false;
    for(let i=0;i<100;i++) {
      try { const response=await fetch(url,{signal:AbortSignal.timeout(1000)}); if(response.ok){ready=true;break;} } catch {}
      await new Promise(r=>setTimeout(r,200));
    }
    if (!ready) throw new Error('A interface não iniciou em http://localhost:3000. Confira se a porta está disponível.');
    env.VITE_DEV_SERVER_URL=url;
  } else { delete env.VITE_DEV_SERVER_URL; env.NODE_ENV='production'; }
  const child=spawn(require('electron'),['.'],{cwd:path.join(__dirname,'..'),env,stdio:'inherit'});
  child.on('error',e=>{console.error(e.message);process.exit(1);});
  child.on('exit',code=>process.exit(code ?? 0));
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{child.kill();process.exit(0);});
}
main().catch(e=>{console.error(e.message);process.exit(1);});
