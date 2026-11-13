# Arquitetura do Veritas

## Organização

`apps/api` concentra o serviço Express, sem dependência da interface. `routes` e `controllers` recebem e validam as solicitações; `services` executa os casos de uso; `repositories` isola o acesso ao SQLite; `models` define os contratos. Os testes ficam ao lado desse aplicativo, em `tests/unit` e `tests/integration`.

Os serviços são separados por responsabilidade:

- `analise.service.ts`: valida entrada e agente, registra a análise, coordena pesquisa, IA e reputação e salva fontes e achados do proprietário.
- `agents`: triagem local específica para os três tipos de análise.
- `research`: termos, descoberta de fontes, leitura protegida, pertinência e validação de citações.
- `ai`: instruções, chamada ao modelo, cache por usuário e controle persistente de consumo.
- `reputation`: consulta Google e índices de URLs das fontes comunitárias. A chave do índice é SHA-256 da URL normalizada, preservando protocolo, caminho e query; uma ocorrência não condena automaticamente todo o domínio.
- `verdict.service.ts`: traduz os resultados para mensagens e cores entendíveis.
- `presentation.service.ts`: organiza evidências, contexto e limitações, incluindo leitura de registros antigos.

`apps/desktop/src` contém as telas e os componentes React. `api.ts` centraliza as requisições; `session.ts` cancela e invalida solicitações de uma sessão encerrada; `preferences.ts` mantém preferências por conta. O estado de uma conta é descartado na saída e a área autenticada é recriada ao mudar o usuário.

`apps/desktop/electron` tem módulos pequenos:

- `app.cjs`: ciclo de vida, janela principal, navegação externa e ícone da bandeja.
- `backend.cjs`: inicia e encerra o Node incluído no pacote, obtendo uma porta livre em loopback.
- `capture.cjs`: captura e seleção de região, mantendo o fluxo existente.
- `floating.cjs`: botão flutuante, posição, visibilidade e menu.
- `preload.cjs` e preloads específicos: apenas as operações IPC necessárias, com validação do remetente no processo principal.

## Fluxo de uma análise

Usuário autenticado > validação > registro com proprietário > pesquisa com escopo de usuário e conteúdo > IA quando permitida > verificações locais e de reputação > apresentação > persistência > histórico privado.

O coordenador analysis-jobs mantém solicitações por usuário e UUID. O cancelamento interrompe a orquestração e impede concluir a análise com resposta tardia. Chamadas externas já enviadas podem terminar e consumir cota. Sua resposta não pode ocupar a tela de outra conta: o transporte verifica a sessão antes e depois da resposta, e a interface também invalida as operações de navegação e análise.

O cache de pesquisa usa usuário, conteúdo completo, consulta e agente. O cache de IA também inclui o usuário, conteúdo e evidências. As listas de reputação são públicas e compartilhadas pela instalação; não contêm histórico de análises de usuários.

## Compatibilidade

A organização das pastas preserva os caminhos internos das camadas do backend e os contratos do banco. A versão 1.6.0 mantém os registros e aplica uma migração aditiva para contexto, lixeira e feedback. O banco legado preenchido recebe um backup consistente antes da migração. As mensagens de registros antigos são traduzidas ao abrir o detalhe. Configuração privada pode continuar apontando para o banco e para o contador da versão anterior.

O contador de IA continua comum à instalação. Criar outra conta ou reiniciar o executável não concede uma nova cota.

## Histórico, feedback e evolução do banco

history.service.ts concentra autorização por proprietário, lixeira, restauração e validação do feedback. A tabela feedback tem uma linha por análise; PUT edita a avaliação existente. A exclusão é lógica em analise.excluida_em. Detalhe e avaliação de uma pesquisa excluída ficam indisponíveis até restaurar. Fontes e achados são conservados.

database/migrations.ts aplica migrações em transação e registra versões em schema_migration. A primeira inclui contexto, excluida_em e feedback. database/sqlite.ts prepara o esquema base, cria backup se o banco antigo tem análises e aplica a migração idempotente. migrations-postgres.sql é uma alternativa manual para PostgreSQL, não usada nem validada na distribuição SQLite.

NewAnalysisView envia URL, contexto e termos como dados separados. O backend mantém a URL original na reputação e inclui contexto apenas na entrada contextual da IA e na geração da consulta de fontes. FeedbackCard e HistoryView acessam rotas autenticadas. O rascunho fica em memória e é limpo ao sair da conta.
