import {it,expect} from 'vitest';
import {vereditoPublico} from '../../src/services/verdict.service.js';
const sample=(tipo:string,classificacao:string,achados:any[]=[])=>({agente:{tipo},classificacao,achados}) as any;
it('informação corroborada recebe mensagem clara e sinal verde',()=>{expect(vereditoPublico(sample('desinformacao','Corroborada pelas fontes (baixo risco)'))).toMatchObject({titulo:'Informação confirmada pelas fontes',tom:'baixo'});});
it('afirmação contradita pelas fontes recebe desinformação em vermelho',()=>{expect(vereditoPublico(sample('desinformacao','Contradita pelas fontes (alto risco)'))).toMatchObject({titulo:'Desinformação identificada',tom:'alto'});});
it('evidência insuficiente e consulta parcial nunca recebem sinal verde',()=>{for(const c of ['Inconclusivo: evidências insuficientes','Sem registro nas fontes disponíveis: consulta parcial'])expect(vereditoPublico(sample('desinformacao',c)).tom).toBe('inconclusivo');});
it('mensagem sem sinais de fraude recebe resultado positivo limitado ao conteúdo',()=>{expect(vereditoPublico(sample('fraude_digital','Baixo risco aparente'))).toMatchObject({titulo:'Nenhum sinal de fraude identificado',tom:'baixo'});});
it('URL sem sinais e bases atuais recebe mensagem limitada, sem garantia de segurança',()=>{const r=vereditoPublico(sample('link_suspeito','Nenhum sinal de link suspeito identificado (baixo risco aparente)'));expect(r.tom).toBe('baixo');expect(r.descricao).toContain('não garante');});
it('falha da IA mantém a ausência de sinais neutra',()=>{expect(vereditoPublico(sample('fraude_digital','Baixo risco aparente',[{categoria:'Síntese de IA não executada'}])).tom).toBe('inconclusivo');});
