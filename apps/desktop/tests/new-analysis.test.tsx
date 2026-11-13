import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {NewAnalysisView} from '../src/components/NewAnalysisView.js';
it('UN01: link e contexto acompanham os termos, sem mandar texto de outro agente',()=>{
 const start=vi.fn();render(<NewAnalysisView onStartAnalysis={start} onOpenCapture={vi.fn()}/>);fireEvent.change(screen.getByLabelText(/Texto para analisar/),{target:{value:'Texto anterior de notícia'}});fireEvent.click(screen.getByRole('radio',{name:/Link Suspeito/}));expect(screen.queryByLabelText(/Texto para analisar/)).toBeNull();fireEvent.change(screen.getByLabelText(/Link para verificar/),{target:{value:'https://example.com/conta'}});fireEvent.click(screen.getByText(/Adicionar contexto da mensagem/));fireEvent.change(screen.getByLabelText(/Onde você recebeu/),{target:{value:'Recebi pedido de senha por SMS.'}});fireEvent.click(screen.getByText(/Personalizar a pesquisa/));fireEvent.change(screen.getByLabelText('Termos de pesquisa'),{target:{value:'golpe de SMS'}});fireEvent.click(screen.getByRole('button',{name:'Analisar agora'}));expect(start).toHaveBeenCalledWith({tipo_entrada:'URL',agente_tipo:'link_suspeito',url:'https://example.com/conta',contexto:'Recebi pedido de senha por SMS.',termos_busca:'golpe de SMS'});
});
it('UN02: entrada vazia ou URL inválida recebe erro e foco sem iniciar análise',()=>{
 const start=vi.fn();render(<NewAnalysisView defaultAgent="link_suspeito" onStartAnalysis={start} onOpenCapture={vi.fn()}/>);fireEvent.change(screen.getByLabelText(/Link para verificar/),{target:{value:'site sem protocolo'}});fireEvent.click(screen.getByRole('button',{name:'Analisar agora'}));expect(screen.getByRole('alert').textContent).toContain('https://');expect(document.activeElement).toBe(screen.getByLabelText(/Link para verificar/));expect(start).not.toHaveBeenCalled();
});
it('UN03: rascunho restaura os campos e Ctrl Enter inicia com os mesmos dados',()=>{
 const start=vi.fn(),change=vi.fn();render(<NewAnalysisView initialDraft={{agenteTipo:'fraude_digital',texto:'Mensagem de cobrança',url:'',contexto:'',termosBusca:''}} onDraftChange={change} onStartAnalysis={start} onOpenCapture={vi.fn()}/>);const text=screen.getByLabelText(/Texto para analisar/);expect((text as HTMLTextAreaElement).value).toBe('Mensagem de cobrança');fireEvent.keyDown(text,{key:'Enter',ctrlKey:true});expect(start).toHaveBeenCalledWith({tipo_entrada:'TEXTO',agente_tipo:'fraude_digital',conteudo:'Mensagem de cobrança'});expect(change).toHaveBeenCalledWith(expect.objectContaining({texto:'Mensagem de cobrança'}));
});
it.each(['Desinformação','Fraude Digital'])('UN04: %s envia o endereço no modo de leitura da página',name=>{
 const start=vi.fn();render(<NewAnalysisView onStartAnalysis={start} onOpenCapture={vi.fn()}/>);
 fireEvent.click(screen.getByRole('radio',{name:new RegExp(name)}));fireEvent.click(screen.getByRole('button',{name:'Link da página'}));
 fireEvent.change(screen.getByLabelText(/Endereço da página/),{target:{value:'https://example.com/noticia'}});
 fireEvent.click(screen.getByRole('button',{name:'Analisar agora'}));
 expect(start).toHaveBeenCalledWith({tipo_entrada:'URL',agente_tipo:name==='Desinformação'?'desinformacao':'fraude_digital',url:'https://example.com/noticia'});
});
it('UN05: um link sozinho no campo de texto é enviado para leitura, em vez de julgar a string',()=>{
 const start=vi.fn();render(<NewAnalysisView onStartAnalysis={start} onOpenCapture={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText(/Texto para analisar/),{target:{value:'https://example.com/noticia'}});fireEvent.click(screen.getByRole('button',{name:'Analisar agora'}));
 expect(start).toHaveBeenCalledWith({tipo_entrada:'URL',agente_tipo:'desinformacao',url:'https://example.com/noticia'});
});
it('UN06: página HTTP é recusada antes de enviar e o modo volta pelo rascunho',()=>{
 const start=vi.fn();render(<NewAnalysisView initialDraft={{agenteTipo:'fraude_digital',texto:'',url:'http://example.com/noticia',contexto:'',termosBusca:'',modo:'pagina'}} onStartAnalysis={start} onOpenCapture={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Link da página'}).getAttribute('aria-pressed')).toBe('true');fireEvent.click(screen.getByRole('button',{name:'Analisar agora'}));expect(start).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toContain('HTTPS'.toLowerCase());
});
