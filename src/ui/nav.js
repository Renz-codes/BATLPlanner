'use client';

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from "next/image";
import { useTLName } from '../hooks/useTLName';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast, Toaster } from 'react-hot-toast';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }

export default function Nav() {
    const { tlname, setTLName } = useTLName();
    const pathname = usePathname();
    const [isRenaming, setIsRenaming] = useState(false);

    const links = [
        { name: "Home", href: `/tlplanner`},
        { name: "TL Planner", href: `/tlplanner/tl_todo`},
    ];

    // TLのリネーム処理
    const handleRename = async () => {
        try {
            // 新しいTL名を入力するダイアログを表示
            const newTlName = prompt('新しいTL名を入力してね～✨', tlname);
            
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
                    
                    {/* TL名表示 - ナビメニューと同じ行に配置 */}
                    <div className="bg-slate-600 bg-opacity-50 rounded-md px-3 py-1.5 mr-6 flex items-center">
                        <span className="text-white text-sm font-medium flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span className="text-shadow">TL: {decodeURI(tlname)}</span>
                        </span>
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
                    </div>
                    
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