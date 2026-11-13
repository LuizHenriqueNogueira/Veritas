import {useEffect,useRef} from 'react';
export function ConfirmDialog({title,children,confirmLabel,onConfirm,onCancel,busy=false,error=''}:{title:string;children:React.ReactNode;confirmLabel:string;onConfirm:()=>void;onCancel:()=>void;busy?:boolean;error?:string}){
 const root=useRef<HTMLElement>(null),cancel=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const old=document.activeElement as HTMLElement|null;cancel.current?.focus();return()=>{if(old?.isConnected)old.focus();};},[]);
 return <div className="reference-overlay"><section ref={root} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body" className="reference-dialog" onKeyDown={e=>{
  if(e.key==='Escape' && !busy){e.preventDefault();onCancel();}
  if(e.key==='Tab'){const items=root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}}
 }}><h2 id="confirm-title">{title}</h2><div id="confirm-body">{children}</div>{error && <p role="alert" className="form-error">{error}</p>}<div className="dialog-actions"><button ref={cancel} className="btn-secondary" disabled={busy} onClick={onCancel}>Cancelar</button><button className="btn-danger" disabled={busy} onClick={onConfirm}>{busy?'Aguarde...':confirmLabel}</button></div></section></div>;
}
