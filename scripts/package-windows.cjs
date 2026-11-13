// Reproducible portable Windows build. Private config and databases are never copied.
const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');const rcedit=require('rcedit');
const root=path.resolve(__dirname,'..'),out=path.join(root,'release','Veritas-Windows');
const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true,force:true});};
async function main(){
  if(process.platform!=='win32')throw new Error('Este empacotamento deve ser executado no Windows.');
  if(!fs.existsSync(path.join(root,'apps/api/dist/server.js')) || !fs.existsSync(path.join(root,'apps/desktop/dist/index.html')))throw new Error('Execute npm run build antes de empacotar.');
  fs.mkdirSync(out,{recursive:true});
  const electronExe=require('electron'),electronDir=path.dirname(electronExe);
  for(const entry of fs.readdirSync(electronDir,{withFileTypes:true})){
    if(['electron.exe','resources','LICENSE'].includes(entry.name))continue;
    copy(path.join(electronDir,entry.name),path.join(out,entry.name==='electron_wer.dll'?'Veritas_wer.dll':entry.name));
  }
  copy(electronExe,path.join(out,'Veritas.exe'));copy(path.join(electronDir,'LICENSE'),path.join(out,'LICENSE-Electron.txt'));
  const app=path.join(out,'resources','app'),api=path.join(out,'resources','api');
  const compiled=path.resolve(app,'dist');
  if(!compiled.startsWith(path.resolve(out)+path.sep))throw new Error('Diretório de compilação fora da distribuição.');
  fs.rmSync(compiled,{recursive:true,force:true});
  copy(path.join(root,'apps/desktop/electron'),path.join(app,'electron'));copy(path.join(root,'apps/desktop/dist'),path.join(app,'dist'));copy(path.join(root,'assets'),path.join(app,'assets'));
  fs.writeFileSync(path.join(app,'package.json'),JSON.stringify({name:'veritas',productName:'Veritas',version:'1.6.0',main:'electron/app.cjs'}));
  copy(path.join(root,'apps/api/dist'),path.join(api,'dist'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));delete manifest.devDependencies;delete manifest.scripts;
  fs.writeFileSync(path.join(api,'package.json'),JSON.stringify(manifest,null,2));
  const npmCli=process.env.npm_execpath || path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  const npm=spawnSync(process.execPath,[npmCli,'install','--prefix',api,'--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:root,stdio:'inherit',windowsHide:true});
  if(npm.status!==0)throw new Error('Não foi possível preparar as dependências do backend.');
  const node=process.env.VERITAS_NODE_RUNTIME || process.execPath;
  copy(node,path.join(out,'resources/runtime/node.exe'));
  const license=path.join(path.dirname(node),'LICENSE');if(fs.existsSync(license))copy(license,path.join(out,'LICENSE-Node.txt'));
  const seeds=path.join(root,'assets/reputation');if(fs.existsSync(seeds))copy(seeds,path.join(api,'seeds'));
  copy(path.join(root,'assets/PHISHING-DATABASE-LICENSE.txt'),path.join(out,'LICENSE-Phishing.Database.txt'));
  const version={ProductName:'Veritas',FileDescription:'Veritas Analisador de Conteúdo',CompanyName:'Equipe Veritas',OriginalFilename:'Veritas.exe',InternalName:'Veritas',LegalCopyright:'Projeto acadêmico Veritas'};
  await rcedit(path.join(out,'Veritas.exe'),{icon:path.join(root,'assets/veritas.ico'),'file-version':'1.6.0','product-version':'1.6.0','version-string':version,'requested-execution-level':'asInvoker'});
  fs.writeFileSync(path.join(out,'LEIA-ME.txt'),'VERITAS 1.6.0\r\n\r\nAbra Veritas.exe. Mantenha esta pasta inteira: o executável depende da pasta resources e das DLLs. Não exige Node ou npm instalados.\r\n\r\nA configuração privada fica em config/.env, ao lado do executável. Sem esse arquivo, a primeira abertura cria uma configuração local sem chave de IA. Os dados novos ficam na pasta de usuário do Veritas; caminhos privados configurados podem apontar para o histórico existente. Não compartilhe config/.env nem bancos de usuários.\r\n\r\nO botão flutuante aparece após entrar na conta e usar outro programa. Clique para voltar, arraste para mover. Desative em Configurações > Acesso rápido ou com o botão direito no escudo. Fechar a janela encerra o aplicativo; minimizar o mantém disponível.\r\n\r\nAs chaves e as cotas não são incorporadas ao executável. Configure IA e Safe Browsing no arquivo privado. Não apague o contador de uso para liberar cotas.\r\n');
  console.log('Executável preparado: '+path.join(out,'Veritas.exe'));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
