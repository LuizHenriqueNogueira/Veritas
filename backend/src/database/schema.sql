-- ========================================================
-- Analisador IA - Veritas
-- Script DDL de Criação do Banco de Dados PostgreSQL
-- Especificado na Seção 2.4 do Documento de Requisitos
-- ========================================================

-- Tabela: usuario (Seção 2.4.3)
CREATE TABLE IF NOT EXISTS usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: agente (Seção 2.4.3)
CREATE TABLE IF NOT EXISTS agente (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tabela: analise (Seção 2.4.3)
-- tipo_entrada: TEXTO, CAPTURA_OCR, URL
-- status: PENDENTE, PROCESSANDO, CONCLUIDA, ERRO, CANCELADA
CREATE TABLE IF NOT EXISTS analise (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    agente_id INTEGER NOT NULL REFERENCES agente(id),
    tipo_entrada VARCHAR(30) NOT NULL,
    conteudo TEXT,
    url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    classificacao VARCHAR(100),
    resultado TEXT,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP
);

-- Tabela: fonte (Seção 2.4.3)
CREATE TABLE IF NOT EXISTS fonte (
    id SERIAL PRIMARY KEY,
    analise_id INTEGER NOT NULL REFERENCES analise(id) ON DELETE CASCADE,
    titulo VARCHAR(255),
    url TEXT NOT NULL,
    dominio VARCHAR(255),
    avaliacao VARCHAR(100),
    acessado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: achado (Seção 2.4.3)
-- nivel_relevancia: BAIXO, MEDIO, ALTO
CREATE TABLE IF NOT EXISTS achado (
    id SERIAL PRIMARY KEY,
    analise_id INTEGER NOT NULL REFERENCES analise(id) ON DELETE CASCADE,
    categoria VARCHAR(100),
    descricao TEXT NOT NULL,
    nivel_relevancia VARCHAR(30) NOT NULL
);

-- ========================================================
-- Índices para otimização de consultas e regras de negócio
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_analise_usuario_id ON analise(usuario_id);
CREATE INDEX IF NOT EXISTS idx_analise_agente_id ON analise(agente_id);
CREATE INDEX IF NOT EXISTS idx_fonte_analise_id ON fonte(analise_id);
CREATE INDEX IF NOT EXISTS idx_achado_analise_id ON achado(analise_id);

-- ========================================================
-- Carga Inicial de Dados: Agentes Especializados (Seção 2.4.3)
-- ========================================================
INSERT INTO agente (id, nome, descricao, tipo, ativo) VALUES
(1, 'Desinformação', 'Analisa possíveis indícios de informações falsas, distorcidas, descontextualizadas ou não confirmadas.', 'desinformacao', TRUE),
(2, 'Fraude Digital', 'Analisa possíveis indícios de golpes, phishing e engenharia social.', 'fraude_digital', TRUE),
(3, 'Link Suspeito', 'Analisa URLs e domínios procurando possíveis indicadores de risco.', 'link_suspeito', TRUE)
ON CONFLICT (tipo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    ativo = EXCLUDED.ativo;
