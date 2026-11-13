import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
// Load paths before importing repositories or opening SQLite.
if(!process.env.DATA_DIR && process.env.VERITAS_DEFAULT_DATA_DIR)process.env.DATA_DIR=process.env.VERITAS_DEFAULT_DATA_DIR;
if(process.env.REPUTATION_SEEDS_DIR){
  const target=path.join(process.env.DATA_DIR || path.resolve('data'),'reputation');
  fs.mkdirSync(target,{recursive:true});
  for(const name of ['openphish.json','phishing-database.json']){
    const from=path.join(process.env.REPUTATION_SEEDS_DIR,name),to=path.join(target,name);
    if(fs.existsSync(from) && !fs.existsSync(to))fs.copyFileSync(from,to);
  }
}
