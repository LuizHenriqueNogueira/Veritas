import React from 'react';
import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {App} from '../src/App.js';
import {OCRReviewView} from '../src/components/OCRReviewView.js';
import {api} from '../src/api.js';
vi.mock('../src/api.js',()=>({getAuthToken:()=>null,removeAuthToken:vi.fn(),api:{createAnalise:vi.fn(),cancelAnalise:vi.fn()}}));
vi.mock('../src/components/LoginView.js',()=>({LoginView:({onSuccess}:any)=><><button onClick={()=>onSuccess({id:1,nome:'Ana',email:'ana@example.test'})}>Entrar Ana</button><button onClick={()=>onSuccess({id:2,nome:'Beto',email:'beto@example.test'})}>Entrar Beto</button></>}));
vi.mock('../src/components/Sidebar.js',()=>({Sidebar:({onNavigate,onLogout}:any)=><><button onClick={()=>onNavigate('new-analysis')}>Nova análise</button><button onClick={()=>onNavigate('settings')}>Configurações</button><button onClick={()=>onNavigate('help')}>Ajuda</button><button onClick={onLogout}>Sair</button></>}));
vi.mock('../src/components/ResultView.js',()=>({ResultView:({onNewAnalysis}:any)=><button onClick={onNewAnalysis}>Analisar outro conteúdo</button>}));
const stored=(id:number,patch:object)=>localStorage.setItem(`veritas:preferences:v1:${id}`,JSON.stringify(patch));
const checked=(name:string)=>(screen.getByRole('radio',{name:new RegExp(name)}) as HTMLInputElement).checked;
beforeEach(()=>{vi.clearAllMocks();});

it('UP01: o primeiro formulário após o login já usa o agente salvo, inclusive em preferências antigas',()=>{
 stored(1,{defaultAgent:'fraude_digital',theme:'dark',reducedMotion:true});
 render(<App/>);fireEvent.click(screen.getByText('Entrar Ana'));
 expect(checked('Fraude Digital')).toBe(true);expect(document.documentElement.dataset.theme).toBe('dark');
});
it('UP02: clicar novamente em Nova análise retorna ao preferido sem perder o texto quando rascunho está ativo',()=>{
 stored(1,{defaultAgent:'fraude_digital'});render(<App/>);fireEvent.click(screen.getByText('Entrar Ana'));
 fireEvent.click(screen.getByRole('radio',{name:/Desinformação/}));fireEvent.change(screen.getByLabelText(/Texto para analisar/),{target:{value:'Texto ainda não enviado.'}});
 fireEvent.click(screen.getByRole('button',{name:'Nova análise'}));
 expect(checked('Fraude Digital')).toBe(true);expect((screen.getByLabelText(/Texto para analisar/) as HTMLTextAreaElement).value).toBe('Texto ainda não enviado.');
});
it('UP03: alterar a preferência em Configurações prevalece sobre o agente do rascunho anterior',()=>{
 render(<App/>);fireEvent.click(screen.getByText('Entrar Ana'));
 fireEvent.change(screen.getByLabelText(/Texto para analisar/),{target:{value:'Meu rascunho.'}});
 fireEvent.click(screen.getByRole('button',{name:'Configurações'}));
 expect(screen.queryByText('Reduzir animações')).toBeNull();
 fireEvent.change(screen.getByLabelText(/Agente preferido/),{target:{value:'link_suspeito'}});
 fireEvent.click(screen.getByRole('button',{name:'Nova análise'}));expect(checked('Link Suspeito')).toBe(true);
 fireEvent.click(screen.getByRole('radio',{name:/Desinformação/}));
 expect((screen.getByLabelText(/Texto para analisar/) as HTMLTextAreaElement).value).toBe('Meu rascunho.');
 expect(JSON.parse(localStorage.getItem('veritas:preferences:v1:1')!).defaultAgent).toBe('link_suspeito');
});
it('UP04: desligar Manter rascunho limpa os campos ao navegar e conserva a preferência do agente',()=>{
 stored(1,{defaultAgent:'fraude_digital'});render(<App/>);fireEvent.click(screen.getByText('Entrar Ana'));
 fireEvent.change(screen.getByLabelText(/Texto para analisar/),{target:{value:'Não guardar este texto.'}});
 fireEvent.click(screen.getByRole('button',{name:'Configurações'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/Manter rascunho ao navegar/}));
 fireEvent.click(screen.getByRole('button',{name:'Nova análise'}));
 expect((screen.getByLabelText(/Texto para analisar/) as HTMLTextAreaElement).value).toBe('');expect(checked('Fraude Digital')).toBe(true);
 expect(JSON.parse(localStorage.getItem('veritas:preferences:v1:1')!).keepDraft).toBe(false);
});
it('UP05: preferência e rascunho de uma conta não passam para outra',()=>{
 stored(1,{defaultAgent:'fraude_digital'});stored(2,{defaultAgent:'link_suspeito'});
 render(<App/>);fireEvent.click(screen.getByText('Entrar Ana'));
 fireEvent.change(screen.getByLabelText(/Texto para analisar/),{target:{value:'Texto da Ana.'}});
 fireEvent.click(screen.getByRole('button',{name:'Sair'}));fireEvent.click(screen.getByText('Entrar Beto'));
 expect(checked('Link Suspeito')).toBe(true);expect((screen.getByLabelText(/Link para verificar/) as HTMLInputElement).value).toBe('');
 fireEvent.click(screen.getByRole('radio',{name:/Fraude Digital/}));expect((screen.getByLabelText(/Texto para analisar/) as HTMLTextAreaElement).value).toBe('');
});
it('UP06: nova análise a partir do resultado usa o preferido e começa sem o conteúdo anterior',async()=>{
 stored(1,{defaultAgent:'fraude_digital'});vi.mocked(api.createAnalise).mockResolvedValue({id:1} as any);
 render(<App/>);fireEvent.click(screen.getByText('Entrar Ana'));fireEvent.click(screen.getByRole('radio',{name:/Desinformação/}));
 fireEvent.change(screen.getByLabelText(/Texto para analisar/),{target:{value:'Conteúdo analisado.'}});fireEvent.click(screen.getByRole('button',{name:'Analisar agora'}));
 fireEvent.click(await screen.findByText('Analisar outro conteúdo'));
 expect(checked('Fraude Digital')).toBe(true);expect((screen.getByLabelText(/Texto para analisar/) as HTMLTextAreaElement).value).toBe('');
});
it('UP07: revisão de OCR respeita o agente inicial sem fazer chamadas externas',()=>{
 const start=vi.fn();render(<OCRReviewView initialText="Texto reconhecido." defaultAgent="fraude_digital" onStartAnalysis={start} onNewCapture={vi.fn()} onCancel={vi.fn()}/>);
 expect(screen.getByRole('radio',{name:/Fraude Digital/}).getAttribute('aria-checked')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:/Iniciar análise/}));expect(start).toHaveBeenCalledWith('Texto reconhecido.','fraude_digital');
});
