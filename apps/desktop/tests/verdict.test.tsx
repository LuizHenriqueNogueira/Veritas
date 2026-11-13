import React from 'react';import {it,expect} from 'vitest';import {render,screen} from '@testing-library/react';
import {ResultView} from '../src/components/ResultView.js';
it('mostra o recorte recebido e mantém o endereço da página no resultado',()=>{
 render(<ResultView analise={{tipo_entrada:'URL',url:'https://example.com/noticia',conteudo:'Trecho lido da reportagem.',agente:{tipo:'desinformacao',nome:'Desinformação'},resultado:'Parecer de teste',apresentacao:{achados:[],referencias:[]}}} onNewAnalysis={()=>{}}/>);
 expect(screen.getByRole('heading',{name:'Conteúdo lido da página'})).toBeTruthy();expect(screen.getByText('Trecho lido da reportagem.')).toBeTruthy();expect(screen.getByText(/https:\/\/example.com\/noticia/)).toBeTruthy();
});
it.each([['Informação confirmada pelas fontes','baixo'],['Desinformação identificada','alto'],['Ainda não foi possível verificar','inconclusivo']])('exibe %s com o tom correspondente', (titulo,tom)=>{
  render(<ResultView analise={{agente:{tipo:'desinformacao',nome:'Desinformação'},conteudo:'Afirmação de teste',resultado:'Explicação',apresentacao:{veredito:{titulo,tom,descricao:'Descrição do veredito'},achados:[],referencias:[]}}} onNewAnalysis={()=>{}}/>);
  expect(screen.getByText(titulo).className).toBe('risk-badge '+tom);
});
