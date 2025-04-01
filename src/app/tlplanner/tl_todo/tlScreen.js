'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Checkbox,
  Button,
  Box,
  Tooltip,
  Typography,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  NetworkWifi,
  Search as SearchIcon,
  Clear as ClearIcon,
  FileDownload as FileDownloadIcon,
  FileCopy as FileCopyIcon
} from '@mui/icons-material';
import styled from 'styled-components';
import { toast, Toaster } from 'react-hot-toast';
import Autocomplete from '@mui/material/Autocomplete';
import { excosts } from '@/app/lib/excosts';
import Chip from '@mui/material/Chip';
import { ssCostBoost, exCostBoost, autoCostBoost, redWinterCharactersWithoutCherino, costHalver, oneCostReducer, firstOneCostReducer, bossProperties, variableCostStudent } from '@/app/lib/stdata';
import React from 'react';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Divider from '@mui/material/Divider';
// dnd-kitのインポート
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { invoke } from '@tauri-apps/api/core';

let bossName = "その他"; // デフォルト値
let battleTime = 240; // デフォルト値
let initialCost = 0; // デフォルト値
let difficulty = "LUNATIC"; // デフォルト値
let timeOfAnotherBattle = 0; // デフォルト値
const Container = styled.div`
  padding: 20px;
  max-width: 100%;
  background-color: #f5f7fa;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  background-color: white;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
`;

const CompactCell = styled(TableCell)`
  padding: 2px 2px;
  white-space: nowrap;
`;

// ドラッグ可能な行アイテムコンポーネントを作るよ～♪
const SortableTableRow = React.memo(({ 
  row, 
  index, 
  data, 
  columnVisibility, 
  calculatedValues,
  insertRowBelow,
  deleteRow,
  handleInputChange,
  handleInputBlur,
  handleCheckboxChange,
  handleDropoutChange,
  handleTimingChange,
  searchEvent,
  searchType, // 新しく追加
}) => {
  // useSortableフックを使ってドラッグ機能をつけるの～♪
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: row.col.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // ... existing row styles ...
  };

  // 計算値の取得など、既存のコードはそのまま～
  const calculatedValue = calculatedValues.find(item => item.col === row.col);
  const cumulativeCost = calculatedValue?.cumulativeCost || 0;
  const costRecoveryValue = calculatedValue?.costRecoveryToDisplay || 0;
  const remainingTime = calculatedValue?.remainingTime || '';
  const availableSuggestions = calculatedValue?.suggestion || [];
  const requiredCost = calculatedValue?.requiredCost || 0;
  const party = calculatedValue?.party || [];
  
  let partyWithCategory = [];
  if (party && party.length > 0) {
    partyWithCategory = party.map(student => {
      const role = excosts.find(item => item.name === student)?.role;
      return {
        name: student,
        role: role
      };
    }).sort((a, b) => -a.role.localeCompare(b.role));
  }

  let availableSuggestionsWithCategory = [];
  if (availableSuggestions) {
    availableSuggestionsWithCategory = availableSuggestions.map(suggestion => {
      if (party.includes(suggestion.replace("(リオ©)", ""))) {
        return {
          name: suggestion,
          role: partyWithCategory.find(item => item.name === suggestion.replace("(リオ©)", ""))?.role + "(EX)",
        };
      } else if (suggestion.endsWith("NS") || suggestion.endsWith("SS")) {
        return {
          name: suggestion,
          role: "NSやSSなど"
        };
      } else {
        return {
          name: suggestion,
          role: "その他"
        };
      }
    }).sort((a, b) => -a.role.localeCompare(b.role));
  }

  // 現在の行の脱落キャラを取得
  let currentDropouts = [];
  try {
    currentDropouts = row.dropout ? JSON.parse(row.dropout) : [];
  } catch (e) {
    if (typeof row.dropout === 'string' && row.dropout.trim() !== '') {
      currentDropouts = [row.dropout];
    }
  }
  
  // ★新しいコード★ 脱落キャラがある場合はカンマ区切りの文字列を作成
  const hasDropouts = currentDropouts.length > 0;
  const dropoutsText = (hasDropouts ? currentDropouts.join('、') : '') + '（脱落）';
  
  // 残りコストが負の数かどうかチェック
  const isNegativeCost = calculatedValue?.displayCost && 
    parseFloat(calculatedValue.displayCost) < 0;

  // 検索条件に一致するかどうかを判定する関数
  const matchesSearchCriteria = () => {
    if (!searchEvent || !row.event) return false;
    
    const eventValue = row.event;
    switch (searchType) {
      case 'exact':
        return eventValue === searchEvent;
      case 'contains':
        return eventValue.includes(searchEvent);
      case 'startsWith':
        return eventValue.startsWith(searchEvent);
      case 'endsWith':
        return eventValue.endsWith(searchEvent);
      default:
        return false;
    }
  };

  return (
    <TableRow 
      ref={setNodeRef}
      style={style}
      sx={{
        ...(row.col === 0 && {
          backgroundColor: '#e8f5e9 !important', // 柔らかい緑色の背景
          borderTop: '2px solid #2e7d32',       // 深い緑色の上ボーダー
          borderBottom: '2px solid #2e7d32',    // 深い緑色の下ボーダー
          '& .MuiTableCell-root': {
            fontWeight: 'bold',
            color: '#1b5e20',                   // 濃い緑色のテキスト
            fontSize: '0.85rem',
          },
          '&:hover': {
            backgroundColor: '#c8e6c9 !important', // ホバー時はやや濃い緑色
          }
        }),
        // 検索条件に一致する場合のスタイル
        ...(searchEvent && matchesSearchCriteria() && {
          backgroundColor: '#fffde7 !important', // 柔らかい黄色の背景
          animation: 'pulse 2s infinite',
          boxShadow: '0 0 10px rgba(255, 193, 7, 0.5)',
          '& .MuiTableCell-root': {
            color: '#f57f17',
            fontWeight: 'bold',
          },
          '&:hover': {
            backgroundColor: '#fff9c4 !important',
          },
          '@keyframes pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(255, 193, 7, 0.4)' },
            '70%': { boxShadow: '0 0 0 10px rgba(255, 193, 7, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(255, 193, 7, 0)' }
          }
        }),
        // ドラッグ中のスタイル
        ...(isDragging && {
          boxShadow: '0 0 10px rgba(52, 152, 219, 0.5)',
          cursor: 'grabbing',
        }),
      }}
      {...attributes}
    >
      {columnVisibility.operations && (
        <CompactCell key={`operations-${row.col}-${index}`} align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '2px' }}>
            {/* ドラッグハンドルアイコン */}
            <IconButton
              size="small"
              {...listeners}
              disabled={row.col === 0} // 0行目はドラッグ不可
              sx={{ 
                color: row.col === 0 ? '#ccd1d1' : '#3498db',
                cursor: row.col === 0 ? 'not-allowed' : 'grab',
                '&:hover': { backgroundColor: '#ebf5fb' },
                '&:active': { cursor: 'grabbing' }
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>

            {/* 既存の追加ボタンと削除ボタンはそのまま残す */}
            <IconButton
              size="small"
              onClick={() => insertRowBelow(index)}
              disabled={false}
              sx={{ 
                color: '#27ae60',
                '&:hover': { backgroundColor: '#eafaf1' }
              }}
            >
              <AddCircleOutlineIcon fontSize="small" />
            </IconButton>
    
            <IconButton
              size="small"
              onClick={() => deleteRow(row.col)}
              disabled={row.col === 0}
              sx={{ 
                color: row.col === 0 ? '#ccd1d1' : '#e74c3c',
                '&:hover': { backgroundColor: row.col === 0 ? 'transparent' : '#fdf2f0' }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </CompactCell>
      )}
      {columnVisibility.row && (
        <TableCell key={`row-number-${row.col}-${index}`} align="center">
          {row.col+1}
        </TableCell>
      )}
      {columnVisibility.event && (
        <TableCell key={`event-${row.col}-${index}`} align="center">
          <Autocomplete
            size="small"
            options={availableSuggestionsWithCategory}
            groupBy={(option) => option.role || "その他"}
            getOptionLabel={(option) => {
              // もし値がない場合は空文字を返す
              if (option === null || option === undefined) return '';
              
              // もし文字列ならそのまま返す
              if (typeof option === 'string') return option;
              
              // オブジェクトならname属性を返す
              if (typeof option === 'object' && option.name) return option.name;
              
              // それ以外の場合は空文字を返す（安全策）
              return '';
            }}
            value={hasDropouts ? dropoutsText : row.event}
            freeSolo
            disableClearable
            disabled={row.col === 0 || hasDropouts}
            onChange={(event, newValue) => {
              if (!hasDropouts) {
                // 文字列か、オブジェクトならその名前を使用
                const valueToUse = typeof newValue === 'string' 
                  ? newValue 
                  : (newValue && newValue.name ? newValue.name : '');
                
                handleInputChange(row.col, 'event', valueToUse);
                handleInputBlur(row.col, 'event', valueToUse);
              }
            }}
            onInputChange={(event, newValue) => {
              if (!hasDropouts) {
                handleInputChange(row.col, 'event', newValue || '');
              }
            }}
            renderInput={(params) => (
              <TextField 
                {...params}
                fullWidth
                variant="outlined"
                size="small"
                label={(() => {
                  const eventValue = row.event || '';
                  // パーティーに含まれている場合
                  if (party.includes(eventValue)) {
                    return "EXスキル";
                  }
                  // パーティーに含まれていないがサジェストに含まれる場合
                  else if (availableSuggestions.includes(eventValue) || eventValue.endsWith("NS") || eventValue.endsWith("SS")) {
                    return "特殊なスキルまたはNSやSSなど";
                  }
                  // それ以外は空ラベル
                  return "";
                })()}
                onBlur={(e) => {
                  if (!hasDropouts) {
                    handleInputBlur(row.col, 'event', e.target.value);
                  }
                }}
                inputProps={{
                  ...params.inputProps,
                  style: { 
                    textAlign: 'center', 
                    fontSize: '0.78rem',
                    ...(hasDropouts && { color: '#e91e63' })
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: (() => {
                      const eventValue = row.event || '';
                      // パーティーに含まれている場合
                      if (party.includes(eventValue)) {
                        return '#e0f7fa'; // 柔らかいミント系の色 - 目に優しい
                      }
                      // パーティーには含まれていないがサジェストに含まれる場合
                      else if (availableSuggestions.includes(eventValue) || eventValue.endsWith("NS") || eventValue.endsWith("SS")) {
                        return '#f3e5f5'; // 優しいラベンダー系 - 落ち着いた印象
                      }
                      // それ以外はデフォルト
                      return '';
                    })()
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.7rem',
                    color: (() => {
                      const eventValue = row.event || '';
                      // パーティーに含まれている場合
                      if (party.includes(eventValue)) {
                        return '#00838f'; // 落ち着いたターコイズ - EXスキルらしい高級感
                      }
                      // パーティーには含まれていないがサジェストに含まれる場合
                      else if (availableSuggestions.includes(eventValue) || eventValue.endsWith("NS") || eventValue.endsWith("SS")) {
                        return '#8e24aa'; // 上品な紫 - サポートスキルらしい魔法感
                      }
                      // それ以外はデフォルト
                      return '';
                    })()
                  }
                }}
              />
            )}
            sx={{
              '& .MuiOutlinedInput-root': {
                padding: '0px 8px',
              },
              '& .MuiAutocomplete-input': {
                padding: '3px 4px !important',
              }
            }}
          />
        </TableCell>
      )}
      {columnVisibility.late && (
        <TableCell key={`late-${row.col}-${index}`} align="center">
          <Checkbox
            checked={row.late}
            disabled={row.col === 0}
            onChange={(e) => handleCheckboxChange(row.col, 'late', e.target.checked)}
          />
        </TableCell>
      )}
      {columnVisibility.timing && (
        <TableCell key={`timing-${row.col}-${index}`} align="center">
          <TextField
            size="small"
            fullWidth
            disabled={row.col === 0 || row.late}
            value={row.late ? "10.0" : (row.timing || "")}
            onChange={(e) => {
              if (!row.late) {
                handleInputChange(row.col, 'timing', e.target.value);
              }
            }}
            onBlur={(e) => {
              if (!row.late) {
                handleTimingChange(row.col, e.target.value);
              }
            }}
            inputProps={{
              style: { textAlign: 'center' }
            }}
            placeholder="Cost/m:ss.ms"
          />
        </TableCell>
      )}
      {columnVisibility.cumulativeCost && (
        <TableCell key={`cumulative-cost-${row.col}-${index}`} align="center">
          <Box sx={{ 
            padding: '8px 4px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            color: (() => {
              // 10刻みで色を変える（15色ほど）
              if (cumulativeCost >= 140) return '#1a0033'; // 超高コスト：最暗紫
              if (cumulativeCost >= 130) return '#2d0052'; // 140未満：暗紫
              if (cumulativeCost >= 120) return '#3a0066'; // 130未満：紫
              if (cumulativeCost >= 110) return '#4c0099'; // 120未満：明るい紫
              if (cumulativeCost >= 100) return '#6600cc'; // 110未満：ラベンダー紫
              if (cumulativeCost >= 90) return '#800000';  // 100未満：マルーン（暗赤）
              if (cumulativeCost >= 80) return '#990000';  // 90未満：ダークレッド
              if (cumulativeCost >= 70) return '#cc0000';  // 80未満：レッド
              if (cumulativeCost >= 60) return '#e60000';  // 70未満：鮮やかな赤
              if (cumulativeCost >= 50) return '#ff3300';  // 60未満：赤橙
              if (cumulativeCost >= 40) return '#ff6600';  // 50未満：オレンジ
              if (cumulativeCost >= 30) return '#ff9900';  // 40未満：薄いオレンジ
              if (cumulativeCost >= 20) return '#cccc00';  // 30未満：黄色
              if (cumulativeCost >= 10) return '#00cc00';  // 20未満：緑
              return '#0066ff';                            // 10未満：青
            })(),
            textAlign: 'center'
          }}>
            {cumulativeCost}
          </Box>
        </TableCell>
      )}
      {columnVisibility.requiredCost && (
        <TableCell key={`required-cost-${row.col}-${index}`} align="center">
          {(() => {
            // イベント名からexcostを検索
            // 見つかった場合はexcostを表示、見つからない場合は空白
            if (requiredCost) {
              // コストに応じた色設定
              const costColor = 
                requiredCost >= 6 ? '#e74c3c' :  // 高コスト：赤
                requiredCost >= 4 ? '#f39c12' :  // 中高コスト：オレンジ
                requiredCost >= 2 ? '#27ae60' :  // 中低コスト：緑
                '#3498db';                             // 低コスト：青
                
              return (
                <Box sx={{ 
                  padding: '8px 4px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  color: costColor,
                  textAlign: 'center'
                }}>
                  {requiredCost}
                </Box>
              );
            }
            return "";  // 一致するものがない場合は空白
          })()}
        </TableCell>
      )}
      {columnVisibility.costRecovery && (
        <TableCell key={`cost-recovery-${row.col}-${index}`} align="center">
          <Box sx={{ 
            padding: '8px 4px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            color: '#16a085', // ターコイズ色で表示
            textAlign: 'center'
          }}>
            {costRecoveryValue}
          </Box>
        </TableCell>
      )}
      {columnVisibility.remainingTime && (
        <TableCell key={`remaining-time-${row.col}-${index}`} align="center">
          <Box sx={{
            padding: '8px 4px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: '#2980b9',
            textAlign: 'center',
            fontFamily: 'monospace'
          }}>
            {remainingTime}
          </Box>
        </TableCell>
      )}
      {columnVisibility.remainingCost && (
        <TableCell key={`remaining-cost-${row.col}-${index}`} align="center">
          <span style={{ 
            color: isNegativeCost ? '#ff0000' : '#2196f3', // マイナスなら赤、そうでないならいい感じの青色♪
            padding: '8px 4px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {calculatedValue?.displayCost || ''}
          </span>
        </TableCell>
      )}
      {columnVisibility.overflowCost && (
        <TableCell key={`overflow-cost-${row.col}-${index}`} align="center">
          <span style={{ 
            color: '#9c27b0', // 紫色に統一～♪
            padding: '8px 4px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {calculatedValue?.overflowCost || '0.0'}
          </span>
        </TableCell>
      )}
      {columnVisibility.subject && (
        <TableCell key={`subject-${row.col}-${index}`} align="center">
          <Autocomplete
            size="small"
            options={row.col === 0 ? party : partyWithCategory}
            groupBy={row.col === 0 ? undefined : (option) => option.role || "その他"}
            getOptionLabel={(option) => {
              // もし値がない場合は空文字を返す
              if (option === null || option === undefined) return '';
              
              // もし文字列ならそのまま返す（フリーソロモードやrow.subjectの場合）
              if (typeof option === 'string') return option;
              
              // オブジェクトならname属性を返す
              if (typeof option === 'object' && option.name) return option.name;
              
              // それ以外の場合は空文字を返す（安全策）
              return '';
            }}
            value={row.subject || ''}
            freeSolo
            disableClearable
            disabled={row.col === 0}
            onChange={(event, newValue) => {
              // 文字列か、オブジェクトならその名前を使用
              const valueToUse = typeof newValue === 'string' 
                ? newValue 
                : (newValue && newValue.name ? newValue.name : '');
              
              handleInputChange(row.col, 'subject', valueToUse);
              handleInputBlur(row.col, 'subject', valueToUse);
            }}
            onInputChange={(event, newValue) => {
              handleInputChange(row.col, 'subject', newValue || '');
            }}
            renderInput={(params) => (
              <TextField 
                {...params}
                fullWidth
                variant="outlined"
                size="small"
                onBlur={(e) => handleInputBlur(row.col, 'subject', e.target.value)}
                inputProps={{
                  ...params.inputProps,
                  style: { textAlign: 'center' }
                }}
              />
            )}
            sx={{
              '& .MuiOutlinedInput-root': {
                padding: '1px 9px',
              }
            }}
          />
        </TableCell>
      )}
      {columnVisibility.memo && (
        <TableCell key={`memo-${row.col}-${index}`} align="center">
          <TextField
            size="small"
            fullWidth
            disabled={row.col === 0}
            value={row.memo}
            onChange={(e) => handleInputChange(row.col, 'memo', e.target.value)}
            onBlur={(e) => handleInputBlur(row.col, 'memo', e.target.value)}
            inputProps={{
              style: { textAlign: 'center' }
            }}
          />
        </TableCell>
      )}
      {columnVisibility.dropout && (
        <TableCell key={`dropout-${row.col}-${index}`} align="center">
          <Autocomplete
            multiple
            id={`dropout-${row.col}`}
            size="small"
            disabled={row.col === 0}
            value={currentDropouts}
            onChange={(e, newValue) => handleDropoutChange(row.col, newValue)}
            options={party}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="脱落キャラ"
                sx={{ minWidth: 150 }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                // ここが重要！getTagPropsからkeyを取り出して個別に渡す
                const tagProps = getTagProps({ index });
                const { key, ...chipProps } = tagProps; // keyを分離
                
                return (
                  <Chip
                    key={key} // keyを直接渡す
                    variant="outlined"
                    label={option}
                    size="small"
                    {...chipProps} // key以外のプロパティはスプレッド
                    sx={{ 
                      bgcolor: '#ffebee', 
                      borderColor: '#f8bbd0',
                      '& .MuiChip-deleteIcon': {
                        color: '#ec407a'
                      }
                    }}
                  />
                );
              })
            }
          />
        </TableCell>
      )}
      {columnVisibility.score && (
        <TableCell key={`score-${row.col}-${index}`} align="center">
          <Box sx={{
            padding: '8px 4px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: '#d32f2f', // 赤系の色でスコアを目立たせるよ♪
            textAlign: 'center',
            fontFamily: 'monospace'
          }}>
            {(() => {
              // calculatedValuesから経過時間を取得
              const calcValue = calculatedValues.find(item => item.col === row.col);
              if (!calcValue || calcValue.elapsedTime === undefined) return '';
              
              const elapsedTime = calcValue.elapsedTime;
              
              // 難易度に応じたスコア計算～♪
              let difficultyScore = 0; // デフォルト値
              let remainingTimeScore = 0;
              let timeScore = 0;
              if (difficulty === 'LUNATIC') {
                difficultyScore = 44025000;
                if (battleTime === 240) {
                  remainingTimeScore = 0;
                }else if (battleTime === 180) {
                  remainingTimeScore = 0;
                } else {
                  remainingTimeScore = -1e10;
                }
                timeScore = 2880;
              } else if (difficulty === 'TORMENT') {
                difficultyScore = 12200000;
                if (battleTime === 240) {
                  remainingTimeScore = 19508000;
                }else if (battleTime === 180) {
                  remainingTimeScore = 18876000;
                } else {
                  remainingTimeScore = -1e10;
                }
                timeScore = 2400;
              } else if (difficulty === 'INSANE') {
                difficultyScore = 6800000;
                if (battleTime === 240) {
                  remainingTimeScore = 14216000;
                }else if (battleTime === 180) {
                  remainingTimeScore = 12449600;
                } else {
                  remainingTimeScore = -1e10;
                }
                timeScore = 1920;
              }else {
                difficultyScore = 4000000;
                if (battleTime === 240) {
                  remainingTimeScore = 6160000;
                }else if (battleTime === 180) {
                  remainingTimeScore = 5392000;
                } else {
                  remainingTimeScore = -1e10;
                }
                timeScore = 1440;
              }
              
              // スコア計算して少数第1位まで表示
              let score = Math.round(difficultyScore + remainingTimeScore + (3600 - elapsedTime - timeOfAnotherBattle) * timeScore);
              let scoreToDisplay = "";
              while (score > 0) {
                scoreToDisplay = (score % 1e3).toString().padStart(3, '0') + "," + scoreToDisplay;
                score = Math.floor(score / 1e3);
              }
              scoreToDisplay = scoreToDisplay.slice(0, -1);

              const scoreRegex = /^(0+)/g;
              return scoreToDisplay.replace(scoreRegex, '');
            })()}
          </Box>
        </TableCell>
      )}
    </TableRow>
  );
});

// ↑↑↑ このコンポーネントにdisplayNameを追加する ↑↑↑
SortableTableRow.displayName = 'SortableTableRow';

export default function TlScreen({ tlname }) {
  const [data, setData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  // 履歴管理用のステート追加
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistoryLength = 50; // 最大10個まで履歴保存

  // 列の表示状態を管理するstate
  const [columnVisibility, setColumnVisibility] = useState({
    operations: true,
    row: true,
    event: true,
    timing: true,
    late: true,
    subject: true,
    memo: true,
    cumulativeCost: true,
    requiredCost: true,
    costRecovery: false,
    remainingTime: true,
    remainingCost: true,
    dropout: true,
    overflowCost: true,
    score: true
  });

  // const [calculatedValues, setCalculatedValues] = useState({
  //   col: {},
  //   remainingTime: {},
  //   remainingCost: {},
  //   elapsedTime: {},
  //   displayCost: {},
  //   party: {},
  //   suggestion: {},
  //   cumulativeCost: {},
  //   costRecovery: {},
  //   costRecoveryToDisplay: {},
  //   requiredCost: {},
  //   timingRemainingTime: {},
  //   overflowCost: {},
  //   score: {},
  //   [fields]: {},
  // });
  const [calculatedValues, setCalculatedValues] = useState([]);

  // // タイミングに入力された値をm:ss.msに変換して格納する
  // const [timingRemainingTime, setTimingRemainingTime] = useState([]);

  // データの変更を履歴に追加する関数
  const addToHistory = (newData) => {
    // 現在の履歴インデックス以降の履歴を削除（新しい分岐を作成）
    const newHistory = history.slice(0, historyIndex + 1);
    
    // 新しい履歴を追加（深いコピーを作成）
    const newHistoryItem = JSON.parse(JSON.stringify(newData));
    
    // 最大長を超えないように調整
    if (newHistory.length >= maxHistoryLength) {
      newHistory.shift(); // 最も古い履歴を削除
    }
    
    // 新しい履歴を追加
    newHistory.push(newHistoryItem);
    
    // 履歴とインデックスを更新
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 一つ前の状態に戻す - データベースも更新しちゃうよ♪
  const undo = async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = [...history[newIndex]];
      
      // 状態を更新
      setHistoryIndex(newIndex);
      setData(previousState);
      
      // データベースに保存
      try {
        for (const record of previousState) {
          await invoke('update_todo_data', {
            todo: record
          });
        }

        toast.success('1つ前の状態に戻ったよ～♪', {
          icon: '⏪',
          duration: 1500,
        });
      } catch (error) {
        console.error('Undoでエラー:', error);
        toast.error('戻せなかったよ～(´；ω；`)', {
          icon: '😢',
          duration: 2000,
        });
      }
    } else {
      toast('これ以上戻れないよ～(◍•ᴗ•◍)', {
        icon: '⚠️',
        duration: 1500,
      });
    }
  };

  // 一つ後の状態に進む - データベースも更新しちゃうよ♪
  const redo = async () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = [...history[newIndex]];
      
      // 状態を更新
      setHistoryIndex(newIndex);
      setData(nextState);
      
      // データベースも更新しちゃう♪
      try {
        for (const record of nextState) {
          await invoke('update_todo_data', {
            todo: record
          });
        }
        
        toast.success('次の状態に進んだよ～♪ データベースも更新完了！', {
          icon: '⏩',
          duration: 1500,
        });
      } catch (error) {
        console.error('redo後のDB更新でエラー:', error);
        toast.error('状態は進んだけど、保存に失敗しちゃった…(´；ω；`)', {
          icon: '🙈',
          duration: 2000,
        });
      }
    } else {
      toast.error('これ以上進めないよ(｡>﹏<｡)', {
        icon: '🙈',
        duration: 1500,
      });
    }
  };

  // データをセットし、履歴にも追加
  const updateDataWithHistory = (newData) => {
    setData(newData);
    addToHistory(newData);
  };
  
  // 特定の行までの脱落キャラを取得する関数
  const getDropoutsUpToRow = useCallback((currentData, currentRowCol) => {
    return currentData
      .filter(row => row.col < currentRowCol)
      .reduce((acc, row) => {
        if (row.dropout) {
          try {
            const dropoutArray = row.dropout ? JSON.parse(row.dropout) : [];
            return [...acc, ...dropoutArray];
          } catch (e) {
            if (typeof row.dropout === 'string' && row.dropout.trim() !== '') {
              return [...acc, row.dropout];
            }
            return acc;
          }
        }
        return acc;
      }, []);
  }, []);
  
  // 行の脱落キャラが変更されたときの処理
  const handleDropoutChange = async (col, newDropouts) => {
    try {
      // 対象の行を探す
      const row = data.find(item => item.col === col);
      if (!row) {
        console.error(`行${col}が見つかりません`);
        return;
      }

      // データを変換
      const updatedData = data.map(item => 
        item.col === col ? { 
          ...item, 
          dropout: JSON.stringify(newDropouts)
        } : item
      );
      
      // ステート更新
      updateDataWithHistory(updatedData);
      
      // データベースに保存
      const updatedRow = updatedData.find(item => item.col === col);
      // tlnameが設定されていることを確認
      if (!updatedRow.tlname) {
        updatedRow.tlname = tlname;
      }
      
      console.log('送信する脱落データ:', updatedRow);
      
      // Tauriコマンドを使用してデータを保存
      await invoke('update_todo_data', {
        todo: updatedRow
      });
      
      toast.success('キャラ情報を更新したよ～♪', {
        icon: '👧',
        duration: 1500,
      });
    } catch (error) {
      console.error('脱落データの更新でエラー:', error);
      toast.error('キャラ情報を更新できなかったよ～(´；ω；`)', {
        icon: '😢',
        duration: 2000,
      });
    }
  };

  const getCurrentParty = (rowCol) => {
    // その行までの脱落キャラを取得
    const droppedOutCharacters = getDropoutsUpToRow(data, rowCol);
    
    // すでに脱落したキャラを除外したサジェスト候補を返す
    const party = suggestions.filter(suggestion => 
      !droppedOutCharacters.includes(suggestion)
    );
    party.sort((a, b) => a.localeCompare(b));

    return party;
  }

  // 特定の行で選択可能なサジェスト候補を取得
  const getAvailableSuggestionsForRow = useCallback((party, rowCol) => {
    let availableSuggestions = [...party];
    
    for (let i = 0; i < party.length; i++) {
      const suggestion = party[i];
      if (oneCostReducer.some(student => student.name === suggestion)) {
        if (suggestion === "マリー(アイドル)") {
          let times = 0;
          for (let j = rowCol-1; j > 0; j--) { 
            times += data[j].event === "マリー(アイドル)" ? 1 : 0;
            if (data[j].event === "マリー(アイドル)SS") {
              break;
            }
            if (times === 3) {
              availableSuggestions = [...availableSuggestions, "マリー(アイドル)SS"];
              break;
            }
          }
        } else {
          availableSuggestions = [...availableSuggestions, oneCostReducer.find(student => student.name === suggestion).eventName];
        }
      }
      if (suggestion === "ヒナ(ドレス)") {
        availableSuggestions = [...availableSuggestions, "ヒナ(ドレス) 1射目", "ヒナ(ドレス) 2射目", "ヒナ(ドレス) 3射目"];
      }
      if (suggestion === "リオ") {
        let rioList = [];
        for (let j = 1; j <rowCol; j++) {
          if (data[j].event && data[j].event === "リオ" && data[j].subject) {
            rioList = [...rioList, data[j].subject + "(リオ©)"];
          }
          if (data[j].event && data[j].event.endsWith("(リオ©)")) {
            rioList = rioList.filter(item => item !== data[j].event);
          }
        }
        availableSuggestions = [...availableSuggestions, ...rioList];
      }

      if (exCostBoost.some(student => student.name === suggestion)) {
        if (suggestion === "ノア(パジャマ)") {
          let noaTimes = 0;
          let endflag = false;
          let startflag = false;
          for (let j = rowCol-1; j > 0; j--) {
            if (data[j].event.replace("(リオ©)", "") === "ノア(パジャマ)") {
              noaTimes++;
            }
            if (data[j].event === "ノア(パジャマ) end") {
              endflag = true;
            }
            if (endflag === false && data[j].event === "ノア(パジャマ) start") {
              availableSuggestions = [...availableSuggestions, "ノア(パジャマ) end"];
              endflag = true;
              if (noaTimes < 2) {
                startflag = true;
              }
            }
          }
          if ((noaTimes%3 === 2) && startflag === false) {
            availableSuggestions = [...availableSuggestions, "ノア(パジャマ) start"];
          }
        } else {
          for (let j = rowCol-1; j > 0; j--) {
            if (data[j].event && data[j].event.replace("(リオ©)", "") === suggestion) {
              availableSuggestions = [...availableSuggestions, suggestion + " start"];
            break;
            }
            if (data[j].event && data[j].event === (suggestion + " start")) {
              availableSuggestions = [...availableSuggestions, suggestion + " end"];
              break;
            }
            if (data[j].event && data[j].event === (suggestion + " end")) {
              break;
            }
          }
        }
      }
    }
    
    availableSuggestions.sort((a, b) => a.localeCompare(b));

    return availableSuggestions;
  }, [getDropoutsUpToRow, data, suggestions]);

  // サジェスト候補の取得
  const fetchParty = async () => {
    try {
        // Rustの関数を呼び出してデータを取得
        const studentNames = await invoke('get_party_data', { tlname });
        
        // データをソートして設定
        const sortedNames = studentNames.sort((a, b) => a.localeCompare(b));
        setSuggestions(sortedNames);
    } catch (error) {
        console.error('編成データの取得でエラー:', error);
        toast.error('編成データの取得に失敗しちゃった…(´；ω；`)', {
            icon: '😿',
            duration: 2000,
        });
    }
};

    // データの取得
    const fetchData = async () => {
        try {
            // TLデータを取得
            const fetchedData = await invoke('get_tl_all_data', { tlname });
            
            // 戦闘設定を取得
            const settings = await invoke('get_tl_settings', { tlname });
            if (settings) {
                if (settings.boss_name) {
                    bossName = settings.boss_name;
                    battleTime = bossProperties.find(boss => boss.name === bossName)?.battleTime || 240;
                }
                if (settings.cost_at_first !== undefined) {
                    initialCost = settings.cost_at_first;
                }
                if (settings.difficulty !== undefined) {
                    difficulty = settings.difficulty;
                }
                if (settings.time_of_another_battle !== undefined) {
                    timeOfAnotherBattle = settings.time_of_another_battle;
                }
            }
            
            // 新しい処理：戦闘開始行が存在するかにかかわらず、必ず最初に削除してから追加する
            let updatedData = [...fetchedData];
            let updatedCalculatedValues = [...calculatedValues];

            // 戦闘開始行（col=0の行）が存在するか確認
            const hasBattleStartRow = updatedData.some(row => row.col === 0 && row.event === "戦闘開始");
            
            // 存在する場合は削除
            if (hasBattleStartRow) {
                updatedData = updatedData.filter(row => row.col !== 0);
                updatedCalculatedValues = updatedCalculatedValues.filter(row => row.col !== 0);
            }
            
            // 新しい戦闘開始行を作成
            const bminutes = Math.floor((battleTime-2) / 60);
            const bseconds = Math.floor((battleTime-2) % 60);
            const bms = Math.floor((battleTime-2) % 1 * 1000);
            const timeDisplay = `${bminutes}:${bseconds.toString().padStart(2, '0')}.${bms.toString().padStart(3, '0')}`;
            const battleStartRow = {
                tlname,
                col: 0,
                event: "戦闘開始",
                timing: "",
                late: false,
                subject: "",
                memo: "",
                dropout: '[]'
            };
            
            const calculatedBattleStartRow = {
                col: 0,
                remainingTime: timeDisplay,
                remainingCost: initialCost,
                elapsedTime: 2.0,
                displayCost: 0.0,
                party: [],
                suggestion: [],
                cumulativeCost: 0,
                costRecovery: null,
                costRecoveryToDisplay: null,
                requiredCost: null,
                timingRemainingTime: null,
                overflowCost: 0.0,
                score: 0,
            }

            // 戦闘開始行を先頭に追加
            updatedData.unshift(battleStartRow);
            updatedCalculatedValues.unshift(calculatedBattleStartRow);

            setData(updatedData);
            setCalculatedValues(updatedCalculatedValues);
            
            // 履歴を初期化
            setHistory([updatedData]);
            setHistoryIndex(0);
            
            // 成功メッセージを表示
            toast.success('データを読み込んだよ～♪', {
                icon: '📚',
                duration: 1500,
            });
            
        } catch (error) {
            console.error('データの取得でエラーが発生しました:', error);
            toast.error('データの取得に失敗しました(´；ω；`)', {
                duration: 3000,
                icon: '😿'
            });
        }
    };

  // 行の削除
  const deleteRow = async (colToDelete) => {
    try {
        // 削除する行が存在するか確認
        if (!data.find(row => row.col === colToDelete)) {
            throw new Error('削除しようとした行が見つからないよ～(´・ω・`)');
        }

        // Rustの関数を呼び出して行を削除
        await invoke('delete_todo_row', {
            tlname: tlname,
            col: colToDelete
        });

        // 削除後のデータを作成
        // 1. 指定した行を削除
        // 2. その後の行のcolを-1する
        const newData = data
            .filter(row => row.col !== colToDelete)
            .map(row => ({
                ...row,
                col: row.col > colToDelete ? row.col - 1 : row.col
            }));

        // 履歴に追加して画面を更新
        updateDataWithHistory(newData);
        
        toast.success('行を削除したよ～♪', {
            icon: '🗑️',
            duration: 1500,
        });
    } catch (error) {
        console.error('削除でエラーしちゃった...:', error);
        toast.error('削除できなかったよ～(´；ω；`)', {
            icon: '😢',
            duration: 2000,
        });
        // エラーが起きたら最新データを再取得
        await fetchData();
    }
};

  // saveAllData関数の修正
  const saveAllData = async () => {
    try {
      if (!data || data.length === 0) {
        toast.error('保存するデータがないよ～(´・ω・｀)', {
          icon: '📝',
          duration: 1500,
        });
        return;
      }

      // すべての行にtlnameが設定されていることを確認
      const processedData = data.map(row => {
        let updatedRow = { ...row };
        // tlnameが設定されていなければ追加
        if (!updatedRow.tlname) {
          updatedRow.tlname = tlname;
        }
        // dropoutが配列の場合は文字列化
        if (updatedRow.dropout && typeof updatedRow.dropout !== 'string') {
          updatedRow.dropout = JSON.stringify(updatedRow.dropout);
        }
        return updatedRow;
      });

      // 保存処理開始をトースト表示
      toast.loading('データを保存中...', {
        duration: 2000,
      });

      // 一つずつデータを保存
      for (const record of processedData) {
        await invoke('update_todo_data', {
          todo: record
        });
      }

      toast.success('全部保存できたよ～♪', {
        icon: '💾',
        duration: 1500,
      });
    } catch (error) {
      console.error('データ保存でエラー:', error);
      toast.error('保存できなかったよ～(´；ω；`)', {
        icon: '😢',
        duration: 2000,
      });
    }
  };

  // 入力中の更新（ローカルのみ）
  const handleInputChange = (col, field, value) => {
    const newData = data.map(item =>
      item.col === col ? { ...item, [field]: value } : item
    );
    setData(newData);
  };

  // handleInputBlur関数の修正
  const handleInputBlur = async (col, field, value) => {
    try {
      // 対象の行を探す
      const row = data.find(item => item.col === col);
      if (!row) {
        console.error(`行${col}が見つかりません`);
        return;
      }
      
      // 変更内容をデータベースに保存
      const updatedRow = { ...row, [field]: value };
      // tlnameが設定されていることを確認
      if (!updatedRow.tlname) {
        updatedRow.tlname = tlname;
      }
      addToHistory(data);
      
      // Tauriコマンドを使用してデータを保存
      await invoke('update_todo_data', {
        todo: updatedRow
      });
      
      toast.success('データを更新したよ～♪', {
        icon: '✨',
        duration: 1500,
      });
    } catch (error) {
      console.error('データ更新でエラー:', error);
      toast.error('更新できなかったよ～(´；ω；`)', {
        icon: '😢',
        duration: 2000,
      });
    }
  };

  // handleCheckboxChange関数の修正
  const handleCheckboxChange = async (col, field, checked) => {
    try {
      // 対象の行を探す
      const row = data.find(item => item.col === col);
      if (!row) {
        console.error(`行${col}が見つかりません`);
        return;
      }
      
      // データの更新
      const updatedData = data.map(item => 
        item.col === col ? { ...item, [field]: checked } : item
      );
      
      // ステート更新
      setData(updatedData);
      
      // 履歴に追加
      addToHistory(updatedData);
      
      // データベースに保存
      const updatedRow = { ...row, [field]: checked };
      // tlnameが設定されていることを確認
      if (!updatedRow.tlname) {
        updatedRow.tlname = tlname;
      }
      
      console.log('送信するデータ:', updatedRow);
      
      // Tauriコマンドを使用してデータを保存
      await invoke('update_todo_data', {
        todo: updatedRow
      });
      
      toast.success(`${field === 'late' ? '最遅' : field}を更新したよ～♪`, {
        icon: '✅',
        duration: 1500,
      });
    } catch (error) {
      console.error(`${field}の更新でエラー:`, error);
      toast.error('更新できなかったよ～(´；ω；`)', {
        icon: '😢',
        duration: 2000,
      });
    }
  };

  // 行の下に新しい行を追加する関数
  const insertRowBelow = async (position) => {
    try {
      // 新しい行のデータを作成
      const newRow = {
        tlname: tlname, // tlnameを明示的に追加
        col: position + 1,
        event: '',
        timing: '',
        late: false, // 文字列ではなくbooleanに修正
        subject: '',
        memo: '',
        dropout: JSON.stringify([])
      };

      // 既存のデータをコピー
      const updatedData = [...data];
      
      // position+1より大きいcolを持つ行は、全て+1する
      for (let i = 0; i < updatedData.length; i++) {
        if (updatedData[i].col > position) {
          updatedData[i].col += 1;
        }
      }

      // 新しい行を挿入位置の次に追加
      updatedData.splice(position + 1, 0, newRow);
      
      // ★重要な修正：すべての行のdropoutが文字列であることを確認★
      const processedData = updatedData.map(row => {
        // tlnameが含まれていることを確認
        if (!row.tlname) {
          row.tlname = tlname;
        }
        // dropoutが配列の場合は文字列化する
        if (row.dropout && typeof row.dropout !== 'string') {
          return {
            ...row,
            dropout: JSON.stringify(row.dropout)
          };
        }
        return row;
      });
      
      // col値を順番に振り直す
      const reorderedData = processedData.map((item, index) => ({
        ...item,
        col: index
      }));
      
      // データベースを一括更新（一つずつ保存）
      for (const record of reorderedData) {
        await invoke('update_todo_data', {
          todo: record
        });
      }

      // ローカルのデータと履歴を更新
      updateDataWithHistory(reorderedData);
      toast.success('新しい行を追加したよ～♪', {
        icon: '✨',
        duration: 1500,
      });
    } catch (error) {
      console.error('行の追加でエラー:', error);
      toast.error('行を追加できなかったよ～(´；ω；`)', {
        icon: '😢',
        duration: 2000,
      });
    }
  };

  // 列の表示/非表示を切り替える関数
  const toggleColumnVisibility = (columnName) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }));
  };

  // コスト回復力の計算処理
  const calculateCostRecovery = (party, row) => {
    let recovery = party.length * 0.07;
    const rowCol = row.col;

    const hasCherino = party.includes("チェリノ");
    if (hasCherino) {
      recovery += 0.0511;
      
      // レッドウィンターの人数を数える
      const redWinterCount = redWinterCharactersWithoutCherino.filter(
        character => party.includes(character)
      ).length;
      
      const limitedCount = Math.min(redWinterCount, 3);
      recovery += limitedCount * 0.0146;
    }

    // exコストブースターに関する処理
    for (let i = 0; i < party.length; i++) {
      if (exCostBoost.some(student => student.name === party[i])) {
        for (let j = rowCol-1; j > 0; j--) {
          if (data[j].event === (party[i] + " start")) {
            recovery += exCostBoost.find(boost => boost.name === party[i]).costRecovery;
            break;
          }
          if (data[j].event === (party[i] + " end")) {
            break;
          }
        }
      }
    }
    
    const hasBoostCharacter = ssCostBoost.some(booster => 
      party.includes(booster)
    );
    
    if (hasBoostCharacter) {
      recovery *= 1.2029;
    }
    
    return recovery;
  };

// タイミング列のフォーマット処理を追加
  const formatTimingValue = (value, costRecovery, prevCost, prevElapsedTime, currentRowIndex, newElapsedTimes) => {
    // 数式パターンをチェック（=で始まる場合）
    if (typeof value === 'string' && value.trim().startsWith('=')) {
      try {
        // 計算用の式を取得（=を除去）
        const formula = value.trim().substring(1);
        
        // キャラ参照パターンのチェック（=[キャラ名]+/-数値 の形式）
        const characterReferenceRegex = /\[(.*?)\]([+\-])([\d.]+)/;
        if (characterReferenceRegex.test(formula)) {
          const match = characterReferenceRegex.exec(formula);
          const characterName = match[1]; // キャラ名 (例: "ホシノ")
          const operator = match[2];      // 演算子 (+ または -)
          const offsetValue = parseFloat(match[3]); // 数値 (例: 3.2)
          
          // 過去の行を検索（現在の行より前の行から探す）
          let targetElapsedTime = null;
          for (let i = currentRowIndex - 1; i >= 0; i--) {
            const row = data[i];
            if (row && row.event === characterName) {
              // 対応する経過時間を取得
              targetElapsedTime = newElapsedTimes[i];
              break;
            }
          }
          
          // 該当するキャラが見つかった場合
          if (targetElapsedTime !== null) {
            // 演算子に基づいて計算
            if (operator === '+') {
              return targetElapsedTime - offsetValue;
            } else { // '-'の場合
              return targetElapsedTime + offsetValue;
            }
          }
          
          // キャラが見つからなかった場合は前の値を返す
          console.warn(`${characterName}が見つからなかったよ～(´・ω・\`)`, value);
          return 2;
        }
        
        const convertTimeToSeconds = (timeStr) => {
          const timeRegex = /(\d+):(\d{2})(?:\.(\d{1,3}))?/;
          const match = timeRegex.exec(timeStr);
          
          if (match) {
            // 残り時間（想定）を秒数に変換
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3], 10) / 1000 : 0;
            return minutes * 60 + seconds + ms;
          }
          
          return parseFloat(timeStr); // 時間形式でなければそのまま数値変換
        };

        const firstTimeRegex = /(\d+):(\d{2})(?:\.(\d{1,3}))?/;
        const secondTimeRegex = /(\d+):(\d{1})/;
        const thirdTimeRegex = /(\d+)?/;
        
        // 入力値のパターンに応じた処理
        if (firstTimeRegex.test(formula)) {
          // 数式内の時間形式を秒数に置換
          let processedFormula = formula.replace(/\d+:\d{2}(?:\.\d{1,3})?/g, (match) => {
            return convertTimeToSeconds(match);
          });
          
          // 一般的な数学記号を適切なJavaScript演算子に変換
          processedFormula = processedFormula
            .replace(/\^/g, '**')  // ^ を ** に変換（指数演算子）
            .replace(/÷/g, '/')    // ÷ を / に変換
            .replace(/×/g, '*');   // × を * に変換
          
          // 末尾の演算子を削除（これが原因でエラーになりがち！）
          processedFormula = processedFormula.replace(/[+\-*/%()\s]+$/, '');
          
          // 演算子の連続使用を防止（例: 1++2 → 1+2）
          processedFormula = processedFormula.replace(/([+\-*/])[+\-*/]+/g, '$1');
          
          // かっこの数が合わない場合は修正
          const openBrackets = (processedFormula.match(/\(/g) || []).length;
          const closeBrackets = (processedFormula.match(/\)/g) || []).length;
          if (openBrackets > closeBrackets) {
            processedFormula += ')'.repeat(openBrackets - closeBrackets);
          } else if (closeBrackets > openBrackets) {
            processedFormula = '('.repeat(closeBrackets - openBrackets) + processedFormula;
          }
          
          // 構文エラーになりそうな特殊ケースをチェック
          // 数値や演算子以外の文字が含まれているか確認（Math.などの例外を除く）
          if (/[a-zA-Z$_]/.test(processedFormula) && !/Math\./.test(processedFormula)) {
            console.warn('不正な構文が含まれています:', processedFormula);
            return prevElapsedTime; // エラー時は前の値を返す
          }
          
          // 危険な文字や構文をチェック
          if (/[<>?:`!@#$%&;\\]/.test(processedFormula)) {
            console.warn('不正な文字が含まれています:', processedFormula);
            return prevElapsedTime;
          }
          
          // 最終的な式のバリデーション - 構文エラーをチェック
          // 有効なJavaScript式かどうかを事前検証
          try {
            // 式が空または数値だけの場合は直接評価
            if (!processedFormula || /^\d+(\.\d*)?$/.test(processedFormula)) {
              const result = processedFormula ? parseFloat(processedFormula) : 0;
              return battleTime - result;
            }
            
            // 括弧のバランスを確認（括弧の中に何もない場合もエラー）
            if (processedFormula.includes('()')) {
              console.warn('空の括弧があります:', processedFormula);
              return prevElapsedTime;
            }
            
            // JavaScriptの構文として有効かプリチェック
            Function(`"use strict"; return (${processedFormula});`);
            
            // 問題なければ評価を実行
            const result = new Function(`"use strict"; return (${processedFormula});`)();
            
            // 結果が有効な数値かチェック
            if (isNaN(result) || !isFinite(result)) {
              console.warn('計算結果が無効です:', result);
              return prevElapsedTime;
            }
            
            // 最後に経過時間として返す
            return battleTime - result;
          } catch (evalError) {
            console.error('数式評価エラー:', evalError, '式:', processedFormula);
            return prevElapsedTime; // エラー時は前の値を返す
          }
        } else if (secondTimeRegex.test(formula)) {
          const [minutes, seconds] = formula.split(':').map(Number);
          const remainingTimeInSeconds = parseFloat(minutes) * 60 + parseFloat(seconds) * 10;

          // 最後に経過時間として返す
          return battleTime - remainingTimeInSeconds;
        } else if (thirdTimeRegex.test(formula) && formula.endsWith(':')) {
          // 最後の":"をなくす
          const timeStr = formula.substring(0, formula.length-1);
          const minutesValue = parseFloat(timeStr);
          
          if (!isNaN(minutesValue)) {
            return battleTime - minutesValue * 60;
          }
          return prevElapsedTime; // パース失敗時は前の値
        } 
        // どのパターンにも一致しない場合は前の値を返す
        return prevElapsedTime;
        
      } catch (error) {
        console.error('数式の評価に失敗しました:', error, value);
        return prevElapsedTime; // エラーの場合は前の値を返す
      }
    }
    
    // m:ss.ms 形式かどうかをチェック
    const timeFormatRegex = /^\d+:\d{2}\.\d{1,3}$/;
    
    if (timeFormatRegex.test(value)) {
      const [minutes, seconds] = value.split(':');
      const [secondsInt, ms] = seconds.split('.');
      const timeInSeconds = minutes * 60 + parseInt(secondsInt, 10) + parseInt(ms, 10) / 1000;
      return battleTime - timeInSeconds;
    }

    const timeFormatRegex2 = /^\d+:\d{2}$/;
    if (timeFormatRegex2.test(value)) {
      const [minutes, seconds] = value.split(':').map(Number);
      const timeInSeconds = battleTime - (minutes * 60 + seconds);
      return timeInSeconds;
    }
    
    // 数値に変換を試みる
    const numValue = parseFloat(value);
    
    if (!isNaN(numValue) && costRecovery > 0) {
      // 数値をコスト回復力で割る
      const timeInSeconds = (numValue - prevCost) / costRecovery + prevElapsedTime;
      
      return timeInSeconds;
    }
    
    // 変換できない場合は元の値を返す
    return value;
  };

  const calculateRequiredCost = (event, col) => {
    let rioflag = false;
    let noaflag = false;
    if (event.endsWith("(リオ©)")) {
      rioflag = true;
      event = event.replace("(リオ©)", "");
    }
    if (event === "ノア(パジャマ)") {
      let noaTimes = 1;
      for (let i = col-1; i > 0; i--) {
        const row = data[i];
        const rowEvent = row.event.replace("(リオ©)", "");
        if (rowEvent === "ノア(パジャマ)") {
          noaTimes++;
        }
      }
      if (noaTimes%3 === 0) {
        noaflag = true;
      }
    }
    const excostEntry = excosts.find(student => student.name === event);
    if (!excostEntry) {
      return 0;
    }
    const rioOne = rioflag ? 1 : 0;
    const noaTwo = noaflag ? 2 : 0;
    let requiredCost = excostEntry.excost - rioOne - noaTwo;
    let times = 0;
    const maxTimes = costHalver.reduce((max, student) => Math.max(max, student.times), -Infinity);
    // フウカ(正月)やウイセイアの半減やマリー(アイドル)やココナの1回減らしの処理
    for (let i = col-1; i > 0; i--) {
      const row = data[i];
      const rowEvent = row.event.replace("(リオ©)", "");
      if (rowEvent === event) {
        times++;
        if (times === maxTimes) {
          return requiredCost;
        }
      }
      if (costHalver.some(student => student.name === rowEvent) && row.subject === event) {
        if (costHalver.find(student => student.name === rowEvent).times > times) {
          return Math.ceil(requiredCost/2);
        } else {
          return requiredCost;
        }
      }
      if (oneCostReducer.some(student => student.eventName === rowEvent)) {
        if (event === oneCostReducer.find(student => student.eventName === rowEvent).name) {
          continue;
        }
        if (times === 0) {
          return requiredCost-1;
        } else {
          return requiredCost;
        }
      } 
    }
    // このイベント以前にコスト減少効果をもつキャラがいなかったかつ、初使用の場合で、シロコ(水着)がいる場合はコストを1減らす
    if (event !== "シロコ(水着)" && times === 0 && firstOneCostReducer.reduce((acc, student) => acc || suggestions.some(member => member === student.name), false)) {
      return requiredCost-1;
    }
    return requiredCost;
  }
  // 計算結果のステートを更新する関数
  const updateCalculatedValues = useCallback(() => {
    // 各行についての計算結果を格納するステート
    const newCol = {};
    const newRemainingTimes = {};
    const newRemainingCosts = {};
    const newElapsedTimes = {};
    const newDisplayCosts = {};
    const newPartys = {};
    const newSuggestions = {};
    const newCumulativeCosts = {};
    const newCostRecovery = {};
    const newCostRecoveryToDisplay = {};
    const newRequiredCost = {};
    const newTimingRemainingTime = {};
    const newOverflowCosts = {};

    // まずは元のデータから初期値をコピー
    if (calculatedValues.length > 0) {
      const firstRow = calculatedValues[0];
      newCol[0] = firstRow.col;
      newRemainingTimes[0] = firstRow.remainingTime;
      newRemainingCosts[0] = firstRow.remainingCost;
      newElapsedTimes[0] = firstRow.elapsedTime;
      newDisplayCosts[0] = firstRow.remainingCost;
      newPartys[0] = firstRow.party;
      newSuggestions[0] = firstRow.suggestion;
      newCumulativeCosts[0] = firstRow.cumulativeCost;
      newCostRecovery[0] = firstRow.costRecovery;
      newCostRecoveryToDisplay[0] = firstRow.costRecoveryToDisplay;
      newRequiredCost[0] = firstRow.requiredCost;
      newTimingRemainingTime[0] = firstRow.timingRemainingTime;
    } else {
      // 配列が空の場合は初期値をセットするよ～♪
      newCol[0] = 0;
      newRemainingTimes[0] = `${Math.floor((battleTime-2) / 60)}:${Math.floor((battleTime-2) % 60).toString().padStart(2, '0')}.000`;
      newRemainingCosts[0] = initialCost;
      newElapsedTimes[0] = 2.0;
      newDisplayCosts[0] = initialCost;
      newPartys[0] = [];
      newSuggestions[0] = [];
      newCumulativeCosts[0] = 0;
      newCostRecovery[0] = null;
      newCostRecoveryToDisplay[0] = null;
      newRequiredCost[0] = null;
      newTimingRemainingTime[0] = null;
    }

    let cumulativeCost = 0;
    // 先頭行から順に計算（戦闘開始行はそのまま）
    for (let i = 1; i < data.length; i++) {
      const row = data.find(item => item.col === i);
      // rowが見つからない場合はスキップ
      if (!row) continue;
      
      const prevRow = data.find(item => item.col === i - 1);
      // prevRowが見つからない場合の安全対策
      if (!prevRow) {
        console.warn(`行${i}の前の行(${i-1})が見つからないよ～(>_<)`);
        continue; // この行の処理をスキップ
      }
      
      const prevRowCol = prevRow.col;

      newCol[i] = row.col;
      // 必要コストと累積コストの更新
      const eventName = row.event || '';
      const requiredCost = calculateRequiredCost(eventName, i);
      cumulativeCost += requiredCost;

      newRequiredCost[i] = requiredCost === 0 ? null : requiredCost;
      newCumulativeCosts[i] = cumulativeCost;

      // 現在のパーティを取得
      const party = getCurrentParty(i);
      newPartys[i] = party;
      // サジェスト候補の取得
      const availableSuggestions = getAvailableSuggestionsForRow(party, i);
      newSuggestions[i] = availableSuggestions;

      // 残り時間と残りコストの計算
      // まずはコスト回復力の計算
      const costRecovery = calculateCostRecovery(party, row);
      newCostRecovery[i] = costRecovery;
      newCostRecoveryToDisplay[i] = costRecovery.toFixed(4);

      // イベント列が空の場合は前の行の値をコピー
      if (!row.event || row.event.trim() === "") {
        newRemainingTimes[row.col] = newRemainingTimes[prevRowCol];
        newRemainingCosts[row.col] = newRemainingCosts[prevRowCol];
        newElapsedTimes[row.col] = newElapsedTimes[prevRowCol];
        newDisplayCosts[row.col] = newDisplayCosts[prevRowCol];
      } else {
        // 必要コスト/回復力で時間を計算（回復力が0の場合はエラーを防ぐ）
        if (costRecovery > 0) {
          // 前の行の残りコストを取得
          let prevCost = 0;
          const prevCostValue = newRemainingCosts[prevRowCol];
          if (prevCostValue) {
            prevCost = parseFloat(prevCostValue);
          }
          // 前の行の経過時間を取得
          const prevElapsedTime = newElapsedTimes[prevRowCol];

          if (row.event.replace("(リオ©)", "") === "ヒナ(ドレス)" || row.event === "ヒナ(ドレス) 1射目" || row.event === "ヒナ(ドレス) 2射目" || row.event === "ヒナ(ドレス) 3射目") {
            let dressHina = i;
            for (let j = i-1; j > 0; j--) {
              if (data[j].event.replace("(リオ©)", "") === "ヒナ(ドレス)" || data[j].event === "ヒナ(ドレス) 1射目" || data[j].event === "ヒナ(ドレス) 2射目" || data[j].event === "ヒナ(ドレス) 3射目") {
                dressHina = j;
                break;
              }
            }
            let leastPlusTime = 0;
            if (dressHina === i) {
              dressHina = i-1;
            } else if (data[dressHina].event.replace("(リオ©)", "") === "ヒナ(ドレス)") {
              leastPlusTime = 1.8;
            } else if (data[dressHina].event.replace("(リオ©)", "") === "ヒナ(ドレス) 1射目") {
              leastPlusTime = 2.367;
            } else if (data[dressHina].event.replace("(リオ©)", "") === "ヒナ(ドレス) 2射目") {
              leastPlusTime = 3.1;
            } else if (data[dressHina].event.replace("(リオ©)", "") === "ヒナ(ドレス) 3射目") {
              leastPlusTime = 2.2;
            }
            const timing = row.late ? 10.0 : row.timing;
            let formattedTiming = formatTimingValue(timing, costRecovery, prevCost, prevElapsedTime, i, newElapsedTimes);

            if (formattedTiming) {
              newElapsedTimes[row.col] = formattedTiming;  
            } else {
              const timeRequired = (requiredCost - prevCost) / costRecovery;
              
              // 新しい残り時間を計算（秒単位）
              const newElapsedTime = prevElapsedTime + Math.max(0.5, timeRequired);
              newElapsedTimes[row.col] = newElapsedTime;
            }
            newElapsedTimes[row.col] = Math.max(newElapsedTimes[dressHina] + leastPlusTime, newElapsedTimes[row.col]);
            newElapsedTimes[row.col] = Math.max(newElapsedTimes[row.col], row.late ? 10.0 : row.timing);
            const minutes = Math.floor((battleTime - newElapsedTimes[row.col]) / 60);
            const seconds = Math.floor((battleTime - newElapsedTimes[row.col]) % 60);
            const ms = Math.round(((battleTime - newElapsedTimes[row.col]) % 1) * 1000);
            newRemainingTimes[row.col] = `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
            newRemainingCosts[row.col] = (newElapsedTimes[row.col] - prevElapsedTime) * costRecovery + prevCost - requiredCost;
            newDisplayCosts[row.col] = (Math.abs(newRemainingCosts[row.col])< 1e-10 ? 0.0 : newRemainingCosts[row.col]).toFixed(1);  
          // exコストブースター + " start" または　+ " end" の場合
          } else if (exCostBoost.some(student => ((student.name + " start") === row.event) || ((student.name + " end") === row.event))) {
            const booster = exCostBoost.find(student => student.name === row.event.replace(" start", "").replace(" end", ""));
            const stName = booster.name;
            let plusTime = 0;
            let exCol = i;
            if (row.event === (stName + " start")) {
              for (let j = i-1; j > 0; j--) {
                if (data[j].event.replace("(リオ©)", "") === stName) {
                  exCol = j;
                  break;
                }
              }
              plusTime = booster.start;
            } else {
              for (let j = i-1; j > 0; j--) {
                if (data[j].event === (stName + " start")) {
                  exCol = j;
                  break;
                }
              }
              plusTime = booster.duration;
            }
            newElapsedTimes[row.col] = newElapsedTimes[exCol] + plusTime;
            const minutes = Math.floor((battleTime - newElapsedTimes[row.col]) / 60);
            const seconds = Math.floor((battleTime - newElapsedTimes[row.col]) % 60);
            const ms = Math.round(((battleTime - newElapsedTimes[row.col]) % 1) * 1000);
            newRemainingTimes[row.col] = `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
            newRemainingCosts[row.col] = (newElapsedTimes[row.col] - prevElapsedTime) * costRecovery + prevCost - requiredCost;
            newDisplayCosts[row.col] = (Math.abs(newRemainingCosts[row.col])< 1e-10 ? 0.0 : newRemainingCosts[row.col]).toFixed(1);   
          } else {
            // タイミング列を変換したものを取得、そして更新
            const timing = row.late ? 10.0 : row.timing;
            let formattedTiming = formatTimingValue(timing, costRecovery, prevCost, prevElapsedTime, i, newElapsedTimes);

            if (formattedTiming) {
              newElapsedTimes[row.col] = formattedTiming;
              const minutes = Math.floor((battleTime - formattedTiming) / 60);
              const seconds = Math.floor((battleTime - formattedTiming) % 60);
              const ms = Math.round(((battleTime - formattedTiming) % 1) * 1000);
              newRemainingTimes[row.col] = `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
              newRemainingCosts[row.col] = (newElapsedTimes[row.col] - prevElapsedTime) * costRecovery + prevCost - requiredCost;
              newDisplayCosts[row.col] = (Math.abs(newRemainingCosts[row.col])< 1e-10 ? 0.0 : newRemainingCosts[row.col]).toFixed(1);   
            } else {
              const timeRequired = (requiredCost - prevCost) / costRecovery;
              
              // 新しい残り時間を計算（秒単位）
              const newElapsedTime = prevElapsedTime + Math.max(0.5, timeRequired);
              newElapsedTimes[row.col] = newElapsedTime;

              // 秒単位から mm:ss.ms 形式に変換して格納
              const newMinutes = Math.floor((battleTime - newElapsedTime) / 60);
              const newSeconds = Math.floor((battleTime - newElapsedTime) % 60);
              const newMs = Math.floor(((battleTime - newElapsedTime) % 1) * 1000);
              
              newRemainingTimes[row.col] = `${newMinutes}:${newSeconds.toString().padStart(2, '0')}.${newMs.toString().padStart(3, '0')}`;
            
              // 時間差分を計算
              const timeDifference = newElapsedTime - prevElapsedTime;
              
              // 残りコストを計算 (前のコスト + 回復力*時間差分 - 必要コスト)
              const newCost = prevCost + (costRecovery * timeDifference) - requiredCost;
              newRemainingCosts[row.col] = newCost;
              newDisplayCosts[row.col] = (Math.abs(newCost) < 1e-10 ? 0.0 : newCost).toFixed(1);
            }
          }
        }
      }

      // 消失コストがある場合の残りコストと消失コストを計算するよ～
      if (newRemainingCosts[row.col] + requiredCost  > 10.0) {
        newOverflowCosts[row.col] = (newRemainingCosts[row.col] + requiredCost - 10.0).toFixed(1);
        newRemainingCosts[row.col] = 10.0-requiredCost;
        newDisplayCosts[row.col] = newRemainingCosts[row.col].toFixed(1);
      } else {
        newOverflowCosts[row.col] = '0.0';
      }
    }
    
    // 計算結果をステートに保存するよ～
    const updatedCalculatedValues = Object.keys(newCol).map((colKey) => {
      const col = parseInt(colKey);
      return {
        col: col,
        remainingTime: newRemainingTimes[col],
        remainingCost: newRemainingCosts[col],
        elapsedTime: newElapsedTimes[col],
        displayCost: newDisplayCosts[col],
        party: newPartys[col],
        suggestion: newSuggestions[col],
        cumulativeCost: newCumulativeCosts[col],
        costRecovery: newCostRecovery[col],
        costRecoveryToDisplay: newCostRecoveryToDisplay[col],
        requiredCost: newRequiredCost[col],
        timingRemainingTime: newTimingRemainingTime[col],
        overflowCost: newOverflowCosts[col] || '0.0'
      };
    });
    
    setCalculatedValues(updatedCalculatedValues);
  }, [data, suggestions, battleTime, initialCost, difficulty]);

  // タイミング入力変更処理
  const handleTimingChange = async (col, value) => {
    try {
      // 対象の行を探す
      const row = data.find(item => item.col === col);
      if (!row) {
        console.error(`行${col}が見つかりません`);
        return;
      }

      // データの更新 - 入力された値をそのまま保存
      const updatedData = data.map(item => 
        item.col === col ? { ...item, timing: value } : item
      );
      
      // ステート更新
      updateDataWithHistory(updatedData);
      
      // データベースに保存 - 入力された値をそのまま保存
      const updatedRow = { ...row, timing: value };
      // tlnameが設定されていることを確認
      if (!updatedRow.tlname) {
        updatedRow.tlname = tlname;
      }
      console.log('送信するタイミングデータ:', updatedRow);
      
      // Tauriのコマンドを使用してデータを保存
      await invoke('update_todo_data', {
        todo: updatedRow
      });
      
      toast.success('タイミングを更新したよ～♪', {
        icon: '⏱️',
        duration: 1500,
      });
    } catch (error) {
      console.error('タイミングの更新でエラー:', error);
      toast.error('更新できなかったよ～(´；ω；`)', {
        icon: '😢',
        duration: 2000,
      });
    }
  };
  // 初期のデータ取得と計算
  useEffect(() => {
    fetchData();
    fetchParty();
    updateCalculatedValues();
  }, [tlname]);

  // キーボードショートカットの設定
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z でアンドゥ
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault(); // デフォルトの動作を防止
        undo();
      }
      // Ctrl+Y でリドゥ
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault(); // デフォルトの動作を防止
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [historyIndex, history]);

  // dataが変更されたら、テーブルの各種計算を行う
  useEffect(() => {
    updateCalculatedValues();
  }, [data, suggestions, getDropoutsUpToRow]);

  // ファイルの上部で、他のuseStateと一緒にこの新しい状態を追加
  const [showOnlyPartyEvents, setShowOnlyPartyEvents] = useState(false);
  const [searchEvent, setSearchEvent] = useState('');
  const [searchType, setSearchType] = useState('contains'); // 'exact', 'contains', 'startsWith', 'endsWith'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // DnDのセンサー設定～♪
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px以上動かさないとドラッグ開始しないよ～
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ開始イベントハンドラー
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // ドラッグ終了時の処理～(*ﾉωﾉ) - 画面更新を先に行うように修正♪
  const handleDragEnd = async (event) => {
    try {
      const { active, over } = event;
      if (!over) return;

      const oldIndex = active.data.current.sortable.index;
      const newIndex = over.data.current.sortable.index;

      if (oldIndex === newIndex) return;

      // データの並び替え
      const newData = [...data];
      const [movedItem] = newData.splice(oldIndex, 1);
      newData.splice(newIndex, 0, movedItem);

      // 行番号の更新
      const updatedData = newData.map((item, index) => ({
        ...item,
        col: index,
        tlname: item.tlname || tlname, // tlnameを確保
        dropout: typeof item.dropout === 'string' ? item.dropout : JSON.stringify(item.dropout || [])
      }));

      // ステート更新
      updateDataWithHistory(updatedData);

      // データベースに保存（一つずつ保存）
      for (const record of updatedData) {
        await invoke('update_todo_data', {
          todo: record
        });
      }

      toast.success('並び替え完了したよ～♪', {
        icon: '✨',
        duration: 1500,
      });
    } catch (error) {
      console.error('並び替えでエラー:', error);
      toast.error('並び替えできなかったよ～(´；ω；`)', {
        icon: '😢',
        duration: 2000,
      });
    }
  };

  // 全角半角を考慮して文字列の表示幅を計算する関数
  const getStringWidth = (str) => {
    if (!str) return 0;
    
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      // 全角文字（ひらがな、カタカナ、漢字、全角英数字など）は2としてカウント
      // Unicodeの範囲をチェックして全角かどうか判定
      const code = str.charCodeAt(i);
      if (
        (code >= 0x3000 && code <= 0x9FFF) || // CJK統合漢字、ひらがな、カタカナ
        (code >= 0xFF00 && code <= 0xFFEF) || // 全角英数字、記号
        (code >= 0x20000 && code <= 0x2FFFF)  // CJK拡張
      ) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  };

  // テキスト形式に変換する関数
  const convertToText = () => {
    // 各列のデータを格納する配列
    const rows = [];
    
    // // 見出し行の定義
    // const headers = [
    //   'コスト',
    //   'イベント',
    //   '対象',
    //   '残り時間',
    //   '必要コスト',
    //   '累計コスト',
    // ];
    
    const colNum = 3

    // // ヘッダー行を追加
    // rows.push(headers);
    
    // データ行を追加
    data.forEach(row => {
      if (row.col === 0) {
        return;
      }
      const calcValue = calculatedValues.find(item => item.col === row.col);
      
      const useCost = parseFloat(calcValue?.displayCost || '0.0') + calcValue?.requiredCost;
      // 各行のデータを配列に追加
      const firstTimeRegex = /(\d+):(\d{2})(?:\.(\d{1,3}))?/;

      calcValue?.party.includes(row.event.replace("(リオ©)", "").replace(" 1射目", "").replace(" 2射目", "").replace(" 3射目", "")) && rows.push([
        !row.late && !row.timing ? '' : (firstTimeRegex.test(row.timing) ?  calcValue?.remainingTime : (Number.isInteger(useCost)? useCost.toFixed(0) : useCost.toFixed(1))),
        (!row.late && !row.timing ? '即' : '') + row.event + (row.subject ? ' => ' + row.subject : ''),
        row.memo
      ]);

    });
    
    // 各列の最大幅を計算（全角文字を考慮）
    const colWidths = [];
    for (let col = 0; col < colNum; col++) {
      const maxWidth = Math.max(...rows.map(row => 
        getStringWidth((row[col] || '').toString())
      ));
      colWidths.push(maxWidth + 2); // 少し余裕を持たせる
    }
    
    // 各行を整形してテキストに変換
    let textContent = '';
    
    // ヘッダーの区切り線を作成
    // const headerSeparator = colWidths.map(width => '-'.repeat(width)).join('+');
    
    // // ヘッダー行
    // textContent += colWidths.map((width, i) => 
    //   padTextWithWidth(rows[0][i], width)
    // ).join('') + '\n';
    
    // ヘッダーと内容の区切り
    // textContent += headerSeparator + '\n';
    
    // データ行
    for (let i = 0; i < rows.length; i++) {
      textContent += colWidths.map((width, j) => 
        padTextWithWidth(rows[i][j], width)
      ).join('') + '\n';
      
      // 戦闘開始行の後に区切り線を入れる
      // if (i === 1) {
      //   textContent += headerSeparator + '\n';
      // }
    }
    
    return textContent;
  };
  
  // 全角半角を考慮してテキストを指定の表示幅に整形する関数
  const padTextWithWidth = (text, width) => {
    const str = text?.toString() || '';
    const currentWidth = getStringWidth(str);
    const paddingWidth = Math.max(0, width - currentWidth - 1);
    return ' ' + str + ' '.repeat(paddingWidth);
  };
  
  // テキストファイルとしてダウンロードする関数
  const downloadText = () => {
    const textContent = convertToText();
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // ダウンロードリンクを作成して自動クリック
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${tlname}_timeline_${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('タイムラインをテキストでダウンロードしたよ～♪', {
      icon: '📝',
      duration: 2000,
    });
  };

  // CSV形式に変換する関数
  const convertToCSV = () => {
    // CSVのヘッダー行を作成
    const headers = [];
    
    if (columnVisibility.row) headers.push('行');
    if (columnVisibility.event) headers.push('イベント');
    if (columnVisibility.late) headers.push('最遅');
    if (columnVisibility.timing) headers.push('タイミング');
    if (columnVisibility.cumulativeCost) headers.push('累計コスト');
    if (columnVisibility.requiredCost) headers.push('必要コスト');
    if (columnVisibility.costRecovery) headers.push('コスト回復力');
    if (columnVisibility.remainingTime) headers.push('残り時間');
    if (columnVisibility.remainingCost) headers.push('残りコスト');
    if (columnVisibility.overflowCost) headers.push('消失コスト');
    if (columnVisibility.subject) headers.push('対象');
    if (columnVisibility.memo) headers.push('メモ');
    if (columnVisibility.dropout) headers.push('脱落キャラ');
    if (columnVisibility.score) headers.push('スコア');
    
    // CSVの行を格納する配列
    const csvRows = [headers.map(h => `"${h}"`).join(',')];
    
    // データ行を追加
    data.forEach(row => {
      const calcValue = calculatedValues.find(item => item.col === row.col);
      const rowData = [];
      
      if (columnVisibility.row) rowData.push(`"${row.col}"`);
      if (columnVisibility.event) rowData.push(`"${row.event || ''}"`);
      if (columnVisibility.late) rowData.push(`"${row.late ? '✓' : ''}"`);
      if (columnVisibility.timing) rowData.push(`"${row.timing || ''}"`);
      if (columnVisibility.cumulativeCost) rowData.push(`"${calcValue?.cumulativeCost || ''}"`);
      if (columnVisibility.requiredCost) rowData.push(`"${calcValue?.requiredCost || ''}"`);
      if (columnVisibility.costRecovery) rowData.push(`"${calcValue?.costRecoveryToDisplay || ''}"`);
      if (columnVisibility.remainingTime) rowData.push(`"${calcValue?.remainingTime || ''}"`);
      if (columnVisibility.remainingCost) rowData.push(`"${calcValue?.displayCost || ''}"`);
      if (columnVisibility.overflowCost) rowData.push(`"${calcValue?.overflowCost || ''}"`);
      if (columnVisibility.subject) rowData.push(`"${row.subject || ''}"`);
      if (columnVisibility.memo) rowData.push(`"${row.memo || ''}"`);
      
      // 脱落キャラの処理（JSON配列を文字列に変換）
      if (columnVisibility.dropout) {
        let dropoutStr = '';
        try {
          if (row.dropout) {
            const dropouts = JSON.parse(row.dropout);
            if (Array.isArray(dropouts) && dropouts.length > 0) {
              dropoutStr = dropouts.join('、');
            }
          }
        } catch (e) {
          if (typeof row.dropout === 'string' && row.dropout.trim() !== '') {
            dropoutStr = row.dropout;
          }
        }
        rowData.push(`"${dropoutStr}"`);
      }
      
      if (columnVisibility.score) rowData.push(`"${calcValue?.score || ''}"`);
      
      csvRows.push(rowData.join(','));
    });
    
    return csvRows.join('\n');
  };
  
  // CSVファイルとしてダウンロードする関数
  const downloadCSV = () => {
    const csvContent = convertToCSV();
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // ダウンロードリンクを作成して自動クリック
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${tlname}_timeline_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('タイムラインをCSVでダウンロードしたよ～♪', {
      icon: '📊',
      duration: 2000,
    });
  };

  // TLをコピーする関数を追加
  const copyTL = async () => {
    try {
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
      
      // 5. TODOデータをコピー - ここを修正
      console.log('コピー元のTL名:', tlname);
      const todoData = await invoke('get_tl_all_data', { tlname });
      console.log('コピー対象データ数:', todoData.length);
      
      // 実際に画面に表示されているデータを使用する
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
        // APIからデータが取得できなかった場合は、現在の画面データを使う
        console.log('APIからデータを取得できなかったため、画面データを使用します');
        
        if (data && data.length > 0) {
          for (const item of data) {
            // 各行を新しいTL名でコピー
            await invoke('update_todo_data', {
              todo: {
                ...item,
                tlname: newTlName,
                // dropoutが配列の場合は文字列化
                dropout: typeof item.dropout !== 'string' ? 
                  JSON.stringify(item.dropout) : item.dropout
              }
            });
          }
        } else {
          console.error('コピーするデータがありません');
        }
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
      
    } catch (error) {
      console.error('TLのコピーでエラーが発生しました:', error);
      toast.error('TLのコピーに失敗しちゃった(´；ω；`)', {
        icon: '😭',
        duration: 3000,
      });
    }
  };

  // UIにコピーボタンを追加
  return (
    <Container>
      <Toaster position="top-right" />
      
      {/* ハンバーガーメニューボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', my: 2 }}>
        <Button
          variant="outlined"
          startIcon={<MenuIcon />}
          onClick={() => setSidebarOpen(true)}
          sx={{
            borderRadius: '20px',
            borderColor: '#3498db',
            color: '#3498db',
            '&:hover': {
              backgroundColor: '#ebf5fb',
              borderColor: '#2980b9',
            },
          }}
        >
          メニューを開く
        </Button>
      </Box>
      
      {/* サイドバー */}
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: '320px',
            boxSizing: 'border-box',
            p: 2,
            background: 'linear-gradient(to bottom, #f9f9f9, #f0f0f0)',
            borderRight: '1px solid #e0e0e0',
          },
        }}
      >
        {/* サイドバーヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#3498db', fontWeight: 'bold' }}>
            TLプランナー設定
          </Typography>
          <IconButton onClick={() => setSidebarOpen(false)}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* 元々のHeaderの内容をここに移動 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#34495e' }}>
            データ操作:
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveAllData}
            sx={{
              backgroundColor: '#3498db',
              '&:hover': {
                backgroundColor: '#2980b9',
              },
            }}
          >
            保存
          </Button>
          
          <Button
            variant="outlined"
            onClick={undo}
            sx={{
              backgroundColor: '#fff',
              borderColor: '#3498db',
              color: '#3498db',
              '&:hover': {
                backgroundColor: '#ebf5fb',
                borderColor: '#2980b9',
              },
            }}
          >
            ひとつ前に戻す (Ctrl+Z)
          </Button>
          
          <Button
            variant="outlined"
            onClick={redo}
            sx={{
              backgroundColor: '#fff',
              borderColor: '#3498db',
              color: '#3498db',
              '&:hover': {
                backgroundColor: '#ebf5fb',
                borderColor: '#2980b9',
              },
            }}
          >
            ひとつ後に進む (Ctrl+Y)
          </Button>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* 表示フィルター */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#34495e' }}>
            表示フィルター:
          </Typography>
          
          <Button
            variant={showOnlyPartyEvents ? "contained" : "outlined"}
            onClick={() => setShowOnlyPartyEvents(!showOnlyPartyEvents)}
            startIcon={showOnlyPartyEvents ? <VisibilityIcon /> : <VisibilityOffIcon />}
            sx={{
              backgroundColor: showOnlyPartyEvents ? '#9c27b0' : '#fff',
              color: showOnlyPartyEvents ? '#fff' : '#9c27b0',
              borderColor: '#9c27b0',
              '&:hover': {
                backgroundColor: showOnlyPartyEvents ? '#7b1fa2' : '#f3e5f5',
                borderColor: '#7b1fa2',
              },
            }}
          >
            {showOnlyPartyEvents ? "全行表示" : "EXスキルのみ表示"}
          </Button>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* 列表示の設定 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#34495e' }}>
            列の表示設定:
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px',
          }}>
            {Object.entries({
              operations: '操作',
              row: '行',
              event: 'イベント',
              late: '最遅',
              timing: 'タイミング',
              cumulativeCost: '累計コスト',
              requiredCost: '必要コスト',
              costRecovery: 'コスト回復力',
              remainingTime: '残り時間',
              remainingCost: '残りコスト',
              subject: '対象',
              memo: 'メモ',
              dropout: '脱落キャラ',
              overflowCost: '消失コスト'
            }).map(([key, label]) => (
              <Button
                key={key}
                size="small"
                variant={columnVisibility[key] ? "contained" : "outlined"}
                onClick={() => toggleColumnVisibility(key)}
                startIcon={columnVisibility[key] ? <VisibilityIcon /> : <VisibilityOffIcon />}
                sx={{
                  minWidth: 'auto',
                  fontSize: '0.75rem',
                  backgroundColor: columnVisibility[key] ? '#3498db' : '#fff',
                  color: columnVisibility[key] ? '#fff' : '#7f8c8d',
                  borderColor: columnVisibility[key] ? '#3498db' : '#bdc3c7',
                  '&:hover': {
                    backgroundColor: columnVisibility[key] ? '#2980b9' : '#f5f5f5',
                    borderColor: columnVisibility[key] ? '#2980b9' : '#95a5a6',
                  },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3, mt: 3 }} />
        
        {/* データエクスポート */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#34495e' }}>
            データエクスポート:
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={downloadText}
            sx={{
              backgroundColor: '#fff',
              borderColor: '#27ae60',
              color: '#27ae60',
              '&:hover': {
                backgroundColor: '#e8f5e9',
                borderColor: '#219653',
              },
            }}
          >
            テキスト形式でダウンロード
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={downloadCSV}
            sx={{
              backgroundColor: '#fff',
              borderColor: '#e67e22',
              color: '#e67e22',
              '&:hover': {
                backgroundColor: '#fff5eb',
                borderColor: '#d35400',
              },
            }}
          >
            CSV形式でダウンロード
          </Button>
        </Box>
      </Drawer>
      
      {/* 検索ボックスは残す - ダウンロードボタンを変更 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mt: 2, 
        mb: 2, 
        p: 2, 
        bgcolor: '#fff3e0', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        border: '1px dashed #ffab91',
        flexWrap: 'wrap'
      }}>
        <Autocomplete
          freeSolo
          options={suggestions || []}
          value={searchEvent}
          onChange={(event, newValue) => setSearchEvent(newValue || '')}
          inputValue={searchEvent}
          onInputChange={(event, newValue) => setSearchEvent(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              label="イベント名で検索"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <>
                    {searchEvent && (
                      <IconButton 
                        size="small" 
                        onClick={() => setSearchEvent('')}
                        aria-label="検索をクリア"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
          sx={{
            width: '300px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: '#ffffff',
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.875rem',
            }
          }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="search-type-label">検索タイプ</InputLabel>
          <Select
            labelId="search-type-label"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            label="検索タイプ"
            sx={{
              borderRadius: '20px',
              backgroundColor: '#ffffff',
            }}
          >
            <MenuItem value="contains">含む</MenuItem>
            <MenuItem value="exact">完全一致</MenuItem>
            <MenuItem value="startsWith">から始まる</MenuItem>
            <MenuItem value="endsWith">で終わる</MenuItem>
          </Select>
        </FormControl>

        {/* 右側のボタングループ */}
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          {/* EXスキルのみ表示ボタン */}
          <Button
            variant={showOnlyPartyEvents ? "contained" : "outlined"}
            onClick={() => setShowOnlyPartyEvents(!showOnlyPartyEvents)}
            startIcon={showOnlyPartyEvents ? <VisibilityIcon /> : <VisibilityOffIcon />}
            size="small"
            sx={{
              backgroundColor: showOnlyPartyEvents ? '#9c27b0' : '#fff',
              color: showOnlyPartyEvents ? '#fff' : '#9c27b0',
              borderColor: '#9c27b0',
              borderRadius: '20px',
              '&:hover': {
                backgroundColor: showOnlyPartyEvents ? '#7b1fa2' : '#f3e5f5',
                borderColor: '#7b1fa2',
              },
            }}
          >
            {showOnlyPartyEvents ? "全行表示" : "EXスキルのみ"}
          </Button>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* ダウンロードボタン */}
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={downloadText}
            size="small"
            sx={{
              backgroundColor: '#fff',
              borderColor: '#27ae60',
              color: '#27ae60',
              borderRadius: '20px',
              '&:hover': {
                backgroundColor: '#e8f5e9',
                borderColor: '#219653',
              },
            }}
          >
            テキスト形式
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={downloadCSV}
            size="small"
            sx={{
              backgroundColor: '#fff',
              borderColor: '#e67e22',
              color: '#e67e22',
              borderRadius: '20px',
              '&:hover': {
                backgroundColor: '#fff5eb',
                borderColor: '#d35400',
              },
            }}
          >
            CSV形式
          </Button>
          
          {/* TLコピーボタン */}
          <Button
            variant="outlined"
            startIcon={<FileCopyIcon />}
            onClick={copyTL}
            size="small"
            sx={{
              backgroundColor: '#fff',
              borderColor: '#9c27b0',
              color: '#9c27b0',
              borderRadius: '20px',
              '&:hover': {
                backgroundColor: '#f3e5f5',
                borderColor: '#7b1fa2',
              },
            }}
          >
            TLコピー
          </Button>
        </Box>
        
        {searchEvent && (
          <Typography variant="body2" sx={{ color: '#f57c00', fontWeight: 'bold', width: '100%', mt: 1 }}>
            「{searchEvent}」
            {searchType === 'contains' && 'を含む'}
            {searchType === 'exact' && 'に完全一致する'}
            {searchType === 'startsWith' && 'から始まる'}
            {searchType === 'endsWith' && 'で終わる'}
            行をハイライト表示しています✨
          </Typography>
        )}
      </Box>

      {/* DndContextをテーブルコンテナの外側に移動～ */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <TableContainer 
          component={Paper} 
          sx={{ 
            maxHeight: '80vh',
            minHeight: '500px',
            width: 'auto',
            maxWidth: '98vw',
            margin: '0 auto',
            padding: 0,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            backgroundColor: '#ffffff',
          }}
        >
          <Table 
            size="small" 
            stickyHeader 
            sx={{ 
              '& .MuiTableCell-root': {
                padding: '4px 3px',
                fontSize: '0.8rem',
                textAlign: 'center',
              },
              '& .MuiInputBase-root': {
                textAlign: 'center',
                fontSize: '0.78rem',
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                backgroundColor: '#2c3e50',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '0.8rem',
              },
              // 偶数行と奇数行で背景色を変える
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': {
                backgroundColor: '#ffffff',
              },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
                backgroundColor: '#f9fafb',
              },
              // ホバー時のスタイル
              '& .MuiTableBody-root .MuiTableRow-root:hover': {
                backgroundColor: '#ebf5fb',
              },
              // テキストフィールドのスタイル
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#e1e4e8',
                },
                '&:hover fieldset': {
                  borderColor: '#3498db',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3498db',
                },
              },
              // チェックボックスのスタイル
              '& .MuiCheckbox-root': {
                color: '#95a5a6',
                '&.Mui-checked': {
                  color: '#3498db',
                },
              },
              // ドラッグ操作時のスタイル追加
              '& .MuiTableBody-root .MuiTableRow-root.dragging': {
                backgroundColor: '#e3f2fd',
                cursor: 'grabbing',
              },
            }}
          >
            <TableHead>
              <TableRow key="header-row">
                {columnVisibility.operations && (
                  <TableCell key="header-operations" align="center">操作</TableCell>
                )}
                {columnVisibility.row && (
                  <TableCell key="header-row-number" align="center">行</TableCell>
                )}
                {columnVisibility.event && (
                  <TableCell key="header-event" align="center" style={{ width: 190 }}>イベント</TableCell>
                )}
                {columnVisibility.late && (
                  <TableCell key="header-late" align="center">最遅</TableCell>
                )}
                {columnVisibility.timing && (
                  <TableCell key="header-timing" align="center" style={{ width: 190 }}>タイミング</TableCell>
                )}
                {columnVisibility.cumulativeCost && (
                  <TableCell key="header-cumulative-cost" align="center">累計コスト</TableCell>
                )}
                {columnVisibility.requiredCost && (
                  <TableCell key="header-required-cost" align="center">必要コスト</TableCell>
                )}
                {columnVisibility.costRecovery && (
                  <TableCell key="header-cost-recovery" align="center">コスト回復力</TableCell>
                )}
                {columnVisibility.remainingTime && (
                  <TableCell key="header-remaining-time" align="center">残り時間</TableCell>
                )}
                {columnVisibility.remainingCost && (
                  <TableCell key="header-remaining-cost" align="center">残りコスト</TableCell>
                )}
                {columnVisibility.overflowCost && (
                  <TableCell key="header-overflow-cost" align="center" sx={{ backgroundColor: '#fff5f7' }}>消失コスト</TableCell>
                )}
                {columnVisibility.subject && (
                  <TableCell key="header-subject" align="center" style={{ width: 150 }}>対象</TableCell>
                )}
                {columnVisibility.memo && (
                  <TableCell key="header-memo" align="center" style={{ width: 300 }}>メモ</TableCell>
                )}
                {columnVisibility.dropout && (
                  <TableCell key="header-dropout" align="center" style={{ width: 160 }}>脱落キャラ</TableCell>
                )}
                {columnVisibility.score && (
                  <TableCell key="header-score" align="center">スコア</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* SortableContextのみtbody内に配置～♪ */}
              <SortableContext
                items={data
                  .filter(row => !showOnlyPartyEvents || row.col === 0 || (() => {
                    const calcValue = calculatedValues.find(item => item.col === row.col);
                    const party = calcValue?.party || [];
                    return party.includes((row.event || '').replace("(リオ©)", "").replace(" 1射目", "").replace(" 2射目", "").replace(" 3射目", ""));
                  })())
                  .map(row => row.col.toString())}
                strategy={verticalListSortingStrategy}
              >
                {data
                  .filter(row => !showOnlyPartyEvents || row.col === 0 || (() => {
                    const calcValue = calculatedValues.find(item => item.col === row.col);
                    const party = calcValue?.party || [];
                    return party.includes((row.event || '').replace("(リオ©)", "").replace(" 1射目", "").replace(" 2射目", "").replace(" 3射目", ""));
                  })())
                  .map((row, index) => (
                    <SortableTableRow
                      key={`row-${row.col}-${index}`}
                      row={row}
                      index={index}
                      data={data}
                      columnVisibility={columnVisibility}
                      calculatedValues={calculatedValues}
                      insertRowBelow={insertRowBelow}
                      deleteRow={deleteRow}
                      handleInputChange={handleInputChange}
                      handleInputBlur={handleInputBlur}
                      handleCheckboxChange={handleCheckboxChange}
                      handleDropoutChange={handleDropoutChange}
                      handleTimingChange={handleTimingChange}
                      searchEvent={searchEvent}
                      searchType={searchType}
                    />
                  ))}
              </SortableContext>
            </TableBody>
          </Table>
        </TableContainer>
      </DndContext>

      <datalist id="suggestions">
        {suggestions.map((item, index) => (
          <option key={`suggestion-${item.name}-${index}`} value={item.name} />
        ))}
      </datalist>
    </Container>
  );
} 