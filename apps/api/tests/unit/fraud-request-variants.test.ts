import {it,expect} from 'vitest';
import {FraudeDigitalAgent} from '../../src/services/agents/fraude-digital.agent.js';
it('FR01: reconhece variações explícitas de pedido de senha e token combinadas à ameaça',async()=>{
 const agent=new FraudeDigitalAgent();for(const action of ['informe sua senha','envie sua senha','envie seu token']){const r=await agent.analisar(`Sua conta será bloqueada. ${action} agora.`);expect(r.classificacao).toContain('Alto risco');expect(r.achados.some(a=>a.categoria.includes('Coleta de Informações'))).toBe(true);}
});
