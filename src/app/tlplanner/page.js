'use client';
import HenseiScreen from "./henseiScreen";
import { invoke } from '@tauri-apps/api/core';
import { useTLName } from '../../hooks/useTLName';
import { useEffect, useState } from 'react';

// ページコンポーネントを非同期ではなく同期に変更
export default function Page() {
  const { tlname, isLoading } = useTLName();
  const [data, setData] = useState({
    positions: {
      'STRIKER 1': '',
      'STRIKER 2': '',
      'STRIKER 3': '',
      'STRIKER 4': '',
      'SPECIAL 1': '',
      'SPECIAL 2': ''
    },
    settings: {
      battleTime: 180,
      costAtFirst: 0,
      difficulty: "LUNATIC",
      timeOfAnotherBattle: 0
    }
  });
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  useEffect(() => {
    if (!tlname || isLoading) return;
    
    const fetchData = async () => {
      try {
        setIsDataLoading(true);
        const tlData = await invoke('get_tl_data', { tlname });
        
        // データの形式を変換
        const positions = {
          'STRIKER 1': tlData.positions.striker_1,
          'STRIKER 2': tlData.positions.striker_2,
          'STRIKER 3': tlData.positions.striker_3,
          'STRIKER 4': tlData.positions.striker_4,
          'SPECIAL 1': tlData.positions.special_1,
          'SPECIAL 2': tlData.positions.special_2
        };

        const settings = {
          battleTime: tlData.settings.battle_time,
          costAtFirst: tlData.settings.cost_at_first,
          difficulty: tlData.settings.difficulty,
          timeOfAnotherBattle: tlData.settings.time_of_another_battle
        };
        
        setData({ positions, settings });
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setIsDataLoading(false);
      }
    };
    
    fetchData();
  }, [tlname, isLoading]);
  
  if (isLoading || isDataLoading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="text-lg font-medium">読み込み中...</div>
    </div>;
  }
  
  if (!tlname) {
    return <div className="flex justify-center items-center h-screen">
      <div className="text-lg font-medium">TLが選択されていません。TLを作成するか選択してください。</div>
    </div>;
  }
  
  const { positions, settings } = data;

  return (
    <div className="bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              編成詳細
            </h1>
          </div>
          <div className="p-4">
            <HenseiScreen
              st1={positions['STRIKER 1']}
              st2={positions['STRIKER 2']}
              st3={positions['STRIKER 3']}
              st4={positions['STRIKER 4']}
              sp1={positions['SPECIAL 1']}
              sp2={positions['SPECIAL 2']}
              bt={settings.battle_time}
              caf={settings.cost_at_first}
              dif={settings.difficulty}
              abt={settings.time_of_another_battle}
              tlname={tlname}
            />
          </div>
        </div>
      </div>
    </div>
  );
}