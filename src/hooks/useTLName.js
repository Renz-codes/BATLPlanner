'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useTLName() {
  const [tlname, setTlname] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // コンポーネントマウント時にTL名を取得
  useEffect(() => {
    const fetchTLName = async () => {
      try {
        const currentTL = await invoke('get_current_tl');
        setTlname(currentTL);
      } catch (error) {
        console.error('TL名取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTLName();
  }, []);

  // TL名を設定する関数
  const setTLName = async (name) => {
    try {
      await invoke('set_current_tl', { tlname: name });
      setTlname(name);
    } catch (error) {
      console.error('TL名設定エラー:', error);
    }
  };

  return { tlname, setTLName, isLoading };
} 