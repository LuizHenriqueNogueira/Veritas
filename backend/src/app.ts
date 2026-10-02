import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rota raiz de boas-vindas
app.get('/', (_req, res) => {
  res.json({
    projeto: 'Analisador IA - Veritas',
    descricao: 'Serviço de análise contextual de desinformação, fraude digital e links suspeitos.',
    documentacao_api: '/api/health'
  });
});

// Rotas principais da API REST
app.use('/api', routes);

// Middleware de tratamento global de exceções
app.use(errorHandler);

export default app;
