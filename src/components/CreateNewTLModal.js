'use client';

import { useState } from "react";
import Modal from "./Modal";
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';

export default function CreateNewTLModal({ isOpen, onClose }) {
  const router = useRouter();
  const [tlname, setTlname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tlname.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError("");
      
      const result = await invoke('create_new_tl', { tlname: tlname.trim() });
      
      if (result.error) {
        setError(result.error);
        if (result.type === 'warning') {
          toast(result.error, {
            icon: '⚠️',
            style: {
              background: '#fef3c7',
              color: '#92400e'
            }
          });
        } else {
          toast.error(result.error);
        }
        return;
      }
      
      await invoke('set_current_tl', { tlname: tlname.trim() });
      
      toast.success('TLを作成しました');
      onClose();
      setTlname("");
      
      router.push('/tlplanner');
    } catch (error) {
      console.error('TL作成エラー:', error);
      toast.error('予期せぬエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="TLの名前を入力してください"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            value={tlname}
            onChange={(e) => {
              setTlname(e.target.value);
              setError("");
            }}
            className={`bg-white border ${error ? 'border-red-500' : 'border-gray-400'} 
                       text-gray-900 text-md rounded-md 
                       focus:ring-blue-500 focus:border-blue-500 block w-full p-4
                       dark:bg-gray-600 dark:border-gray-500 dark:text-white`}
            placeholder="例: ヒエロニムス市街地TOR軽装"
            required
            disabled={isSubmitting}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!tlname.trim() || isSubmitting}
          className={`w-full text-white bg-blue-700 hover:bg-blue-800 
                     focus:ring-4 focus:ring-blue-300 font-medium rounded-lg 
                     text-sm px-5 py-2.5 text-center
                     ${(!tlname.trim() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? '作成中...' : 'TL名決定'}
        </button>
      </form>
    </Modal>
  );
} 