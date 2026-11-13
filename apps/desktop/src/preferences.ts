import {useEffect,useState} from 'react';
export interface Preferences {theme:'system'|'light'|'dark';textSize:'normal'|'large';reducedMotion:boolean;defaultAgent:'desinformacao'|'fraude_digital'|'link_suspeito';confirmLinks:boolean;floatingButton:boolean}
export const defaults:Preferences={theme:'system',textSize:'normal',reducedMotion:false,defaultAgent:'desinformacao',confirmLinks:true,floatingButton:true};
function read(id:number|null):Preferences{
 try{const v=JSON.parse(localStorage.getItem(`veritas:preferences:v1:${id}`) || '{}');return {theme:['system','light','dark'].includes(v.theme)?v.theme:defaults.theme,textSize:v.textSize==='large'?'large':'normal',reducedMotion:v.reducedMotion===true,defaultAgent:['desinformacao','fraude_digital','link_suspeito'].includes(v.defaultAgent)?v.defaultAgent:defaults.defaultAgent,confirmLinks:v.confirmLinks!==false,floatingButton:v.floatingButton!==false};}catch{return {...defaults};}
}
export function usePreferences(id:number|null){
 const [preferences,setPreferences]=useState<Preferences>(()=>read(id));const [saveError,setSaveError]=useState('');
 useEffect(()=>{setPreferences(read(id));setSaveError('');},[id]);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const apply=()=>{document.documentElement.dataset.theme=preferences.theme==='system'?(media.matches?'dark':'light'):preferences.theme;document.documentElement.dataset.textSize=preferences.textSize;document.documentElement.dataset.motion=preferences.reducedMotion?'reduced':'normal';};
  apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
 },[preferences]);
 const update=(patch:Partial<Preferences>)=>{const next={...preferences,...patch};setPreferences(next);try{localStorage.setItem(`veritas:preferences:v1:${id}`,JSON.stringify(next));setSaveError('');}catch{setSaveError('Não foi possível salvar neste dispositivo. As alterações valem apenas nesta sessão.');}};
 return {preferences,update,saveError};
}
