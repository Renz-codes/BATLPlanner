'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Store } from '@tauri-apps/api/store';

// コンテキストを作成
const TLNameContext = createContext();

export function TLNameProvider({ children }) {
  const [currentTLName, setCurrentTLName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // マウント時にStoreからTL名を取得
  useEffect(() => {
    const loadTLName = async () => {
      try {
        const store = new Store('.tlplanner-state.dat');
        const savedTLName = await store.get('current_tlname');
        if (savedTLName) {
          setCurrentTLName(savedTLName);
        }
      } catch (error) {
        console.error('TL名の読み込みエラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTLName();
  }, []);

  // TL名を設定する関数
  const setTLName = async (name) => {
    try {
      const store = new Store('.tlplanner-state.dat');
      await store.set('current_tlname', name);
      setCurrentTLName(name);
    } catch (error) {
      console.error('TL名の保存エラー:', error);
    }
  };

  return (
    <TLNameContext.Provider value={{ currentTLName, setTLName, isLoading }}>
      {children}
    </TLNameContext.Provider>
  );
}

// カスタムフック
export function useTLName() {
  return useContext(TLNameContext);
} 