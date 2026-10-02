// ========================================================
// Analisador IA - Veritas
// Serviço de Autenticação e Gestão de Usuários
// Atende a RN01, RN02, RN03, RNF08, RNF09
// ========================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUsuarioRepository } from '../repositories/interfaces.js';
import { Usuario, RegisterDTO, LoginDTO, AuthResponseDTO } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'veritas_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = '24h';
const BCRYPT_SALT_ROUNDS = 10;

export class AuthService {
  constructor(private usuarioRepo: IUsuarioRepository) {}

  /**
   * Realiza o cadastro de um novo usuário garantindo e-mail único e hash de senha.
   * Atende RN01 e RN02.
   */
  async register(data: RegisterDTO): Promise<AuthResponseDTO> {
    if (!data.nome || data.nome.trim().length < 2) {
      throw new Error('O nome deve possuir pelo menos 2 caracteres.');
    }

    if (!data.email || !this.validateEmail(data.email)) {
      throw new Error('Informe um endereço de e-mail válido.');
    }

    if (!data.senha || data.senha.length < 6) {
      throw new Error('A senha deve possuir no mínimo 6 caracteres.');
    }

    // RN01: Não poderão existir dois usuários cadastrados utilizando o mesmo endereço de e-mail.
    const existing = await this.usuarioRepo.findByEmail(data.email);
    if (existing) {
      throw new Error('Já existe um usuário cadastrado com este endereço de e-mail.');
    }

    // RN02: As senhas deverão ser armazenadas utilizando mecanismo seguro de hash e nunca em texto puro.
    const senhaHash = await bcrypt.hash(data.senha, BCRYPT_SALT_ROUNDS);

    const novoUsuario = await this.usuarioRepo.create({
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      senha_hash: senhaHash
    });

    const token = this.generateToken(novoUsuario);

    return {
      token,
      usuario: {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email
      }
    };
  }

  /**
   * Realiza a autenticação de usuário através de e-mail e senha.
   * Atende RN02 e RN03.
   */
  async login(data: LoginDTO): Promise<AuthResponseDTO> {
    if (!data.email || !data.senha) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    const usuario = await this.usuarioRepo.findByEmail(data.email);
    if (!usuario) {
      throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    const isPasswordValid = await bcrypt.compare(data.senha, usuario.senha_hash);
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    const token = this.generateToken(usuario);

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    };
  }

  /**
   * Valida e decodifica o token JWT de autenticação.
   * Atende RN03.
   */
  verifyToken(token: string): { userId: number; email: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      return decoded;
    } catch {
      throw new Error('Token de autenticação inválido ou expirado.');
    }
  }

  generateToken(usuario: Usuario): string {
    return jwt.sign(
      {
        userId: usuario.id,
        email: usuario.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
}
