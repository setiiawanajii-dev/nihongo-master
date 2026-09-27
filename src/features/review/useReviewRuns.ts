import { useCallback,useEffect,useRef,useState } from 'react';
import type { ReviewRun } from '../../domain/models';
import { database } from '../../services/database';
export function useReviewRuns(){
 const [runs,setRuns]=useState<ReviewRun[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');const generation=useRef(0);
 const reload=useCallback(async()=>{const ticket=++generation.current;try{await database.initialize();const rows=await database.reviewRuns.list();if(ticket===generation.current){setRuns(rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));setError('');}}catch(e){if(ticket===generation.current)setError(e instanceof Error?e.message:'Sesi review gagal dimuat.');}finally{if(ticket===generation.current)setLoading(false);}},[]);
 useEffect(()=>{void reload();const update=()=>{void reload();};window.addEventListener('focus',update);return()=>{generation.current++;window.removeEventListener('focus',update);};},[reload]);
 return {runs,loading,error,reload};
}
