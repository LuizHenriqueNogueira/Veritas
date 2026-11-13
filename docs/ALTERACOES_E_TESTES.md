# Veritas 1.6.0 — alterações e testes

Avaliação realizada em 7 de novembro de 2026 no Windows, com Node 24 e SQLite. A versão 1.5.0 foi preservada na pasta anterior. Os testes usam contas e bancos fictícios; o contador de IA da instalação de uso não foi alterado.

## Funcionamento dos campos

| Campo | Função |
| --- | --- |
| Link para verificar | Obrigatório em Link Suspeito. É a URL exata consultada nas bases e nas regras de estrutura. |
| Contexto da mensagem | Opcional, até 2.000 caracteres. Explica onde o link chegou e o que foi pedido. Acompanha a URL na IA quando habilitada; não é enviado como alvo às bases de reputação. |
| Termos de pesquisa | Opcional, até 100 caracteres. Orienta a pesquisa de fontes; a busca de links permanece ancorada ao domínio informado. Não modifica o endereço verificado. |
| Texto para analisar | Usado em Desinformação e Fraude Digital. Para verificar o que uma notícia afirma, cole seu texto e escolha Desinformação. |

Na versão anterior, preencher o link fazia o texto geral ser ignorado. Agora o campo é explicitamente contexto e os dados são integrados na solicitação da IA. Se a IA estiver desativada ou indisponível, o contexto continua registrado, mas as regras locais e as bases verificam somente a URL; a tela não deve sugerir que houve interpretação por IA nesse caso.

## Histórico e feedback

No Histórico, Excluir pede confirmação e move a pesquisa para a lixeira. Desfazer exclusão ou Ver lixeira > Restaurar recupera a pesquisa, suas fontes, achados e feedback. É uma exclusão lógica e reversível; os registros não são apagados definitivamente do banco. Pesquisas em andamento precisam ser canceladas ou concluídas antes.

Toda análise concluída oferece Esta análise ajudou você? Sim salva uma avaliação positiva. Não atendeu abre um comentário obrigatório de 5 a 1.000 caracteres. O comentário e a avaliação ficam associados à pesquisa e ao proprietário, podem ser editados e sobrevivem à reinicialização. Editar não cria avaliações duplicadas. Falha no envio mantém o texto para nova tentativa. O feedback não treina o modelo automaticamente.

## Banco e cancelamento

A migração SQLite 1, contexto_lixeira_feedback, é aditiva e versionada em schema_migration. Inclui contexto e excluida_em na análise e uma tabela feedback, com uma avaliação por pesquisa. Em um banco já preenchido, a atualização cria antes uma cópia SQLite consistente em backups/antes-v1.6-*.db, ao lado do banco. O histórico e o contador de consumo mantêm os caminhos privados anteriores. O teste MG01 verifica banco legado, backup, execução repetida da migração e recuperação dos dados em outro processo.

Cancelar análise e voltar solicita cancelamento no servidor, conserva o rascunho durante a sessão e impede publicar o parecer atrasado. Sair da conta também cancela e limpa o rascunho. Chamadas externas já enviadas podem terminar e consumir a reserva de cota; cancelamento não reinicia nem devolve artificialmente o contador. Falha ao confirmar o cancelamento é informada e orienta conferir o histórico. Testes cobrem cancelamento durante pesquisa, durante IA, antes do POST, após conclusão e por outra conta.

## Resultados da execução final

| Grupo | Resultado |
| --- | --- |
| Backend — unidade | 150 aprovados |
| Backend — integração | 35 aprovados |
| Interface e sessão | 21 aprovados |
| Total automatizado | 206 aprovados; zero reprovados ou ignorados |
| Caixa-preta via HTTP do executável | 18 de 18 aprovados |
| Interações e inspeção da interface Windows | 11 cenários verificados |
| Compilação e empacotamento | Aprovados |
| Código do ZIP em pasta nova | npm ci e build aprovados |

As contagens se referem a conjuntos distintos de execução, com cenários que podem se sobrepor. Não devem ser somadas para alegar cobertura de requisitos únicos. O OCR foi executado com Tesseract real, inclusive pelo serviço do executável. As integrações de IA, pesquisa e reputação possuem testes controlados, que simulam respostas e falhas. A rodada nativa desta versão usa IA local e serviços externos desativados, sem consumir tokens; não constitui nova validação da disponibilidade de Groq, Google ou portais na internet.

Cobertura instrumental do backend: 90.32% de instruções, 79.49% de ramificações, 90.13% de funções e 90.32% de linhas. Todos os testes executados passarem não equivale a 100% de cobertura ou ausência de defeitos.

## Caixa-preta do executável

| ID | Cenário | Situação |
| --- | --- | --- |
| CP01 | API do executável responde e solicita autenticação | Aprovado |
| CP02 | Cadastro e login de duas contas fictícias | Aprovado |
| CP03 | Rejeita texto vazio sem criar pesquisa | Aprovado |
| CP04 | Rejeita URL inválida | Aprovado |
| CP05 | Cria análise de fraude e apresenta sinais de risco | Aprovado |
| CP06 | HU20: resposta negativa exige explicação; comentário vazio é rejeitado | Aprovado |
| CP07 | HU20: salva avaliação negativa com comentário | Aprovado |
| CP08 | HU20: edição salva Sim sem duplicar comentário | Aprovado |
| CP09 | Outra conta não acessa o histórico, detalhe ou feedback | Aprovado |
| CP10 | Outra conta não exclui, restaura ou avalia pesquisa alheia | Aprovado |
| CP11 | Excluir move pesquisa para a lixeira | Aprovado |
| CP12 | Restaurar recupera pesquisa e feedback | Aprovado |
| CP13 | Busca e filtro do histórico permanecem funcionais | Aprovado |
| CP14 | URL e contexto ficam separados no resultado | Aprovado |
| CP15 | Rejeita contexto maior que o limite e comentário de tipo inválido | Aprovado |
| CP16 | Desinformação sem IA não inventa confirmação factual | Aprovado |
| CP17 | OCR real em português, sem armazenar imagem | Aprovado |
| CP18 | Cancelamento antes do início impede criar pesquisa | Aprovado |

A primeira rodada encontrou dois problemas: a regra local de fraude não reconhecia “informe sua senha”, e o detalhe de pesquisa alheia era recusado com HTTP 400 em vez de 403. Foram corrigidos, receberam regressão e os 18 casos foram repetidos com aprovação. A primeira execução permanece registrada em evidencias/primeira-rodada.json. A reprovação antiga da HU20 na versão 1.4.0 continua válida historicamente; o reteste da funcionalidade implementada na 1.6.0 está aprovado (HF02/HF03, UF01–UF05 e CP06–CP08).

## Inspeção pelas heurísticas de Nielsen

Método: inspeção técnica guiada por tarefas e evidências da interface e dos testes, baseada nas [dez heurísticas de Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/). “Sim” indica atendimento aos critérios descritos nos fluxos avaliados. Esta inspeção não é um estudo de usabilidade com participantes nem uma garantia da avaliação do professor. As pendências encontradas foram corrigidas e reavaliadas; não há itens parciais nesta matriz de escopo definido.

| Heurística | Atende? | Critério observado | Evidências |
| --- | --- | --- | --- |
| 1. Visibilidade do estado do sistema | Sim | Carregamento de histórico/feedback, salvamento e processamento possuem estado visível. | UH02; UF01; teste de cancelamento da interface; VU03/VU07 |
| 2. Correspondência com o mundo real | Sim | Rótulos em português distinguem URL, contexto e termos; achados de link e erros receberam linguagem direta. | UN01; ER01/ER02; VU01 |
| 3. Controle e liberdade | Sim | Cancelar interrompe a orquestração e descarta respostas tardias. Exclusão é confirmada e reversível; avaliação pode ser editada. | AC03–AC07; UF02; UH01/UH02; VU02–VU08 |
| 4. Consistência e padrões | Sim | Navegação, botões e formulários usam o mesmo padrão; campos e resultados acompanham os temas. | VU09/VU11; testes de formulário e histórico |
| 5. Prevenção de erros | Sim | URL e texto são validados; a escolha “Não” exige explicação; exclusão pede confirmação; autorizações são conferidas no servidor. | UN02; HF01/HF02/HF04/HF07; VU02/VU06 |
| 6. Reconhecimento em vez de memorização | Sim | Agentes exibem finalidade, campos têm orientação e rascunho é mantido durante a sessão. | UN01/UN03; VU01/VU10 |
| 7. Flexibilidade e eficiência | Sim | Ctrl + Enter envia a análise; pesquisa/filtro do histórico e edição de feedback evitam repetir o fluxo. | UN03; UH05; CP13; UF02 |
| 8. Design estético e minimalista | Sim | Contexto e pesquisa avançada são opcionais; dados do motor não aparecem para usuário comum; evidência neutra não vira sinal verde. | TP01–TP07; TA02/TA03; VU01/VU09 |
| 9. Diagnóstico e recuperação de erros | Sim | Erros de limite, configuração, conexão e relógio têm orientações distintas. Falhas de feedback mantêm o texto; restauração recupera exclusão. | ER01/ER02; UF03; UH04; VU04/VU06 |
| 10. Ajuda e documentação | Sim | Ajuda pesquisável inclui contexto, termos, feedback, lixeira, cancelamento e atalhos. | VU10; Ajuda com 20 orientações |

## Limites e reprodução

A análise ainda pode ser inconclusiva por falta de evidências ou serviços indisponíveis. Isso é o resultado esperado nesses cenários e não deve ser convertido artificialmente em “seguro” ou “verdadeiro” para aprovar um teste. As listas de reputação não abrangem toda a internet. PostgreSQL possui um script de atualização e adaptadores, mas o banco validado e utilizado nesta distribuição é SQLite.

Execute npm ci, npm run build, npm run test:coverage e npm run test:desktop. Os arquivos de teste e os registros da rodada estão no código entregue. O roteiro scripts/testar-executavel.cjs executa os 18 casos contra uma instância isolada: configure VERITAS_TEST_PROFILE para a pasta que contém o backend.log da instância, VERITAS_TEST_OUTPUT para um diretório de resultados e VERITAS_TEST_FIXTURE para o PNG de teste. Use uma configuração separada com AI_PROVIDER=local, FACTCHECK_ENABLED=false e REPUTATION_ENABLED=false. Nunca aponte esse roteiro ao banco pessoal; ele cria dados fictícios. O teste utiliza a API em loopback, exige uma instância já iniciada e não elimina dados reais.

As chaves ficam no arquivo privado config/.env da instalação local. Os ZIPs distribuíveis excluem chaves, histórico, senhas e sessões. As cotas existentes permanecem ativas.
