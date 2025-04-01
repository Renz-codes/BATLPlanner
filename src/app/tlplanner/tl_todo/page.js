'use client';

import { useState, useEffect } from 'react';
import { useTLName } from '../../../hooks/useTLName';
import TlScreen from "./tlScreen";

export default function ExcelPage() {
  const { tlname, isLoading } = useTLName();
  const [isReady, setIsReady] = useState(false);
  
  // ページマウント完了後にコンポーネントを表示
  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1">
        <div className="p-4 overflow-x-auto">
          <div className="inline-block min-w-[1200px] bg-white rounded-lg shadow-lg p-4">
            {isReady ? <TlScreen tlname={tlname} /> : <div>読み込み中...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
  