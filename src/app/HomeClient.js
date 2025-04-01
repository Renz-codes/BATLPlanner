'use client';
import Image from "next/image";
import { CreateNewTLButton, ReferTLButton, DeleteTLButton } from "../components/ModalButtons.js";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { toast, Toaster } from 'react-hot-toast';

export default function HomeClient() {
  const [oldTLs, setOldTLs] = useState([]);
  const [tlNames, setTlNames] = useState([]);

  // TL名一覧を取得
  useEffect(() => {
    const fetchTLs = async () => {
      try {
        const tls = await invoke("get_tl_names");
        setOldTLs(tls);
        
        // 削除用にプレフィックスを削除したTL名も保存
        const cleanedNames = tls.map(name => name.replace(/^TL:\s*/, ''));
        setTlNames(cleanedNames);
      } catch (error) {
        console.error('TL名取得エラー:', error);
        toast.error('TL名を取得できませんでした(´；ω；`)');
      }
    };
    fetchTLs();
  }, []);
  
  // 削除成功時のコールバック
  const handleDeleteSuccess = (deletedTlName) => {
    // 成功したらリストから削除して表示を更新
    const updatedCleanNames = tlNames.filter(name => name !== deletedTlName);
    setTlNames(updatedCleanNames);
    
    // 元のリストも更新
    const updatedOldTLs = oldTLs.filter(name => !name.endsWith(deletedTlName));
    setOldTLs(updatedOldTLs);
  };

  return (
    <div className="grid min-h-screen place-items-center p-8 pb-20 font-geist-sans">
      <Toaster position="top-right" />
      <main className="flex flex-col items-center gap-8">
        <Image
          src="/TLPlanner_ba-style@nulla.top.png"
          alt="TL Planner Logo"
          width={540}
          height={114}
          priority
          className="dark:invert"
        />

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <CreateNewTLButton />
          <ReferTLButton options={oldTLs} />
          <DeleteTLButton tlNames={tlNames} onDeleteSuccess={handleDeleteSuccess} />
        </div>
      </main>
    </div>
  );
} 