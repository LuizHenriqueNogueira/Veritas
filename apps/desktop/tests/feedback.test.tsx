import React from 'react';
import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {FeedbackCard} from '../src/components/FeedbackCard.js';
import {api} from '../src/api.js';
vi.mock('../src/api.js',()=>({api:{getFeedback:vi.fn(),saveFeedback:vi.fn()}}));
beforeEach(()=>{vi.clearAllMocks();vi.mocked(api.getFeedback).mockResolvedValue(null);vi.mocked(api.saveFeedback).mockImplementation(async(_id,body)=>body);});
it('UF01: Não abre comentário, bloqueia vazio e salva a descrição vinculada à pesquisa',async()=>{
 render(<FeedbackCard analysisId={7}/>);fireEvent.click(await screen.findByRole('radio',{name:'Não atendeu'}));const text=screen.getByLabelText(/O que faltou/);fireEvent.click(screen.getByRole('button',{name:'Enviar feedback'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('pelo menos 5'));expect(document.activeElement).toBe(text);expect(api.saveFeedback).not.toHaveBeenCalled();
 fireEvent.change(text,{target:{value:'  Faltou conferir a data.  '}});fireEvent.click(screen.getByRole('button',{name:'Enviar feedback'}));await screen.findByText('Faltou conferir a data.');expect(api.saveFeedback).toHaveBeenCalledWith(7,{util:false,comentario:'Faltou conferir a data.'});expect(screen.getByText(/Avaliação salva/)).toBeTruthy();
});
it('UF02: Sim não exige comentário e avaliação salva pode ser editada',async()=>{
 render(<FeedbackCard analysisId={8}/>);fireEvent.click(await screen.findByRole('radio',{name:'Sim, ajudou'}));expect(screen.queryByRole('textbox')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Enviar feedback'}));await screen.findByText(/Avaliação salva/);fireEvent.click(screen.getByRole('button',{name:'Editar avaliação'}));fireEvent.click(screen.getByRole('radio',{name:'Não atendeu'}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'A fonte não tratava da notícia.'}});fireEvent.click(screen.getByRole('button',{name:'Enviar feedback'}));await screen.findByText('A fonte não tratava da notícia.');expect(api.saveFeedback).toHaveBeenLastCalledWith(8,{util:false,comentario:'A fonte não tratava da notícia.'});
});
it('UF03: falha ao salvar preserva comentário e permite nova tentativa',async()=>{
 vi.mocked(api.saveFeedback).mockRejectedValueOnce(new Error('Conexão indisponível.'));render(<FeedbackCard analysisId={9}/>);fireEvent.click(await screen.findByRole('radio',{name:'Não atendeu'}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'A evidência estava desatualizada.'}});fireEvent.click(screen.getByRole('button',{name:'Enviar feedback'}));await screen.findByText('Conexão indisponível.');expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('A evidência estava desatualizada.');fireEvent.click(screen.getByRole('button',{name:'Enviar feedback'}));await screen.findByText(/Avaliação salva/);
});
it('UF04: feedback de pesquisa anterior não aparece ao mudar de análise',async()=>{
 let finish!:(v:any)=>void;vi.mocked(api.getFeedback).mockReturnValueOnce(new Promise(r=>finish=r));const view=render(<FeedbackCard analysisId={10}/>);view.rerender(<FeedbackCard analysisId={11}/>);await screen.findByRole('radio',{name:'Sim, ajudou'});finish({util:false,comentario:'Comentário da outra análise'});await waitFor(()=>expect(screen.queryByText('Comentário da outra análise')).toBeNull());expect(screen.getByRole('button',{name:'Enviar feedback'})).toHaveProperty('disabled',true);
});
it('UF05: mudar de Não para Sim não envia um comentário que ficou oculto',async()=>{
 render(<FeedbackCard analysisId={12}/>);fireEvent.click(await screen.findByRole('radio',{name:'Não atendeu'}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'Comentário ainda não enviado.'}});fireEvent.click(screen.getByRole('radio',{name:'Sim, ajudou'}));fireEvent.click(screen.getByRole('button',{name:'Enviar feedback'}));await screen.findByText(/Avaliação salva/);expect(api.saveFeedback).toHaveBeenCalledWith(12,{util:true,comentario:''});
});
