'use client';

import FreeSolo from "../../ui/freesolo";
import {
  FreeSoloForBossName,
  FreeSoloForCostAtFirst,
  FreeSoloForDifficulty,
  FreeSoloForAnotherBattleTime
} from "../../ui/freesolo";
import { useState, useCallback, useEffect } from "react";
import { toast } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';

export default function HenseiScreen({ st1, st2, st3, st4, sp1, sp2, bn, caf, dif, abt, tlname }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 編成データの状態管理
  const [formation, setFormation] = useState({
    striker1: st1,
    striker2: st2,
    striker3: st3,
    striker4: st4,
    special1: sp1,
    special2: sp2,
  });

  // 設定データの状態管理 - モデルのフィールド名に合わせる
  const [settings, setSettings] = useState({
    bossName: bn || "その他", 
    costAtFirst: parseFloat(caf) || 0.0,
    difficulty: dif || 'LUNATIC',
    timeOfAnotherBattle: parseFloat(abt) || 0.0  // anotherBattleTimeから変更
  });

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Tauriコマンドを使って設定を取得
        const settingsData = await invoke('get_tl_settings', { tlname });
        
        setSettings({
          bossName: settingsData.boss_name || "その他",
          costAtFirst: settingsData.cost_at_first || 0.0,
          difficulty: settingsData.difficulty || 'LUNATIC',
          timeOfAnotherBattle: settingsData.time_of_another_battle || 0.0
        });
      } catch (error) {
        console.error('設定読み込みエラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [tlname]);

  // 編成データの更新ハンドラ
  const handleFormationChange = useCallback((key, value) => {
    setFormation(prev => ({ ...prev, [key]: value }));
  }, []);

  // 設定データの更新ハンドラ
  const handleSettingsChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // 編成保存ハンドラ
  const handleFormationSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const decodedTLName = decodeURI(tlname);
    
    const formationData = [
      { id: `STRIKER 1 of TL: ${decodedTLName}`, name: formation.striker1 },
      { id: `STRIKER 2 of TL: ${decodedTLName}`, name: formation.striker2 },
      { id: `STRIKER 3 of TL: ${decodedTLName}`, name: formation.striker3 },
      { id: `STRIKER 4 of TL: ${decodedTLName}`, name: formation.striker4 },
      { id: `SPECIAL 1 of TL: ${decodedTLName}`, name: formation.special1 },
      { id: `SPECIAL 2 of TL: ${decodedTLName}`, name: formation.special2 },
    ];

    try {
      // Tauriコマンドを使って編成を保存
      const success = await invoke('update_hensei', { formations: formationData });
      
      if (!success) throw new Error('編成の保存に失敗しました');
      
      toast.success('編成を保存しました');
    } catch (error) {
      console.error('編成保存エラー:', error);
      toast.error('編成の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 設定保存ハンドラ
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // パラメータはそのまま
      const params = {
        tlname,
        bossName: settings.bossName,
        costAtFirst: Number(settings.costAtFirst),
        difficulty: settings.difficulty,
        timeOfAnotherBattle: Number(settings.timeOfAnotherBattle)
      };
      
      console.log("送信するパラメータ:", params); // デバッグ用
      
      // ここでtry-catchをさらに追加して、より詳細なエラー情報を取得
      try {
        const success = await invoke('update_tl_settings', params);
        console.log("保存結果:", success); // 戻り値を確認
        
        if (!success) {
          console.error('保存失敗: success = false');
          throw new Error('設定の保存に失敗しました');
        }
        
        // 成功時のメッセージ表示のみ - 余計な処理を入れない
        toast.success('設定を保存しました');
      } catch (invokeError) {
        console.error('invoke実行エラー:', invokeError);
        throw invokeError; // 外側のcatchに渡す
      }
    } catch (error) {
      console.error('設定保存エラー:', error);
      toast.error(`設定の保存に失敗しました: ${error.message}`);
    } finally {
      // 最後に確実に実行される処理
      setIsSubmitting(false);
      console.log("処理完了");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="grid grid-cols-3">
      <div className="col-span-2 px-2">
        <div className="bg-black/[0.03] rounded-lg px-3 py-3">
          <div className="justify-self-start">
            <div className="bg-gray-600 text-3xl text-white rounded-md px-10 py-2 justify-self-center">編成</div>
          </div>
          <form className="grid grid-cols-2 content-around gap-4 py-3 px-6 rounded justify-center" onSubmit={handleFormationSubmit}>
            <div className="justify-self-end"><FreeSolo label_text="STRIKER 1" setfunc={(value) => handleFormationChange('striker1', value)} default_text={formation.striker1} isStriker={true}/></div>
            <div className="justify-self-start"><FreeSolo label_text="SPECIAL 1" setfunc={(value) => handleFormationChange('special1', value)} default_text={formation.special1} isStriker={false}/></div>
            <div className="justify-self-end"><FreeSolo label_text="STRIKER 2" setfunc={(value) => handleFormationChange('striker2', value)} default_text={formation.striker2} isStriker={true}/></div>
            <div className="justify-self-start"><FreeSolo label_text="SPECIAL 2" setfunc={(value) => handleFormationChange('special2', value)} default_text={formation.special2} isStriker={false}/></div>
            <div className="justify-self-end"><FreeSolo label_text="STRIKER 3" setfunc={(value) => handleFormationChange('striker3', value)} default_text={formation.striker3} isStriker={true}/></div>
            <div className="justify-self-start"></div>
            <div className="justify-self-end"><FreeSolo label_text="STRIKER 4" setfunc={(value) => handleFormationChange('striker4', value)} default_text={formation.striker4} isStriker={true}/></div>
            <div className="justify-self-start"></div>
            <div className="justify-self-end"></div>
            <div className="justify-self-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`text-white bg-gray-700 hover:bg-gray-600 hover:text-white rounded-md px-5 py-2 text-sm font-medium mr-12
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? '保存中...' : '編成確定'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="col-span-1 px-2">
        <div className="bg-black/[0.03] rounded-lg p-3">
          <div className="justify-self-start">
            <div className="bg-gray-600 text-3xl text-white rounded-md px-10 py-2 justify-self-center">設定</div>
          </div>
          <form className="grid content-around gap-4 px-1 py-3 rounded justify-self-center" onSubmit={handleSettingsSubmit}>
            <div className="justify-self-center">
              <FreeSoloForBossName
                setfunc={(value) => handleSettingsChange('bossName', value)}
                default_text={settings.bossName || ''}
              />
            </div>
            <div className="justify-self-center">
              <FreeSoloForCostAtFirst
                setfunc={(value) => handleSettingsChange('costAtFirst', value)}
                default_text={settings.costAtFirst || ''}
              />
            </div>
            <div className="justify-self-center">
              <FreeSoloForDifficulty
                setfunc={(value) => handleSettingsChange('difficulty', value)}
                default_text={settings.difficulty}
              />
            </div>
            <div className="justify-self-center">
              <FreeSoloForAnotherBattleTime
                setfunc={(value) => handleSettingsChange('timeOfAnotherBattle', value)}
                default_text={settings.timeOfAnotherBattle || ''}
              />
            </div>
            <div className="justify-self-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`text-white bg-gray-700 hover:bg-gray-600 hover:text-white rounded-md px-5 py-2 text-sm font-medium
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? '保存中...' : '設定確定'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div> 
    </div>
  );
}