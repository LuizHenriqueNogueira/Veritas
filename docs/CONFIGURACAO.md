# Configuração privada

No código, a configuração fica em apps/api/.env. No executável, fica em config/.env ao lado de Veritas.exe. O exemplo apps/api/.env.example não possui chaves. Mantenha arquivos privados fora de repositórios e de ZIPs para distribuição.

## Serviços

- AI_PROVIDER=groq ativa o modelo configurado; AI_PROVIDER=local mantém somente as regras locais.
- GROQ_API_KEY recebe a chave privada e GROQ_MODEL seleciona o modelo permitido pela proteção da instalação.
- LINK_USE_AI=true habilita a síntese complementar para URLs; false mantém estrutura, bases e pesquisa sem chamar o modelo nesse agente.
- REPUTATION_ENABLED=true habilita as consultas. PHISHING_DATABASE_ENABLED=false desativa apenas a fonte adicional, se necessário.
- SAFE_BROWSING_API_KEY recebe a chave particular já habilitada para a API Google.
- FACTCHECK_ENABLED=true habilita a pesquisa e a leitura de fontes.

## Dados e limites

DATA_DIR, SQLITE_DB_PATH e AI_USAGE_DB_PATH podem apontar para os arquivos existentes. Não substitua o banco nem reinicie o contador ao atualizar a aplicação. OCR_LANG_PATH é opcional; os modelos de idioma também são distribuídos com o backend.

Os limites locais de IA permanecem em no máximo 40 chamadas e 40.000 tokens por janela móvel de 24 horas, com limites por minuto. Eles não verificam o faturamento da organização nem o uso de outros aplicativos. Não eleve limites para contornar uma recusa do provedor. O painel administrativo exibe uso e disponibilidade; não permite editar chaves.

ADMIN_USER_ID e ADMIN_EMAIL identificam juntos a conta administrativa existente. Novas contas comuns não recebem esse acesso automaticamente. No código, npm run admin:configurar ajuda a configurar uma conta já cadastrada.

No pacote sem configuração, o modo local e um segredo JWT aleatório são criados na primeira abertura. Para usar suas contas e histórico em outra máquina, faça uma migração particular dos dados e ajuste os caminhos; os ZIPs públicos não levam dados de usuários.

## Trocar uma chave exposta

Na conta Groq já existente, revogue a chave exposta e crie a substituta sem alterar o plano. Atualize somente `GROQ_API_KEY` no arquivo privado da instalação e mantenha `AI_PROVIDER=groq`. Preserve os demais campos, os bancos e o contador de consumo. Feche e reabra o Veritas e faça uma análise curta para conferir a integração. A chave nova não deve aparecer no `.env.example`, no GitHub ou no pacote público.
