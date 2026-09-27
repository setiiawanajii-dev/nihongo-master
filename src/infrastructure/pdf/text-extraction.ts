import type { TextExtractionProvider } from '../../domain/extraction/provider';
import { loadPdf } from './document';
export const pdfTextProvider: TextExtractionProvider = {
  id: 'pdfjs-text-v1', kind: 'text',
  async open(blob) {
    const task=loadPdf(new Uint8Array(await blob.arrayBuffer()));
    try {
      const doc=await task.promise;
      return {totalPages:doc.numPages,close:()=>task.destroy(),async page(number){
        const page=await doc.getPage(number);
        try {
          const content=await page.getTextContent();
          const lines:{y:number;height:number;items:{x:number;width:number;text:string}[]}[]=[];
          for(const item of content.items){if(!('str' in item)||!item.str.trim())continue;
            const x=item.transform[4],y=item.transform[5],height=Math.max(1,item.height);
            let line=lines.find(l=>Math.abs(l.y-y)<Math.min(l.height,height)*0.3);
            if(!line){line={y,height,items:[]};lines.push(line);}line.items.push({x,width:item.width,text:item.str});
          }
          const text=lines.sort((a,b)=>b.y-a.y).map(line=>{
            const items=line.items.sort((a,b)=>a.x-b.x);
            return items.map((item,i)=>{const prev=items[i-1];const gap=prev?item.x-prev.x-prev.width:0;return (prev?(gap>line.height*1.2?'\t':gap>line.height*0.15?' ':''):'')+item.text;}).join('');
          }).join('\n');
          if(text.length>250_000)throw new Error('Teks halaman terlalu besar untuk diperiksa sekaligus. Gunakan PDF dengan halaman yang lebih kecil.');
          return {text};
        } finally {page.cleanup();}
      }};
    } catch(error){await task.destroy();throw error;}
  },
};
