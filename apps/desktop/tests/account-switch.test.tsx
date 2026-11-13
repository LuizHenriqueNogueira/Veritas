import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act} from '@testing-library/react';
import {App} from '../src/App.js';
import {api} from '../src/api.js';
vi.mock('../src/api.js',()=>({getAuthToken:()=>null,removeAuthToken:vi.fn(),api:{getAnaliseById:vi.fn(),createAnalise:vi.fn(),cancelAnalise:vi.fn(async()=>({mensagem:'Análise cancelada.'}))}}));
vi.mock('../src/components/LoginView.js',()=>({LoginView:({onSuccess}:any)=><><button onClick={()=>onSuccess({id:1,nome:'Luiz',email:'luiz@example.test'})}>Entrar Luiz</button><button onClick={()=>onSuccess({id:2,nome:'Lucas',email:'lucas@example.test'})}>Entrar Lucas</button></>}));
vi.mock('../src/components/Sidebar.js',()=>({Sidebar:({onNavigate,onLogout,usuario}:any)=><><span>{usuario.nome}</span><button onClick={()=>onNavigate('history')}>Histórico</button><button onClick={onLogout}>Sair</button></>}));
vi.mock('../src/components/HistoryView.js',()=>({HistoryView:({onSelectAnalise}:any)=><button onClick={()=>onSelectAnalise(1)}>Abrir análise antiga</button>}));
vi.mock('../src/components/NewAnalysisView.js',()=>({NewAnalysisView:({onStartAnalysis}:any)=><button onClick={()=>onStartAnalysis({tipo_entrada:'TEXTO',agente_tipo:'desinformacao',conteudo:'Texto da conta'})}>Analisar</button>}));
vi.mock('../src/components/ResultView.js',()=>({ResultView:({analise}:any)=><div>{analise.fontes[0].titulo}</div>}));
it('resposta atrasada do histórico do Luiz não aparece após o login do Lucas',async()=>{
  let finish!:(x:unknown)=>void;vi.mocked(api.getAnaliseById).mockReturnValue(new Promise(r=>finish=r));
  render(<App/>);fireEvent.click(screen.getByText('Entrar Luiz'));fireEvent.click(screen.getByText('Histórico'));fireEvent.click(screen.getByText('Abrir análise antiga'));
  fireEvent.click(screen.getByText('Sair'));fireEvent.click(screen.getByText('Entrar Lucas'));
  await act(async()=>finish({fontes:[{titulo:'Fonte privada do Luiz'}]}));
  expect(screen.queryByText('Fonte privada do Luiz')).toBeNull();expect(screen.getByText('Lucas')).toBeTruthy();expect(screen.getByText('Analisar')).toBeTruthy();
});
it('resposta atrasada de nova análise não substitui a tela de outra conta',async()=>{
  let finish!:(x:unknown)=>void;vi.mocked(api.createAnalise).mockReturnValue(new Promise(r=>finish=r));
  render(<App/>);fireEvent.click(screen.getByText('Entrar Luiz'));fireEvent.click(screen.getByText('Analisar'));fireEvent.click(screen.getByText('Sair'));fireEvent.click(await screen.findByText('Entrar Lucas'));
  expect(api.cancelAnalise).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9-]{36}$/));
  await act(async()=>finish({fontes:[{titulo:'Fonte privada da análise'}]}));
  expect(screen.queryByText('Fonte privada da análise')).toBeNull();expect(screen.getByText('Lucas')).toBeTruthy();
});
it('cancelamento chama o servidor e uma resposta tardia não substitui o formulário',async()=>{
 let finish!:(x:unknown)=>void;vi.mocked(api.createAnalise).mockReturnValue(new Promise(r=>finish=r));render(<App/>);fireEvent.click(screen.getByText('Entrar Luiz'));fireEvent.click(screen.getByText('Analisar'));fireEvent.click(screen.getByRole('button',{name:'Cancelar análise e voltar'}));await screen.findByText('Analisar');expect(api.cancelAnalise).toHaveBeenCalled();await act(async()=>finish({fontes:[{titulo:'Resultado de análise cancelada'}]}));expect(screen.queryByText('Resultado de análise cancelada')).toBeNull();expect(screen.getByText('Analisar')).toBeTruthy();
});
