'use client';

import { useState } from "react";
import Modal from "./Modal";
import { Autocomplete, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';

export default function ReferTLModal({ isOpen, onClose, options }) {
  const [tlname, setTlname] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tlname) {
      const cleanedName = tlname.replace(/^TL:\s*/, '');
      
      // グローバル状態にTL名を保存
      await invoke('set_current_tl', { tlname: cleanedName });
      
      // URLパラメータなしで遷移
      router.push('/tlplanner');
      onClose();
      setTlname(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="参照するTLを選んでください"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Autocomplete
          options={options || []}
          value={tlname}
          onChange={(event, newValue) => {
            setTlname(newValue);
          }}
          isOptionEqualToValue={(option, value) => option === value}
          getOptionLabel={(option) => option || ''}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="TL名を選択" 
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgb(209 213 219)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgb(147 197 253)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgb(59 130 246)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgb(107 114 128)',
                },
              }}
            />
          )}
          fullWidth
          freeSolo={false}
          disableClearable
          ListboxProps={{
            style: { 
              maxHeight: '50vh',
            }
          }}
          sx={{
            '& .MuiAutocomplete-listbox': {
              '& .MuiAutocomplete-option': {
                '&[aria-selected="true"]': {
                  backgroundColor: 'rgb(59 130 246)',
                  color: 'white',
                },
                '&.Mui-focused': {
                  backgroundColor: 'rgb(147 197 253)',
                  color: 'white',
                },
              },
            },
          }}
        />
        <button
          type="submit"
          disabled={!tlname}
          className={`w-full text-white bg-blue-700 hover:bg-blue-800 
                     focus:ring-4 focus:ring-blue-300 font-medium rounded-lg 
                     text-sm px-5 py-2.5 text-center
                     ${!tlname ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          参照TL決定
        </button>
      </form>
    </Modal>
  );
} 