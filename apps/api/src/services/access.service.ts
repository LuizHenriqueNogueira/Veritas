import {Usuario} from '../models/index.js';
export type Perfil='ADMIN'|'USUARIO';
// A permissão é definida pela instalação e conferida no cadastro atual, não no JWT.
export function perfilDoUsuario(usuario:Pick<Usuario,'id'|'email'>):Perfil {
  const id=Number(process.env.ADMIN_USER_ID);
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Number.isSafeInteger(id) && id>0 && usuario.id===id && !!email && usuario.email.trim().toLowerCase()===email?'ADMIN':'USUARIO';
}
