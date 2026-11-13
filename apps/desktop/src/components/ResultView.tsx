import {Icon} from './Icon.js';
import {useState,useEffect,useRef} from 'react';
import {FeedbackCard} from './FeedbackCard.js';
interface Finding {titulo:string;texto:string;tipo:string;rotulo:string;nivel_alerta?:string}
export function ResultView({analise,onNewAnalysis,confirmLinks=true}:{analise:any;onNewAnalysis:()=>void;confirmLinks?:boolean}){
 const [copiado,setCopiado]=useState(false),[copyError,setCopyError]=useState(''),[pendingUrl,setPendingUrl]=useState<string|null>(null);
 const modal=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(!pendingUrl)return;
  const previous=document.activeElement as HTMLElement|null;
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setPendingUrl(null);}
   if(event.key==='Tab'){
    const items=modal.current?.querySelectorAll<HTMLElement>('button,a[href]');if(!items?.length)return;
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',keyboard);return()=>{document.removeEventListener('keydown',keyboard);previous?.focus();};
 },[pendingUrl]);
 const lower=(analise.classificacao || '').toLowerCase();
 const verdict=analise.apresentacao?.veredito;
 const risk=verdict?.tom || (/inconclusiv|sem registro|falha/.test(lower)?'inconclusivo':lower.includes('alto')?'alto':/médio|medio|moderado/.test(lower)?'medio':lower.includes('baixo')?'baixo':'inconclusivo');
 const findings:Finding[]=analise.apresentacao?.achados || [];
 const alerts=findings.filter(a=>a.tipo==='alerta'),evidence=findings.filter(a=>a.tipo==='evidencia'),context=findings.filter(a=>a.tipo==='contexto'),notes=findings.filter(a=>['informacao','limitacao'].includes(a.tipo));
 const sources=analise.apresentacao?.referencias || [];
 const copy=async()=>{try{await navigator.clipboard.writeText(`[Veritas]\nAgente: ${analise.agente?.nome}\nResultado: ${analise.classificacao}\n\n${analise.resultado}\n\nConteúdo: ${analise.conteudo || analise.url}${analise.contexto?'\nContexto da mensagem: '+analise.contexto:''}\n\n${findings.map(a=>`${a.rotulo} — ${a.titulo}: ${a.texto}`).join('\n')}\n\nReferências:\n${sources.map((f:any)=>`${f.titulo}: ${f.url}`).join('\n')}`);setCopiado(true);setCopyError('');setTimeout(()=>setCopiado(false),2500);}catch{setCopyError('Não foi possível copiar. Selecione e copie o texto do parecer.');}};
 const card=(a:Finding,i:number)=><article key={i} className={`finding-item ${a.tipo==='alerta'?a.nivel_alerta:'neutral'}`}><div className="finding-title"><strong>{a.titulo}</strong><span className="finding-label">{a.rotulo}</span></div><p className="finding-body">{a.texto}</p></article>;
 const validLink=(url:string)=>{try{return ['https:','http:'].includes(new URL(url).protocol);}catch{return false;}};
 return <div className="result-container"><div className="content-header"><h1>Resultado da análise</h1><p>Confira o parecer e as evidências encontradas.</p></div>
 <div className="result-header-card"><div><span className="eyebrow">Agente responsável</span><h2><Icon name="ShieldCheck"/> {analise.agente?.nome || 'Veritas'}</h2></div><div><p className="muted badge-caption">{analise.agente?.tipo==='desinformacao'?'Veredito sobre a afirmação':'Resultado da verificação'}</p><div className={`risk-badge ${risk}`}><Icon name={risk==='alto'?'ShieldAlert':risk==='medio'?'TriangleAlert':risk==='baixo'?'CircleCheck':'CircleHelp'}/>{verdict?.titulo || analise.classificacao || 'Análise concluída'}</div>{verdict?.descricao && <p className="verdict-description">{verdict.descricao}</p>}</div></div>
 <div className="result-grid"><div className="result-column"><section className="result-card"><h3>Conteúdo analisado</h3><div className="analyzed-content">{analise.conteudo || analise.url}</div>{analise.contexto && <><h4 className="context-heading">Contexto da mensagem</h4><p className="analyzed-content">{analise.contexto}</p></>}</section><section className="result-card"><h3>O que a análise indica</h3><p className="result-explanation">{analise.resultado}</p><p className="result-limitation">O Veritas pode errar. Confira as fontes e as datas antes de tomar uma decisão.</p></section>
 {analise.status==='CONCLUIDA' && Number.isSafeInteger(analise.id) && <FeedbackCard key={analise.id} analysisId={analise.id}/>}
 {notes.length>0 && <section className="result-card"><h3>Observações e limitações</h3>{notes.map(card)}</section>}</div>
 <div className="result-column">{alerts.length>0 && <section className="result-card"><h3>Sinais de risco identificados</h3>{alerts.map(card)}</section>}
 {evidence.length>0 && <section className="result-card"><h3>Evidências sobre a afirmação</h3><p className="muted section-note">Os rótulos mostram a relação com a afirmação; não são níveis de risco.</p>{evidence.map(card)}</section>}
 {context.length>0 && <section className="result-card"><details className="context-details"><summary>Contexto adicional ({context.length})</summary><p className="muted section-note">Estes trechos não verificam diretamente a mesma afirmação.</p>{context.map(card)}</details></section>}
 <section className="result-card"><h3>Fontes e referências</h3><p className="muted section-note">Veja o que foi lido e o que é apenas sugerido para consulta.</p><div className="source-list">{sources.map((f:any,i:number)=><article className="source-card" key={i}><div className="source-status">{f.estado}{f.publicacao?` · ${f.publicacao}`:''}</div><strong>{f.titulo}</strong>{f.trecho && <details className="source-excerpt"><summary>Ver trecho da fonte</summary><p>{f.trecho}</p></details>}{validLink(f.url)?<a href={f.url} target="_blank" rel="noopener noreferrer" onClick={e=>{if(confirmLinks){e.preventDefault();setPendingUrl(f.url);}}}><Icon name="Link" size={14}/> {f.origem} — abrir referência</a>:<span>Endereço indisponível</span>}</article>)}</div>{!sources.length && <p className="muted">Nenhuma referência externa disponível para esta análise.</p>}</section></div></div>
 <div className="result-actions"><span className="muted" role="status">{copyError || (copiado?'Resultado copiado com as referências.':'Você pode consultar esta análise no Histórico.')}</span><div><button className="btn-secondary" onClick={copy}>{copiado?'Copiado!':'Copiar resultado'}</button><button className="btn-primary" onClick={onNewAnalysis}>Nova análise</button></div></div>
 {pendingUrl && <div className="reference-overlay"><section ref={modal} role="dialog" aria-modal="true" aria-labelledby="reference-title" className="reference-dialog"><h2 id="reference-title">Abrir referência externa?</h2><p>Você vai acessar um site fora do Veritas. Confira o endereço antes de continuar.</p><p className="reference-url">{pendingUrl}</p><div><button className="btn-secondary" autoFocus onClick={()=>setPendingUrl(null)}>Cancelar</button><a className="btn-primary" href={pendingUrl} target="_blank" rel="noopener noreferrer" onClick={()=>setPendingUrl(null)}>Abrir site</a></div></section></div>}</div>;
}
