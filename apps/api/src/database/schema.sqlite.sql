CREATE TABLE IF NOT EXISTS usuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      data_cadastro DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      tipo TEXT NOT NULL UNIQUE,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS analise (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      agente_id INTEGER NOT NULL,
      tipo_entrada TEXT NOT NULL,
      conteudo TEXT,
      url TEXT,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      classificacao TEXT,
      resultado TEXT,
      data_criacao DATETIME NOT NULL,
      data_conclusao DATETIME,
      FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
      FOREIGN KEY (agente_id) REFERENCES agente(id)
    );

    CREATE TABLE IF NOT EXISTS fonte (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analise_id INTEGER NOT NULL,
      titulo TEXT,
      url TEXT NOT NULL,
      dominio TEXT,
      avaliacao TEXT,
      acessado_em DATETIME NOT NULL,
      FOREIGN KEY (analise_id) REFERENCES analise(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS achado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analise_id INTEGER NOT NULL,
      categoria TEXT,
      descricao TEXT NOT NULL,
      nivel_relevancia TEXT NOT NULL,
      FOREIGN KEY (analise_id) REFERENCES analise(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_analise_user ON analise(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_analise_agente ON analise(agente_id);
    CREATE INDEX IF NOT EXISTS idx_fonte_analise ON fonte(analise_id);
    CREATE INDEX IF NOT EXISTS idx_achado_analise ON achado(analise_id);
