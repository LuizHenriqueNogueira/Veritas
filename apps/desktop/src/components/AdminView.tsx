import {useEffect,useState} from 'react';
import {api} from '../api.js';
export function AdminView(){
 const [config,setConfig]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=()=>api.getConfiguracaoIA().then(setConfig);
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 const refresh=async(base=false)=>{setBusy(true);setError('');try{if(base)await api.atualizarBaseLinks();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const usage=config?.usage,rep=config?.reputation;
 return <div><div className="content-header admin-heading"><div><h1>Administração</h1><p>Consumo da instalação e disponibilidade dos serviços.</p></div><button className="btn-secondary" disabled={busy} onClick={()=>refresh()}>Atualizar painel</button></div>
 {error && <div className="alert-box alert-error" role="alert">{error}</div>}
 {!config && !error && <p role="status">Carregando painel...</p>}
 {config && <><div className="usage-grid">{[{name:'Chamadas de IA',value:usage.requestsToday,max:usage.requestsDay},{name:'Tokens usados ou reservados',value:usage.tokensToday,max:usage.tokensDay}].map(x=><section className="settings-section usage-card" key={x.name}><h2>{x.name}</h2><strong className="usage-value">{x.value.toLocaleString('pt-BR')} <small>/ {x.max.toLocaleString('pt-BR')}</small></strong><progress aria-label={x.name} value={x.value} max={x.max}/><p>{(x.value/x.max*100).toFixed(1).replace('.',',')}% do limite local · últimas 24 horas</p></section>)}</div>
 <section className="settings-section"><h2>Disponibilidade</h2><ul className="plain-list"><li>IA: {config.provider==='local'?'desativada (modo local)':config.configured && usage.available?'configurada':'limitada ou desativada'}</li><li>Pesquisa de fontes: {config.factcheck.enabled?'ativada':'desativada'}</li><li>OpenPhish: {rep.openphish.loaded?(rep.openphish.stale?'cópia desatualizada':'base disponível'):'ainda não disponível'}</li><li>Google Safe Browsing: {rep.googleSafeBrowsingConfigured?'configurado':'não configurado'}</li></ul>
 {usage.blockedUntil && <p role="status">Aguarde até {new Date(usage.blockedUntil).toLocaleString('pt-BR')} para nova tentativa de IA.</p>}
 {!usage.available && usage.error && <p role="alert">{usage.error}</p>}
 <p>OpenPhish: {rep.openphish.entries.toLocaleString('pt-BR')} URLs na cópia local.</p><p>Phishing.Database: {rep.phishingDatabase?.loaded?`${rep.phishingDatabase.entries.toLocaleString('pt-BR')} URLs na cópia local${rep.phishingDatabase.stale?' (desatualizada)':''}.`:'ainda não disponível.'}</p>
 <button className="btn-secondary" disabled={busy || !rep.enabled} onClick={()=>refresh(true)}>{busy?'Consultando...':'Verificar atualização das bases de links'}</button><p className="muted">As bases são reutilizadas por até 12 horas. A primeira atualização da base completa pode levar alguns instantes.</p></section>
 <details className="technical-details"><summary>Detalhes técnicos e limites</summary><dl><dt>Provedor e modelo</dt><dd>{config.provider} · {config.model || 'sem modelo'}</dd><dt>Limite por minuto</dt><dd>{usage.requestsMinute} chamadas / {usage.tokensMinute} tokens</dd><dt>Pesquisa por análise</dt><dd>Até {config.factcheck.maxPages} páginas</dd><dt>Última atualização da OpenPhish</dt><dd>{rep.openphish.updatedAt?new Date(rep.openphish.updatedAt).toLocaleString('pt-BR'):'Não disponível'}</dd><dt>Reutilizações de parecer</dt><dd>{usage.cacheHits}</dd></dl><p>Os tokens incluem uso e reservas conservadoras. O contador permanece após reiniciar. Os limites locais não medem consumo de outros aplicativos nem confirmam o plano de faturamento. Mantenha a organização Groq no plano Free.</p><p>As credenciais são configuradas somente no ambiente privado do backend. A interface não permite editar chaves ou elevar cotas.</p></details></>}
 </div>;
}
