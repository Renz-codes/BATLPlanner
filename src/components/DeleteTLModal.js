'use client';

import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography, Box, Autocomplete, TextField } from '@mui/material';
import { toast } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import DeleteIcon from '@mui/icons-material/Delete';

export default function DeleteTLModal({ isOpen, onClose, tlNames, onDeleteSuccess }) {
  const [selectedTL, setSelectedTL] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  
  // 削除確認ダイアログを開く
  const handleOpenConfirm = () => {
    if (!selectedTL) {
      toast.error('削除するTLを選択してね～！', {
        icon: '⚠️',
        duration: 3000,
      });
      return;
    }
    setOpenConfirm(true);
  };
  
  // 削除確認ダイアログを閉じる
  const handleCloseConfirm = () => {
    setOpenConfirm(false);
  };
  
  // モーダルが閉じるときの処理
  const handleClose = () => {
    setSelectedTL('');
    onClose();
  };
  
  // 実際にTLを削除する処理
  const handleDeleteTL = async () => {
    if (!selectedTL) return;
    
    setIsDeleting(true);
    try {
      // 削除処理を実行
      const result = await invoke('delete_tl', { tlname: selectedTL });
      
      if (!result.success) {
        throw new Error(result.error || 'TLの削除に失敗しました');
      }
      
      // 削除成功をコールバックで通知
      if (onDeleteSuccess) {
        onDeleteSuccess(selectedTL);
      }
      
      toast.success(`「${selectedTL}」を削除したよ～♪`, {
        icon: '🗑️',
        duration: 3000,
      });
      
      // モーダルを閉じる
      setOpenConfirm(false);
      handleClose();
      
    } catch (error) {
      console.error('TL削除エラー:', error);
      toast.error('TLの削除に失敗しちゃった(´；ω；`)', {
        icon: '😭',
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: '#ffebee', 
          color: '#d32f2f',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <DeleteIcon /> Delete TLs
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2, mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 3, color: '#555' }}>
            削除したいTLを選択してね。削除するとデータは元に戻せないから注意してね～！
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Autocomplete
              value={selectedTL}
              onChange={(event, newValue) => setSelectedTL(newValue)}
              disablePortal
              options={tlNames || []}
              sx={{ width: '100%' }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="削除するTL名" 
                  variant="outlined" 
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: '#d32f2f',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#d32f2f',
                    },
                  }}
                />
              )}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} color="inherit">
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleOpenConfirm}
            disabled={!selectedTL || isDeleting}
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 削除確認ダイアログ */}
      <Dialog
        open={openConfirm}
        onClose={handleCloseConfirm}
      >
        <DialogTitle sx={{ bgcolor: '#ffebee', color: '#d32f2f' }}>
          「{selectedTL}」を削除しますか？
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            この操作は元に戻せません！本当に「{selectedTL}」のデータを削除しますか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseConfirm} 
            color="inherit"
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleDeleteTL} 
            color="error"
            variant="contained"
            disabled={isDeleting}
            autoFocus
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 