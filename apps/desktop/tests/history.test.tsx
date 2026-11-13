import React from 'react';
import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {HistoryView} from '../src/components/HistoryView.js';
import {api} from '../src/api.js';
vi.mock('../src/api.js',()=>({api:{getAgentes:vi.fn(),getAnalises:vi.fn(),deleteAnalise:vi.fn(),restoreAnalise:vi.fn()}}));
const analysis={id:7,data_criacao:'2026-11-07T12:00:00Z',conteudo:'Pesquisa para excluir',agente_id:1,status:'CONCLUIDA',classificacao:'Ainda não foi possível verificar'};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(api.getAgentes).mockResolvedValue([{id:1,nome:'Desinformação'}]);vi.mocked(api.getAnalises).mockResolvedValue([analysis]);vi.mocked(api.deleteAnalise).mockResolvedValue({mensagem:'Pesquisa movida para a lixeira.'});vi.mocked(api.restoreAnalise).mockResolvedValue({mensagem:'Pesquisa restaurada.'});});
it('UH01: excluir pede confirmação, começa em Cancelar e Esc volta sem chamar API',async()=>{
 render(<HistoryView onSelectAnalise={vi.fn()} onNewAnalysis={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Excluir'}));const cancel=screen.getByRole('button',{name:'Cancelar'});expect(document.activeElement).toBe(cancel);fireEvent.keyDown(cancel,{key:'Escape'});expect(screen.queryByRole('alertdialog')).toBeNull();expect(api.deleteAnalise).not.toHaveBeenCalled();
});
it('UH02: confirmar move para lixeira e Desfazer restaura a mesma pesquisa',async()=>{
 render(<HistoryView onSelectAnalise={vi.fn()} onNewAnalysis={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Excluir'}));vi.mocked(api.getAnalises).mockResolvedValueOnce([]);fireEvent.click(screen.getByRole('button',{name:'Mover para a lixeira'}));await screen.findByText('Pesquisa movida para a lixeira.');expect(api.deleteAnalise).toHaveBeenCalledWith(7);await screen.findByText(/Seu histórico ainda está vazio/);fireEvent.click(screen.getByRole('button',{name:'Desfazer exclusão'}));await screen.findByText('Pesquisa restaurada.');expect(api.restoreAnalise).toHaveBeenCalledWith(7);
});
it('UH03: lixeira consulta excluídas e permite restaurar sem abrir detalhes',async()=>{
 render(<HistoryView onSelectAnalise={vi.fn()} onNewAnalysis={vi.fn()}/>);await screen.findByText('Pesquisa para excluir');fireEvent.click(screen.getByRole('button',{name:'Ver lixeira'}));fireEvent.click(await screen.findByRole('button',{name:'Restaurar'}));await screen.findByText('Pesquisa restaurada.');expect(api.getAnalises).toHaveBeenCalledWith(expect.objectContaining({excluidas:true}));expect(api.restoreAnalise).toHaveBeenCalledWith(7);expect(screen.queryByRole('button',{name:'Ver detalhes'})).toBeNull();
});
it('UH04: erro de exclusão permanece no diálogo e nova tentativa funciona',async()=>{
 vi.mocked(api.deleteAnalise).mockRejectedValueOnce(new Error('Não foi possível excluir.'));render(<HistoryView onSelectAnalise={vi.fn()} onNewAnalysis={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Excluir'}));fireEvent.click(screen.getByRole('button',{name:'Mover para a lixeira'}));await screen.findByRole('alert');expect(screen.getByRole('alertdialog')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Mover para a lixeira'}));await screen.findByText('Pesquisa movida para a lixeira.');
});
it('UH05: busca e filtro são enviados ao servidor e podem ser limpos',async()=>{
 render(<HistoryView onSelectAnalise={vi.fn()} onNewAnalysis={vi.fn()}/>);await screen.findByText('Pesquisa para excluir');vi.mocked(api.getAnalises).mockResolvedValue([]);fireEvent.change(screen.getByLabelText('Pesquisar no histórico'),{target:{value:'inexistente'}});fireEvent.click(screen.getByRole('button',{name:'Buscar'}));await screen.findByText('Nenhuma pesquisa corresponde aos filtros.');expect(api.getAnalises).toHaveBeenLastCalledWith(expect.objectContaining({busca:'inexistente'}));fireEvent.click(screen.getByRole('button',{name:'Limpar filtros'}));await waitFor(()=>expect(api.getAnalises).toHaveBeenLastCalledWith(expect.objectContaining({busca:undefined})));
});
