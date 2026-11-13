import {it,expect,vi} from 'vitest';
import {api,setAuthToken,removeAuthToken} from '../src/api.js';

it('descarta resposta antiga mesmo quando o transporte ignora o cancelamento',async()=>{
  let finish!:(r:Response)=>void;vi.stubGlobal('fetch',vi.fn().mockReturnValue(new Promise(r=>finish=r)));
  setAuthToken('sessao-luiz');const pending=api.getAnaliseById(1);const rejected=expect(pending).rejects.toThrow('sessão foi alterada');
  await Promise.resolve();await Promise.resolve();removeAuthToken();setAuthToken('sessao-lucas');
  finish(new Response(JSON.stringify({usuario_id:1,fontes:[{titulo:'Fonte privada do Luiz'}]})));
  await rejected;
});
it('envia a credencial da conta atual e cancela requisições ao sair',async()=>{
  const request=vi.fn().mockResolvedValue(new Response(JSON.stringify([])));vi.stubGlobal('fetch',request);
  setAuthToken('sessao-lucas');await api.getAnalises();
  const options=request.mock.calls[0][1];expect(options.headers.Authorization).toBe('Bearer sessao-lucas');expect(options.signal.aborted).toBe(false);
  removeAuthToken();expect(options.signal.aborted).toBe(true);
});
