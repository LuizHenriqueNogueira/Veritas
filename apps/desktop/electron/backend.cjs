const {spawn}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const {randomBytes}=require('node:crypto');

async function startBackend(app){
  if(!app.isPackaged)return {url:process.env.VERITAS_EXTERNAL_BACKEND_URL || 'http://localhost:3001/api',stop(){}};
  const config=process.env.VERITAS_CONFIG_PATH || path.join(path.dirname(app.getPath('exe')),'config','.env');
  const data=path.join(app.getPath('userData'),'data');fs.mkdirSync(data,{recursive:true});
  if(!fs.existsSync(config)){
    fs.mkdirSync(path.dirname(config),{recursive:true});
    fs.writeFileSync(config,`AI_PROVIDER=local\nJWT_SECRET=${randomBytes(32).toString('hex')}\nFACTCHECK_ENABLED=true\nREPUTATION_ENABLED=true\nPHISHING_DATABASE_ENABLED=true\nLINK_USE_AI=true\n`,{flag:'wx'});
  }
  const backend=path.join(process.resourcesPath,'api');
  const child=spawn(path.join(process.resourcesPath,'runtime','node.exe'),[path.join(backend,'dist/server.js')],{
    cwd:backend,windowsHide:true,stdio:['ignore','pipe','pipe'],
    env:{...process.env,DOTENV_CONFIG_PATH:config,VERITAS_DEFAULT_DATA_DIR:data,REPUTATION_SEEDS_DIR:path.join(backend,'seeds'),PORT:'0',HOST:'127.0.0.1',NODE_ENV:'production'}
  });
  const log=fs.createWriteStream(path.join(app.getPath('userData'),'backend.log'),{flags:'a'});
  child.stderr.on('data',chunk=>log.write(chunk));
  const stop=()=>{if(!child.killed)child.kill();log.end();};
  app.on('before-quit',stop);
  try{
    const port=await new Promise((resolve,reject)=>{
      let buffer='';const timer=setTimeout(()=>reject(new Error('O serviço local não iniciou. Consulte backend.log na pasta de dados do Veritas.')),30000);
      const fail=()=>{clearTimeout(timer);reject(new Error('O serviço local foi encerrado. Consulte backend.log na pasta de dados do Veritas.'));};
      child.once('error',fail);child.once('exit',fail);
      child.stdout.on('data',chunk=>{
        log.write(chunk);buffer=(buffer+chunk.toString()).slice(-10000);
        const match=buffer.match(/VERITAS_READY:(\d+)/);if(match){clearTimeout(timer);child.removeListener('error',fail);child.removeListener('exit',fail);resolve(Number(match[1]));}
      });
    });
    return {url:`http://127.0.0.1:${port}/api`,stop};
  }catch(error){stop();throw error;}
}
module.exports={startBackend};
