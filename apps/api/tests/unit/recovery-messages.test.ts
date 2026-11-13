import {it,expect} from 'vitest';
import {mensagemLimiteIA} from '../../src/services/presentation.service.js';
it('ER01: orienta reduzir texto, aguardar minuto ou janela diária conforme a causa real',()=>{
 expect(mensagemLimiteIA('Texto e resposta reservada excedem o orçamento por minuto. Reduza o texto antes de analisar.')).toContain('Reduza');
 expect(mensagemLimiteIA('Orçamento por minuto reservado. Aguarde 60 segundos antes de outra análise.')).toContain('60 segundos');
 expect(mensagemLimiteIA('Limite diário local de chamadas de IA atingido. Aguarde a janela móvel de 24 horas.')).toContain('24 horas');
});
it('ER02: diferencia configuração, conexão e relógio, sem expor detalhes técnicos',()=>{
 expect(mensagemLimiteIA('GROQ_API_KEY não configurada no backend/.env.')).toContain('administrador');
 expect(mensagemLimiteIA('fetch failed ENOTFOUND')).toContain('conexão');
 expect(mensagemLimiteIA('Relógio retrocedeu. Corrija a data antes de usar a IA.')).toContain('hora do computador');
 expect(mensagemLimiteIA('PROVEDOR_TECNICO')).not.toContain('PROVEDOR_TECNICO');
});
