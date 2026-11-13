# Veritas

Aplicativo acadêmico para avaliar indícios de desinformação, fraude digital e links suspeitos. Combina regras locais, pesquisa de fontes, um modelo via Groq e bases públicas de reputação. Versão 1.6.0.

## Instalar pelo GitHub

Este repositório contém o código-fonte da versão final 1.6.0. Use Node 22.13 ou superior e siga os comandos da seção Desenvolver e testar. Para obter a distribuição Windows a partir do código, execute `npm run build` e `npm run package:windows`. A pasta `release` é gerada localmente e não é versionada.

## Abrir o aplicativo no Windows

Abra `release/Veritas-Windows/Veritas.exe`. Mantenha a pasta inteira, incluindo `resources` e as DLLs. O pacote já leva o Node necessário ao backend e inicia o serviço em uma porta local livre. Não é necessário abrir terminais nem instalar Node para usar o executável.

A configuração particular desta instalação fica em `release/Veritas-Windows/config/.env`, fora do código do aplicativo. A cópia local preserva as chaves, os caminhos do histórico e o contador de consumo já utilizados. Esse arquivo não acompanha o ZIP para distribuição.

Sem configuração particular, a primeira abertura cria o modo local, sem chave de IA, com dados na pasta de usuário do Veritas. Configure os serviços externos no `.env` privado. Não publique chaves, banco de contas ou contador de consumo.

## Contexto, histórico e avaliação

Em Link Suspeito, informe a URL e, se desejar, abra Adicionar contexto da mensagem para explicar onde a recebeu e o que foi pedido. O contexto acompanha a URL na IA quando habilitada; as bases consultam somente a URL. Os termos opcionais personalizam a pesquisa de fontes. Para verificar uma notícia, use Desinformação com o texto da afirmação.

No Histórico, Excluir move a pesquisa para a lixeira após confirmação. Desfazer exclusão ou Ver lixeira > Restaurar recupera os registros. A exclusão é reversível.

No resultado concluído, Sim ou Não avalia a utilidade. Ao escolher Não, é obrigatório descrever o problema; a avaliação pode ser editada e fica salva no banco. Esse feedback não treina automaticamente a IA.

Durante o processamento, Cancelar análise e voltar interrompe a orquestração e preserva o rascunho durante a sessão. Chamadas externas já iniciadas podem consumir cota. O atalho Ctrl + Enter inicia uma análise.

## Botão flutuante

Depois de entrar na conta, use outro programa ou minimize o Veritas. Um pequeno escudo permite voltar ao aplicativo. Clique para abrir; arraste para reposicionar. O botão direito permite ocultá-lo ou encerrar o Veritas. A opção também fica em Configurações > Acesso rápido, separada por conta.

Fechar a janela encerra o aplicativo e seu backend. Minimizar mantém o acesso pelo botão flutuante e pelo ícone da bandeja. O botão é ocultado durante a captura de tela e na saída da conta.

## Estrutura do código

```text
Veritas-Final-v7/
  apps/
    api/         API, agentes, pesquisa, reputação, banco e testes
    desktop/     Interface React, integração Electron e testes da interface
  assets/        Ícone e índices públicos de reputação por hash
  docs/          Arquitetura, configuração e relatório das alterações
  scripts/       Preparação, verificação de serviços e empacotamento
  release/       Pacote Windows gerado, separado do código
  package.json   Comandos principais
```

Veja `docs/ARQUITETURA.md` para o mapa dos módulos. Dependências, cobertura, resultados de build, bancos de usuários e configurações pessoais ficam fora do Git. A versão atual substitui as antigas pastas `backend` e `desktop` pela organização em `apps/api` e `apps/desktop`.

## Desenvolver e testar

Requer Node 22.13 ou superior. Na raiz:

```sh
npm ci
npm run setup
npm run dev
```

O modelo `apps/api/.env.example` não contém credenciais. Execute `npm run setup` para criar `apps/api/.env` com um segredo JWT exclusivo. Nesse arquivo local, configure `AI_PROVIDER=groq` e `GROQ_API_KEY` para usar sua chave privada. O Google Safe Browsing usa `SAFE_BROWSING_API_KEY` no mesmo arquivo privado. No executável Windows, a configuração fica em `config/.env` ao lado de `Veritas.exe`. Depois de trocar uma chave, feche e reabra o Veritas para que o serviço leia a configuração atualizada. Não publique arquivos `.env`, chaves ou pacotes contendo essas credenciais. Os limites de consumo e os bancos locais devem ser preservados durante a troca da chave. Para executar a versão compilada pelo código:

```sh
npm run build
npm start
```

Verificações:

```sh
npm test
npm run test:desktop
npm run test:coverage
```

Empacotamento no Windows, após compilar:

```sh
npm run package:windows
```

O empacotador usa o Electron instalado e inclui o Node que executou o comando. Use uma versão compatível com `node:sqlite`. As chaves e bancos não são incorporados ao pacote. O executável recebe nome, versão e ícone próprios.

## Resultados e limites

Informação confirmada aparece em verde quando as citações lidas satisfazem os critérios da checagem. Desinformação identificada aparece em vermelho. Informação enganosa ou fora de contexto recebe atenção. Falta de evidências e consultas parciais ficam neutras.

Em fraude e links, verde significa que as verificações não identificaram sinais relevantes; não certifica remetentes ou sites. Um registro positivo nas bases e sinais estruturais relevantes prevalecem sobre uma avaliação de baixo risco da linguagem.

Os links são consultados em OpenPhish, Phishing.Database e, quando configurado, Google Safe Browsing. A URL suspeita não é aberta. As fontes comunitárias não cobrem toda a internet e podem conter falsos positivos. A versão distribui índices de URLs por hash, preservando o momento em que foram obtidos, e tenta atualizá-los após 12 horas. A base completa exige um download maior na atualização.

Os limites persistentes de IA continuam ativos. Separar cache por conta não separa nem reinicia as cotas da instalação. Não apague `ai-usage.db` para liberar chamadas.

O OCR usa Tesseract local, com revisão antes do envio à análise. A imagem não é gravada pelo serviço de OCR. O texto confirmado pode ser enviado aos serviços habilitados.

## Fontes de reputação e licenças

- [OpenPhish Community](https://github.com/openphish/public_feed): uso acadêmico não comercial, sujeito aos termos da fonte.
- [Phishing.Database](https://github.com/Phishing-Database/Phishing.Database): fonte adicional; licença MIT indicada no projeto.
- [Google Safe Browsing](https://developers.google.com/safe-browsing/v4/lookup-api): consulta opcional com chave particular.
- [Distribuição Electron](https://www.electronjs.org/docs/latest/tutorial/application-distribution): pacote Windows com runtime e ícone próprios.

Resultados de teste e limitações conhecidas estão em `docs/ALTERACOES_E_TESTES.md`.
