// Limita respostas de serviços externos, inclusive quando não há Content-Length.
export async function readLimited(response:Response,maxBytes:number):Promise<string> {
  if(Number(response.headers.get('content-length') || 0)>maxBytes) { await response.body?.cancel(); throw new Error('Resposta externa excede o limite.'); }
  if(!response.body) throw new Error('Serviço externo retornou resposta vazia.');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw new Error('Resposta externa excede o limite.');chunks.push(value);}
  } catch(err){await reader.cancel().catch(()=>undefined);throw err;} finally {reader.releaseLock();}
  return Buffer.concat(chunks).toString('utf8');
}
