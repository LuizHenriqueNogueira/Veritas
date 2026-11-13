import {sqliteDb} from '../database/sqlite.js';
import {pool} from '../database/db.js';
import {Feedback} from '../models/index.js';
import {IFeedbackRepository} from './interfaces.js';
const convert=(row:any):Feedback|null=>row?{...row,util:Boolean(row.util)}:null;
export class SqliteFeedbackRepository implements IFeedbackRepository {
  async find(id:number,user:number){return convert(sqliteDb.prepare('SELECT * FROM feedback WHERE analise_id=? AND usuario_id=?').get(id,user));}
  async save(id:number,user:number,util:boolean,comentario:string){
    const now=new Date().toISOString();
    sqliteDb.prepare(`INSERT INTO feedback(analise_id,usuario_id,util,comentario,data_criacao,data_atualizacao) VALUES(?,?,?,?,?,?)
      ON CONFLICT(analise_id) DO UPDATE SET util=excluded.util,comentario=excluded.comentario,data_atualizacao=excluded.data_atualizacao WHERE feedback.usuario_id=excluded.usuario_id`).run(id,user,util?1:0,comentario,now,now);
    return (await this.find(id,user))!;
  }
}
export class PostgresFeedbackRepository implements IFeedbackRepository {
  async find(id:number,user:number){return convert((await pool.query('SELECT * FROM feedback WHERE analise_id=$1 AND usuario_id=$2',[id,user])).rows[0]);}
  async save(id:number,user:number,util:boolean,comentario:string){const now=new Date().toISOString();return convert((await pool.query(`INSERT INTO feedback(analise_id,usuario_id,util,comentario,data_criacao,data_atualizacao) VALUES($1,$2,$3,$4,$5,$5) ON CONFLICT(analise_id) DO UPDATE SET util=excluded.util,comentario=excluded.comentario,data_atualizacao=excluded.data_atualizacao WHERE feedback.usuario_id=excluded.usuario_id RETURNING *`,[id,user,util,comentario,now])).rows[0])!;}
}
