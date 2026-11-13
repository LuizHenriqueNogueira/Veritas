export function integerEnv(name:string, fallback:number, min:number, max:number):number {
  const raw=process.env[name];
  if(raw===undefined || raw.trim()==='') return fallback;
  const n=Number(raw); return Number.isInteger(n) && n>=min && n<=max ? n : fallback;
}
export function configuracaoIA() {
  // A presença de uma chave não autoriza ativar chamadas que podem gerar cobrança.
  const provider=process.env.AI_PROVIDER?.trim() || 'local';
  const model=provider==='groq' ? (process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b') : provider==='gemini' ? (process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash') : null;
  const configured=provider==='local' || provider==='groq' && Boolean(process.env.GROQ_API_KEY?.trim()) || provider==='gemini' && Boolean(process.env.GEMINI_API_KEY?.trim());
  return {provider,model,configured,externalResearch:process.env.FACTCHECK_ENABLED!=='false',freeProtection:true,
    maxOutputTokens:Math.min(integerEnv('AI_MAX_OUTPUT_TOKENS',1800,256,4000),1800),
    dailyRequestLimit:Math.min(integerEnv('AI_DAILY_REQUEST_LIMIT',40,1,10000),40),
    linkUsesAI:process.env.LINK_USE_AI==='true'};
}
