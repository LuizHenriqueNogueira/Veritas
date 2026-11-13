// Verificação opcional: baixa apenas o feed oficial, nunca abre URLs nele listadas.
const path = require('node:path');
const fs = require('node:fs');
const { ReputationService, OPENPHISH_FEED } = require('../dist/services/reputation/reputation.service.js');
async function main() {
  process.env.REPUTATION_ENABLED = 'true';
  process.env.SAFE_BROWSING_API_KEY = '';
  let sample;
  let requests = 0;
  const request = async (...args) => {
    if (args[0] !== OPENPHISH_FEED) throw new Error('Destino inesperado.');
    requests++;
    const response = await fetch(...args);
    if (response.ok) sample = (await response.clone().text()).split(/\r?\n/).find(line => /^https?:\/\//.test(line));
    return response;
  };
  const cache = path.resolve(process.env.SMOKE_DATA_DIR || '../data-smoke', 'reputation.json');
  const service = new ReputationService(request, cache);
  const normal = await service.consultar('https://example.com/');
  if (!sample) {
    // Uma execução anterior pode ter criado o cache; sem conteúdo do feed não há amostra.
    throw new Error('Amostra não recebida da rede. Use um diretório SMOKE_DATA_DIR novo para este teste opcional.');
  }
  const known = await service.consultar(sample);
  if (!known.listado || normal.listado) throw new Error('Resultado de reputação inesperado.');
  const summary = {checkedAt: new Date().toISOString(), requests, entries: service.status().openphish.entries,
    knownFeedEntryDetected: known.listado, exampleDomainMatched: normal.listado, suspectSitesVisited: 0};
  if (process.env.SMOKE_REPORT_PATH) fs.writeFileSync(process.env.SMOKE_REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
}
main().catch(error => { console.error(error.message); process.exit(1); });
