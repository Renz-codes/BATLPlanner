'use client';

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from "next/image";
import { useTLName } from '../hooks/useTLName';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast, Toaster } from 'react-hot-toast';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }

export default function Nav() {
    const { tlname, setTLName } = useTLName();
    const pathname = usePathname();
    const [isRenaming, setIsRenaming] = useState(false);
    const [tlList, setTlList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    const links = [
        { name: "Home", href: `/tlplanner`},
        { name: "TL Planner", href: `/tlplanner/tl_todo`},
    ];

    // TL一覧を取得
    const fetchTLList = async () => {
        try {
            setIsLoading(true);
            const tlNames = await invoke('get_tl_names');
            // 配列を受け取る形式に変更
            if (Array.isArray(tlNames)) {
                setTlList(tlNames);
            } else {
                console.error('TL一覧の形式が不正:', tlNames);
                toast.error('TL一覧の取得に失敗しちゃった(´；ω；`)', {
                    icon: '😭',
                    duration: 3000,
                });
            }
        } catch (error) {
            console.error('TL一覧の取得でエラー:', error);
            toast.error('TL一覧の取得に失敗しちゃった(´；ω；`)', {
                icon: '😭',
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // TLを切り替える
    const switchTL = async (newTlName) => {
        if (newTlName === tlname) return;
        
        try {
            await setTLName(newTlName);
            toast.success(`TLを「${newTlName}」に切り替えたよ～♪`, {
                icon: '✨',
                duration: 2000,
            });
            // 現在のページをリロード
            window.location.reload();
        } catch (error) {
            console.error('TL切り替えでエラー:', error);
            toast.error('TLの切り替えに失敗しちゃった(´；ω；`)', {
                icon: '😭',
                duration: 3000,
            });
        }
    };

    // TLをコピーする関数
    const copyTL = async () => {
        try {
            // 既にコピー中なら処理を中止
            if (isCopying) return;
            
            // 新しいTL名を入力するダイアログを表示
            const newTlName = prompt('新しいTL名を入力してね～✨', `${tlname}のコピー`);
            
            // キャンセルされた場合や空の場合は処理を中止
            if (!newTlName || newTlName.trim() === '') {
                toast('コピーをキャンセルしたよ～', {
                    icon: '🙅‍♀️',
                    duration: 1500,
                });
                return;
            }
            
            setIsCopying(true);
            toast.loading('TLをコピー中...ちょっと待っててね～(*´꒳`*)', {
                duration: 5000,
            });
            
            // 1. まず新しいTLを作成
            const createResult = await invoke('create_new_tl', { tlname: newTlName });
            
            if (!createResult.success) {
                throw new Error(createResult.error || 'TLの作成に失敗しました');
            }
            
            // 2. 元のTLのデータを取得
            const partyData = await invoke('get_tl_data', { tlname });
            
            // 3. 編成データをコピー
            const formations = [
                { id: `STRIKER 1 of TL: ${newTlName}`, name: partyData.positions.striker_1 },
                { id: `STRIKER 2 of TL: ${newTlName}`, name: partyData.positions.striker_2 },
                { id: `STRIKER 3 of TL: ${newTlName}`, name: partyData.positions.striker_3 },
                { id: `STRIKER 4 of TL: ${newTlName}`, name: partyData.positions.striker_4 },
                { id: `SPECIAL 1 of TL: ${newTlName}`, name: partyData.positions.special_1 },
                { id: `SPECIAL 2 of TL: ${newTlName}`, name: partyData.positions.special_2 }
            ];
            await invoke('update_hensei', { formations });
            
            // 4. 設定をコピー
            await invoke('update_tl_settings', {
                tlname: newTlName,
                bossName: partyData.settings.boss_name,
                costAtFirst: Number(partyData.settings.cost_at_first),
                difficulty: partyData.settings.difficulty,
                timeOfAnotherBattle: Number(partyData.settings.time_of_another_battle)
            });
            
            // 5. TODOデータをコピー
            console.log('コピー元のTL名:', tlname);
            const todoData = await invoke('get_tl_all_data', { tlname });
            console.log('コピー対象データ数:', todoData.length);
            
            if (todoData && todoData.length > 0) {
                // データがあるので、各行をコピー
                for (const item of todoData) {
                    // ログ出力
                    console.log('コピー中の行:', item.col, item.event);
                    
                    // コピー先用のデータに変換
                    const newItem = {
                        ...item,
                        tlname: newTlName
                    };
                    
                    // 処理を2回するとより確実
                    try {
                        // 1回目の保存試行
                        await invoke('update_todo_data', { todo: newItem });
                    } catch (err) {
                        console.warn('1回目の保存に失敗、再試行します:', err);
                        // 2回目の保存試行
                        await invoke('update_todo_data', { todo: newItem });
                    }
                }
                
                console.log('全データのコピー完了');
            } else {
                console.error('コピーするデータがありません');
            }
            
            // 成功メッセージを表示
            toast.success(`「${newTlName}」としてコピーしたよ～♪`, {
                icon: '✨',
                duration: 3000,
            });
            
            // 新しいTLに移動するか確認
            if (confirm(`「${newTlName}」に移動する？`)) {
                // ここでtlnameを更新し、新しいTLに移動
                await invoke('set_current_tl', { tlname: newTlName });
                window.location.href = `/tlplanner/tl_todo?tlname=${encodeURIComponent(newTlName)}`;
            }
            
            // TL一覧を更新
            fetchTLList();
            
        } catch (error) {
            console.error('TLのコピーでエラーが発生しました:', error);
            toast.error('TLのコピーに失敗しちゃった(´；ω；`)', {
                icon: '😭',
                duration: 3000,
            });
        } finally {
            setIsCopying(false);
        }
    };

    // コンポーネントマウント時にTL一覧を取得
    useEffect(() => {
        fetchTLList();
    }, []);

    // TLのリネーム処理
    const handleRename = async () => {
        try {
            // 新しいTL名を入力するダイアログを表示
            const newTlName = prompt('新しいTL名を入力してください', tlname);
            
            // キャンセルされた場合や空の場合、または同じ名前の場合は処理を中止
            if (!newTlName || newTlName.trim() === '' || newTlName === tlname) {
                if (newTlName === tlname) {
                    toast('同じ名前だから変更しなかったよ～', {
                        icon: '🤔',
                        duration: 1500,
                    });
                } else {
                    toast('リネームをキャンセルしたよ～', {
                        icon: '🙅‍♀️',
                        duration: 1500,
                    });
                }
                return;
            }
            
            setIsRenaming(true);
            toast.loading('TL名を変更中...', {
                duration: 3000,
            });
            
            // データベースのTL名を変更
            const result = await invoke('rename_tl', {
                oldName: tlname,
                newName: newTlName
            });
            
            if (!result.success) {
                throw new Error(result.error || 'TL名の変更に失敗しました');
            }
            
            // フックのTL名も更新
            await setTLName(newTlName);
            
            toast.success(`TL名を「${newTlName}」に変更したよ～♪`, {
                icon: '✨',
                duration: 3000,
            });
            
            // 現在のページをリロード
            window.location.reload();
            
        } catch (error) {
            console.error('TL名の変更でエラーが発生しました:', error);
            toast.error('TL名の変更に失敗しちゃった(´；ω；`)', {
                icon: '😭',
                duration: 3000,
            });
        } finally {
            setIsRenaming(false);
        }
    };

    return (
    <>
    <Toaster position="top-right" />
    <Disclosure as="nav" className="bg-gradient-to-r from-slate-800 to-slate-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* ナビゲーションメニュー */}
            <div className="flex h-16 items-center justify-between">
                <div className="flex items-center">
                    <div className="shrink-0 mr-6">
                        <Link href="/" className="block hover:opacity-90 transition-opacity">
                            <div className="bg-white bg-opacity-90 rounded-md px-2 py-1">
                                <Image
                                    alt="TL Planner"
                                    src="/TLPlanner_ba-style@nulla.top.png"
                                    width={160}
                                    height={34}
                                    className="mx-auto"
                                />
                            </div>
                        </Link>
                    </div>
                    
                    {/* TL名表示とドロップダウン */}
                    <Menu as="div" className="relative inline-block text-left mr-6">
                        <div className="bg-slate-600 bg-opacity-50 rounded-md px-3 py-1.5 flex items-center">
                            <span className="text-white text-sm font-medium flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="text-shadow">TL: </span>
                            </span>
                            
                            <Menu.Button className="ml-1 text-white hover:text-blue-200 transition-colors duration-200 focus:outline-none flex items-center">
                                {decodeURI(tlname)}
                                <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </Menu.Button>
                            
                            {/* 編集ボタン */}
                            <button 
                                onClick={handleRename}
                                disabled={isRenaming}
                                className="ml-2 text-gray-300 hover:text-white transition-colors duration-200 focus:outline-none"
                                title="TL名を変更する"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                            
                            {/* コピーボタン - 新しく追加 */}
                            <button 
                                onClick={copyTL}
                                disabled={isCopying}
                                className="ml-2 text-purple-300 hover:text-purple-200 transition-colors duration-200 focus:outline-none"
                                title="TLをコピーする"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                            </button>
                            
                            {/* 更新ボタン */}
                            <button 
                                onClick={fetchTLList}
                                disabled={isLoading}
                                className="ml-1 text-gray-300 hover:text-white transition-colors duration-200 focus:outline-none"
                                title="TL一覧を更新する"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute left-0 mt-1 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                <div className="py-1">
                                    {tlList.length > 0 ? (
                                        tlList.map((tl) => (
                                            <Menu.Item key={tl}>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => switchTL(tl)}
                                                        className={`${
                                                            active ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                                                        } ${
                                                            tl === tlname ? 'bg-blue-50 font-medium' : ''
                                                        } block w-full text-left px-4 py-2 text-sm`}
                                                    >
                                                        {tl === tlname ? `✓ ${tl}` : tl}
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        ))
                                    ) : (
                                        <div className="text-gray-500 text-sm px-4 py-2">
                                            {isLoading ? 'TL一覧を取得中...' : 'TLがないよ～'}
                                        </div>
                                    )}
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                    
                    <div className="hidden md:block">
                        <div className="flex items-baseline space-x-4">
                            {links.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    aria-current={pathname === link.href ? 'page' : undefined}
                                    className={classNames(
                                        pathname === link.href 
                                            ? 'bg-blue-600 text-white shadow-md' 
                                            : 'text-gray-200 hover:bg-blue-500 hover:text-white',
                                        'rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                                    )}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
     
        <DisclosurePanel className="md:hidden">
            <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
                {links.map((link) => (
                    <DisclosureButton
                        key={link.name}
                        as="a"
                        href={link.href}
                        aria-current={pathname === link.href ? 'page' : undefined}
                        className={classNames(
                            pathname === link.href ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-blue-500 hover:text-white',
                            'block rounded-md px-3 py-2 text-base font-medium',
                        )}
                    >
                        {link.name}
                    </DisclosureButton>
                ))}
            </div>
        </DisclosurePanel>
    </Disclosure>
    
    <style jsx global>{`
        .text-shadow {
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
    `}</style>
    </>
    )
}