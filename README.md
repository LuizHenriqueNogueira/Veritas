# Analisador IA - Veritas 🛡️

**Modelo de Documento e Implementação de Solução Computacional**  
**Turma:** GPE02M80044  
**Professor:** Ranyelson Neres Carvalho  
**Integrantes:** Juan Alberto Bezerra Jeronimo, Luiz Fernando da Silva Araújo, Luiz Henrique Nogueira de Moraes e Maria Eduarda Marques Silva.

---

## 1. Visão Geral do Projeto

O **Veritas** é um software para computador desenvolvido para auxiliar usuários na análise contextual de textos, capturas de tela e links provenientes de diferentes fontes digitais, identificando possíveis indícios de:
1. **Desinformação:** boatos, apelo emocional exagerado, manipulação retórica e ausência de fontes.
2. **Fraude Digital:** tentativas de golpe, phishing, falsa urgência financeira e engenharia social.
3. **Link Suspeito:** anomalias de domínio, IPs diretos, extensões de alto risco e ofuscação de destino.

O sistema dispõe ainda de uma ferramenta de **captura de tela com OCR integrado**, permitindo que textos presentes em imagens ou aplicações sem seleção direta sejam extraídos, revisados pelo usuário e analisados pelos agentes.

---

## 2. Estrutura do Repositório

```text
veritas/
├── package.json                   # Scripts globais de orquestração
├── README.md                      # Documentação técnica e guia de execução
├── backend/                       # Back-end REST API (Node.js, Express, TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── src/
│   │   ├── app.ts                 # Configuração do Express, middlewares e CORS
│   │   ├── server.ts              # Ponto de entrada do servidor HTTP (Porta 3001)
│   │   ├── config/
│   │   ├── database/
│   │   │   ├── db.ts              # Pool de conexão PostgreSQL
│   │   │   └── schema.sql         # Script DDL com tabelas, índices e carga inicial
│   │   ├── models/
│   │   │   └── index.ts           # Interfaces TypeScript (Usuario, Agente, Analise...)
│   │   ├── repositories/
│   │   │   ├── interfaces.ts      # Contratos dos repositórios
│   │   │   ├── memory.repository.ts # Repositórios em memória (testes unitários isolados)
│   │   │   ├── postgres.repository.ts # Repositórios PostgreSQL (produção)
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts    # Cadastro, login, bcrypt e JWT (RN01, RN02, RN03)
│   │   │   ├── ocr.service.ts     # ServicoCapturaOCR (RN10 a RN15)
│   │   │   ├── analise.service.ts # Orquestrador de análises e regras de negócio
│   │   │   └── agents/
│   │   │       ├── desinformacao.agent.ts # Agente de Desinformação
│   │   │       ├── fraude-digital.agent.ts # Agente de Fraude Digital
│   │   │       └── link-suspeito.agent.ts # Agente de Link Suspeito
│   │   ├── controllers/           # Camada de controle HTTP REST
│   │   ├── routes/                # Roteamento dos endpoints da API
│   │   ├── middlewares/           # Autenticação JWT e tratamento centralizado de erros
│   │   └── utils/                 # Validador sintático de URLs (RN09, RN16)
│   └── tests/
│       └── unit/                  # 22 Testes de unidade com 100% de sucesso
└── desktop/                       # Aplicação Desktop / Interface React
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── App.tsx                # Roteamento e orquestrador de estado do desktop
        ├── api.ts                 # Cliente HTTP conectado ao backend
        ├── styles.css             # Estilização visual (Telas 1 a 8 do documento)
        └── components/
            ├── Sidebar.tsx        # Navegação lateral e perfil do usuário
            ├── LoginView.tsx      # Tela 1: Login de Usuário
            ├── RegisterView.tsx   # Tela 2: Cadastro de Conta
            ├── NewAnalysisView.tsx# Tela 3: Tela Inicial / Nova Análise
            ├── CaptureOverlay.tsx # Tela 4: Captura de Região da Tela
            ├── OCRReviewView.tsx  # Tela 5: Confirmação e Edição do OCR
            ├── ProcessingView.tsx # Tela 6: Processamento da Análise
            ├── ResultView.tsx     # Tela 7: Resultado com Achados, Fontes e Feedback
            └── HistoryView.tsx    # Tela 8: Histórico Individual com Busca e Filtros
```

---

## 3. Instruções de Execução

### Pré-requisitos
- **Node.js**: v18+ (recomendado v20+ ou v24+)
- **NPM**: v9+
- **PostgreSQL**: (opcional para demonstração; o sistema possui fallback automático in-memory para execução imediata e testes).

### Passos para Instalação e Execução

1. **Instalar dependências do projeto:**
   ```bash
   npm --prefix backend install
   npm --prefix desktop install
   ```

2. **Executar a suíte de testes de unidade:**
   ```bash
   npm run test
   ```
   Para visualizar a cobertura detalhada de código:
   ```bash
   npm run test:coverage
   ```

3. **Iniciar o servidor Back-end (Porta 3001):**
   ```bash
   npm run dev:backend
   ```

4. **Iniciar a aplicação Desktop / Front-end (Porta 3000):**
   Em um segundo terminal:
   ```bash
   npm run dev:desktop
   ```
   Acesse a aplicação no navegador ou ambiente Electron em `http://localhost:3000`.

---

## 4. Banco de Dados e Script DDL
O script SQL completo está localizado em:
`backend/src/database/schema.sql`

Ele cria as 5 tabelas especificadas no projeto (`usuario`, `agente`, `analise`, `fonte`, `achado`), com chaves primárias, chaves estrangeiras, restrições UNIQUE e a carga inicial dos 3 agentes do sistema.
