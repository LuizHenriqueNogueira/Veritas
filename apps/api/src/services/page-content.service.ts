import {PublicWeb,validatePublicUrl} from './research/public-web.js';
import {extractArticle} from './research/html.js';

export interface PageContent {url:string;title:string;content:string;partial:boolean;originalLength:number;}
export class PageContentService {
  constructor(private web:Pick<PublicWeb,'article'>=new PublicWeb()){}
  async ler(url:string):Promise<PageContent>{
    validatePublicUrl(url);
    const page=await this.web.article(url,undefined,8000000);
    const article=extractArticle(page.body,page.url,'');
    if(article.blocked || article.text.length<180)throw new Error('A página não disponibilizou texto suficiente para leitura.');
    // Um recorte explícito mantém o mesmo orçamento da IA, inclusive com fontes.
    const complete=[article.title,article.text].filter(Boolean).join('\n\n');
    let content='',bytes=0;
    for(const char of complete){const size=Buffer.byteLength(char,'utf8');if(bytes+size>900)break;content+=char;bytes+=size;}
    const partial=content.length<complete.length;
    if(partial){const end=Math.max(content.lastIndexOf('. '),content.lastIndexOf('\n'));if(end>content.length*.65)content=content.slice(0,end+1);}
    return {url:page.url,title:article.title,content:content.trim(),partial,originalLength:complete.length};
  }
}
export const pageContentService=new PageContentService();
