import React from 'react';import {it,expect} from 'vitest';import {render,screen} from '@testing-library/react';
import {ResultView} from '../src/components/ResultView.js';
it.each([['Informação confirmada pelas fontes','baixo'],['Desinformação identificada','alto'],['Ainda não foi possível verificar','inconclusivo']])('exibe %s com o tom correspondente', (titulo,tom)=>{
  render(<ResultView analise={{agente:{tipo:'desinformacao',nome:'Desinformação'},conteudo:'Afirmação de teste',resultado:'Explicação',apresentacao:{veredito:{titulo,tom,descricao:'Descrição do veredito'},achados:[],referencias:[]}}} onNewAnalysis={()=>{}}/>);
  expect(screen.getByText(titulo).className).toBe('risk-badge '+tom);
});
