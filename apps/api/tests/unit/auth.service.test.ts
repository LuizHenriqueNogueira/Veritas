import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.service.js';
import { MemoryUsuarioRepository } from '../../src/repositories/memory.repository.js';

describe('AuthService - Testes de Unidade (TU01 - TU04)', () => {
  let usuarioRepo: MemoryUsuarioRepository;
  let authService: AuthService;

  beforeEach(() => {
    usuarioRepo = new MemoryUsuarioRepository();
    authService = new AuthService(usuarioRepo);
  });

  // TU01: Cadastro de usuário com dados válidos e hash seguro de senha
  it('TU01: Deve cadastrar um novo usuário gerando hash da senha e token JWT (RN01, RN02)', async () => {
    const payload = {
      nome: 'Maria Silva',
      email: 'maria.silva@exemplo.com',
      senha: 'SenhaSegura@123'
    };

    const resposta = await authService.register(payload);

    expect(resposta).toHaveProperty('token');
    expect(resposta.usuario.email).toBe('maria.silva@exemplo.com');
    expect(resposta.usuario.nome).toBe('Maria Silva');

    // Validação no repositório: a senha não pode estar em texto puro (RN02)
    const usuarioNoBanco = await usuarioRepo.findByEmail('maria.silva@exemplo.com');
    expect(usuarioNoBanco).not.toBeNull();
    expect(usuarioNoBanco!.senha_hash).not.toBe(payload.senha);
    expect(usuarioNoBanco!.senha_hash.startsWith('$2')).toBe(true); // Hash bcrypt
  });

  // TU02: Tentativa de cadastro com e-mail duplicado
  it('TU02: Deve rejeitar o cadastro caso o e-mail já esteja em uso por outro usuário (RN01)', async () => {
    await authService.register({
      nome: 'Primeiro Usuario',
      email: 'duplicado@exemplo.com',
      senha: 'SenhaValida123'
    });

    await expect(
      authService.register({
        nome: 'Segundo Usuario',
        email: 'duplicado@exemplo.com',
        senha: 'OutraSenha456'
      })
    ).rejects.toThrow('Já existe um usuário cadastrado com este endereço de e-mail.');
  });

  // TU03: Autenticação com senha incorreta
  it('TU03: Deve rejeitar login quando a senha fornecida for incorreta (RN02, RN03)', async () => {
    await authService.register({
      nome: 'Carlos Santos',
      email: 'carlos@exemplo.com',
      senha: 'SenhaCorreta123'
    });

    await expect(
      authService.login({
        email: 'carlos@exemplo.com',
        senha: 'SenhaIncorretaErrada'
      })
    ).rejects.toThrow('Credenciais inválidas. Verifique seu e-mail e senha.');
  });

  // TU04: Autenticação bem-sucedida
  it('TU04: Deve autenticar usuário com credenciais válidas e retornar token decodificável (RN03)', async () => {
    await authService.register({
      nome: 'Ana Paula',
      email: 'ana@exemplo.com',
      senha: 'SenhaValida123'
    });

    const loginRes = await authService.login({
      email: 'ana@exemplo.com',
      senha: 'SenhaValida123'
    });

    expect(loginRes).toHaveProperty('token');
    const decodificado = authService.verifyToken(loginRes.token);
    expect(decodificado.email).toBe('ana@exemplo.com');
    expect(decodificado.userId).toBe(loginRes.usuario.id);
  });
});
