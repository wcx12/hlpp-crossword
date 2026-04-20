import React, { useState, useCallback, useEffect } from 'react';
import { colors } from '../theme/theme';

interface WordData {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

interface GridEditorScreenProps {
  onBack: () => void;
  onPlay: (grid: { isBlack: boolean; letter: string }[][], words: WordData[]) => void;
}

export const GridEditorScreen: React.FC<GridEditorScreenProps> = ({ onBack, onPlay }) => {
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  // 网格初始全是黑色
  const [grid, setGrid] = useState<{ isBlack: boolean; letter: string }[][]>(() =>
    Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => ({ isBlack: true, letter: '' })))
  );
  const [words, setWords] = useState<WordData[]>([]);
  const [currentEdit, setCurrentEdit] = useState<{ row: number; col: number; direction: 'across' | 'down' } | null>(null);
  const [inputWord, setInputWord] = useState('');
  const [inputClue, setInputClue] = useState('');
  const [defaultDirection, setDefaultDirection] = useState<'across' | 'down'>('across');
  const [savedGrid, setSavedGrid] = useState<{ isBlack: boolean; letter: string }[][] | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState(0);

  // 重新生成网格（重置为全黑色）
  const regenerateGrid = useCallback((newRows: number, newCols: number) => {
    setRows(newRows);
    setCols(newCols);
    setGrid(Array(newRows).fill(null).map(() => Array(newCols).fill(null).map(() => ({ isBlack: true, letter: '' }))));
    setWords([]);
    setCurrentEdit(null);
    setInputWord('');
    setInputClue('');
    setConflictError(null);
  }, []);

  // 检查单词是否与现有单词冲突
  const checkConflict = useCallback((word: string, startRow: number, startCol: number, direction: 'across' | 'down'): string | null => {
    for (let i = 0; i < word.length; i++) {
      let r = startRow, c = startCol;
      if (direction === 'down') r += i;
      else c += i;

      if (r >= rows || c >= cols) {
        return `单词超出网格范围`;
      }

      const existingLetter = grid[r][c].letter;
      if (existingLetter && existingLetter !== word[i]) {
        return `位置 (${r + 1}, ${c + 1}) 已有字母 '${existingLetter}'，无法填入 '${word[i]}'`;
      }
    }
    return null;
  }, [grid, rows, cols]);

  // 双击格子开始编辑
  const startEdit = (r: number, c: number, direction: 'across' | 'down') => {
    // 如果正在编辑其他位置，先自动保存当前单词
    if (currentEdit && (currentEdit.row !== r || currentEdit.col !== c || currentEdit.direction !== direction)) {
      // 如果当前有输入，先保存
      if (inputWord) {
        // 检查冲突
        const conflict = checkConflict(inputWord, currentEdit.row, currentEdit.col, currentEdit.direction);
        if (conflict) {
          // 有冲突，不允许切换
          setConflictError(conflict);
          return;
        }
        // 保存单词
        const wordData: WordData = {
          word: inputWord,
          clue: inputClue,
          row: currentEdit.row,
          col: currentEdit.col,
          direction: currentEdit.direction,
        };
        setWords(prev => {
          const filtered = prev.filter(w => !(w.row === currentEdit.row && w.col === currentEdit.col && w.direction === currentEdit.direction));
          return [...filtered, wordData];
        });
      } else if (savedGrid) {
        // 没有输入，恢复到savedGrid
        setGrid(savedGrid);
      }
      // 清除编辑状态
      setSavedGrid(null);
      setCurrentEdit(null);
      setInputWord('');
      setInputClue('');
      setConflictError(null);
      setCursorPos(0);
    }

    // 如果格子有字母，查找对应方向上的单词
    if (grid[r][c].letter) {
      const existingWord = words.find(w => {
        // 只在相同方向上查找
        if (w.direction !== direction) return false;
        for (let i = 0; i < w.word.length; i++) {
          let wr = w.row, wc = w.col;
          if (w.direction === 'down') wr += i;
          else wc += i;
          if (wr === r && wc === c) return true;
        }
        return false;
      });

      if (existingWord) {
        // 如果该格子属于同方向的单词，以该单词的起点开始编辑
        setCurrentEdit({ row: existingWord.row, col: existingWord.col, direction: existingWord.direction });
        setInputWord(existingWord.word);
        setInputClue(existingWord.clue);
        setCursorPos(existingWord.word.length);
        setSavedGrid(grid.map(row => row.map(cell => ({ ...cell }))));
        return;
      }

      // 如果是不同方向的单词，或者是不同格子，允许作为新单词起点
      // 但第一个字母必须匹配
      if (grid[r][c].letter) {
        setSavedGrid(grid.map(row => row.map(cell => ({ ...cell }))));
        setCurrentEdit({ row: r, col: c, direction });
        setInputWord(grid[r][c].letter || '');
        setInputClue('');
        setCursorPos(1);
        return;
      }
    }

    // 保存当前网格状态
    setSavedGrid(grid.map(row => row.map(cell => ({ ...cell }))));
    setCurrentEdit({ row: r, col: c, direction });
    setInputWord(grid[r][c].letter || '');
    setInputClue('');
    setCursorPos(grid[r][c].letter ? 1 : 0);
  };

  // 输入单词（基于光标位置）
  const handleWordInput = useCallback((value: string) => {
    const upperValue = value.toUpperCase();

    if (!currentEdit) return;

    // 如果输入为空，恢复到savedGrid状态
    if (upperValue === '') {
      if (savedGrid) {
        setGrid(savedGrid);
        setSavedGrid(null);
      }
      setInputWord('');
      setCursorPos(0);
      setConflictError(null);
      return;
    }

    const { row, col, direction } = currentEdit;

    // 基于savedGrid检查冲突（savedGrid必须存在才检查）
    if (savedGrid) {
      for (let i = 0; i < upperValue.length; i++) {
        let r = row, c = col;
        if (direction === 'down') r += i;
        else c += i;

        if (r < rows && c < cols) {
          const existingLetter = savedGrid[r][c].letter;
          if (existingLetter && existingLetter !== upperValue[i]) {
            setConflictError(`冲突：位置 (${r + 1}, ${c + 1}) 已有字母 '${existingLetter}'`);
            return; // 不更新任何状态
          }
        }
      }
    }

    // 冲突检查通过，更新状态
    setInputWord(upperValue);
    setCursorPos(upperValue.length);
    setConflictError(null);

    setGrid(prevGrid => {
      // 基于savedGrid构建新网格（如果有的话）
      const baseGrid = savedGrid ? savedGrid.map(r => r.map(c => ({ ...c }))) : prevGrid.map(r => r.map(c => ({ ...c })));
      const newGrid = baseGrid;

      // 清除当前编辑的单词占据的所有格子
      const currentWordIndex = words.findIndex(w => w.row === row && w.col === col && w.direction === direction);
      if (currentWordIndex >= 0) {
        const oldWord = words[currentWordIndex];
        for (let i = 0; i < oldWord.word.length; i++) {
          let r = oldWord.row, c = oldWord.col;
          if (direction === 'down') r += i;
          else c += i;
          if (r < rows && c < cols) {
            newGrid[r][c].letter = '';
            newGrid[r][c].isBlack = true;
          }
        }
      }

      // 填入新字母
      for (let i = 0; i < upperValue.length; i++) {
        let r = row, c = col;
        if (direction === 'down') r += i;
        else c += i;

        if (r < rows && c < cols) {
          newGrid[r][c].letter = upperValue[i];
          newGrid[r][c].isBlack = false;
        }
      }

      return newGrid;
    });
  }, [currentEdit, words, rows, cols, savedGrid]);

  // 删除当前光标位置的字母
  const handleBackspace = useCallback(() => {
    if (!currentEdit || cursorPos === 0) return;

    const { row, col, direction } = currentEdit;
    const newCursorPos = cursorPos - 1;
    const newWord = inputWord.slice(0, newCursorPos);

    // 如果删除到空，恢复savedGrid状态
    if (newWord === '') {
      if (savedGrid) {
        setGrid(savedGrid);
        setSavedGrid(null);
      }
      setInputWord('');
      setCursorPos(0);
      setConflictError(null);
      return;
    }

    // 基于savedGrid重建网格（savedGrid是干净的，不包含当前编辑的单词）
    setGrid(prevGrid => {
      // 如果有savedGrid，从它重建（这样可以保留其他单词的字母）
      // 如果没有savedGrid，说明是编辑已存在的单词，从prevGrid重建
      const baseGrid = savedGrid
        ? savedGrid.map(r => r.map(c => ({ ...c })))
        : prevGrid.map(r => r.map(c => ({ ...c })));

      // 清除当前单词占据的所有格子（从0到当前inputWord长度-1）
      for (let i = 0; i < inputWord.length; i++) {
        let r = row, c = col;
        if (direction === 'down') r += i;
        else c += i;
        if (r < rows && c < cols) {
          baseGrid[r][c].letter = '';
          baseGrid[r][c].isBlack = true;
        }
      }

      // 重新填入newWord
      for (let i = 0; i < newWord.length; i++) {
        let r = row, c = col;
        if (direction === 'down') r += i;
        else c += i;
        if (r < rows && c < cols) {
          baseGrid[r][c].letter = newWord[i];
          baseGrid[r][c].isBlack = false;
        }
      }

      return baseGrid;
    });

    setInputWord(newWord);
    setCursorPos(newCursorPos);
  }, [currentEdit, cursorPos, inputWord, rows, cols, savedGrid]);

  // 确认单词
  const confirmWord = useCallback(() => {
    if (!currentEdit || !inputWord) return;

    const { row, col, direction } = currentEdit;

    // 检查冲突
    const conflict = checkConflict(inputWord, row, col, direction);
    if (conflict) {
      setConflictError(conflict);
      return;
    }

    const wordData: WordData = {
      word: inputWord,
      clue: inputClue,
      row,
      col,
      direction,
    };

    setWords(prev => {
      // 替换同位置同方向的单词
      const filtered = prev.filter(w => !(w.row === row && w.col === col && w.direction === direction));
      return [...filtered, wordData];
    });

    setCurrentEdit(null);
    setInputWord('');
    setInputClue('');
    setSavedGrid(null);
    setConflictError(null);
  }, [currentEdit, inputWord, inputClue, checkConflict]);

  // 删除单词
  const deleteWord = useCallback((index: number) => {
    const word = words[index];
    const newGrid = grid.map(r => r.map(c => ({ ...c })));

    // 清除该单词占据的所有格子
    for (let i = 0; i < word.word.length; i++) {
      let r = word.row, c = word.col;
      if (word.direction === 'down') r += i;
      else c += i;

      if (r < rows && c < cols) {
        // 检查是否被其他单词占用
        const isUsedByOther = words.some((w, idx) => {
          if (idx === index) return false;
          for (let j = 0; j < w.word.length; j++) {
            let wr = w.row, wc = w.col;
            if (w.direction === 'down') wr += j;
            else wc += j;
            if (wr === r && wc === c) return true;
          }
          return false;
        });

        if (!isUsedByOther) {
          newGrid[r][c].letter = '';
          newGrid[r][c].isBlack = true;
        }
      }
    }

    setGrid(newGrid);
    setWords(prev => prev.filter((_, i) => i !== index));
  }, [grid, words, rows, cols]);

  // 获取当前编辑的单词占据的格子
  const getCurrentWordCells = () => {
    if (!currentEdit) return [];
    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i < Math.max(1, inputWord.length); i++) {
      let r = currentEdit.row, c = currentEdit.col;
      if (currentEdit.direction === 'down') r += i;
      else c += i;
      cells.push({ row: r, col: c });
    }
    return cells;
  };

  // 获取当前光标位置的格子
  const getCursorCell = () => {
    if (!currentEdit || cursorPos < 0) return null;
    let r = currentEdit.row, c = currentEdit.col;
    if (currentEdit.direction === 'down') r += cursorPos;
    else c += cursorPos;
    if (r >= rows || c >= cols) return null;
    return { row: r, col: c };
  };

  const currentWordCells = getCurrentWordCells();
  const cursorCell = getCursorCell();

  // 验证网格是否有效
  const isValidGrid = () => {
    return words.length > 0;
  };

  // 键盘事件处理
  useEffect(() => {
    if (!currentEdit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        confirmWord();
      } else if (e.key === 'Escape') {
        if (savedGrid) {
          setGrid(savedGrid);
          setSavedGrid(null);
        }
        setCurrentEdit(null);
        setInputWord('');
        setInputClue('');
        setConflictError(null);
        setCursorPos(0);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleWordInput(inputWord + e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentEdit, inputWord, savedGrid, confirmWord, handleWordInput, handleBackspace]);

  // 开始游戏
  const handlePlay = () => {
    if (!isValidGrid()) {
      alert('请至少添加一个单词');
      return;
    }

    onPlay(grid, words);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 顶部栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: colors.primary,
        color: colors.onPrimary,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: colors.onPrimary, cursor: 'pointer', fontSize: 14, marginRight: 16,
        }}>
          ← 返回
        </button>
        <span style={{ fontSize: 18, fontWeight: 'bold' }}>创建谜题</span>
      </div>

      {/* 工具栏 */}
      <div style={{ padding: '12px 16px', backgroundColor: colors.surfaceVariant, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12 }}>网格:</span>
          <input
            type="number"
            value={rows}
            onChange={e => regenerateGrid(parseInt(e.target.value) || 10, cols)}
            min={5}
            max={15}
            style={{ width: 50, padding: '4px 8px', fontSize: 14 }}
          />
          <span>×</span>
          <input
            type="number"
            value={cols}
            onChange={e => regenerateGrid(rows, parseInt(e.target.value) || 10)}
            min={5}
            max={15}
            style={{ width: 50, padding: '4px 8px', fontSize: 14 }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={handlePlay}
          disabled={!isValidGrid()}
          style={{
            padding: '6px 12px',
            backgroundColor: isValidGrid() ? colors.primary : colors.outline,
            color: colors.onPrimary,
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            cursor: isValidGrid() ? 'pointer' : 'not-allowed',
          }}
        >
          开始游戏
        </button>
      </div>

      {/* 提示 + 方向选择 */}
      <div style={{ padding: '8px 16px', backgroundColor: colors.surface, fontSize: 12, color: colors.onSurfaceVariant, borderBottom: `1px solid ${colors.outlineVariant}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>单击格子开始输入 | 已有字母的格子单击可编辑</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11 }}>方向:</span>
          <button
            onClick={() => setDefaultDirection('across')}
            style={{
              padding: '2px 8px',
              backgroundColor: defaultDirection === 'across' ? colors.primary : 'transparent',
              color: defaultDirection === 'across' ? colors.onPrimary : colors.primary,
              border: `1px solid ${colors.outline}`,
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            横向
          </button>
          <button
            onClick={() => setDefaultDirection('down')}
            style={{
              padding: '2px 8px',
              backgroundColor: defaultDirection === 'down' ? colors.primary : 'transparent',
              color: defaultDirection === 'down' ? colors.onPrimary : colors.primary,
              border: `1px solid ${colors.outline}`,
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            纵向
          </button>
        </div>
      </div>

      {/* 网格 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ display: 'inline-block', backgroundColor: colors.surface, border: `2px solid ${colors.outline}`, borderRadius: 4 }}>
          {grid.map((row, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {row.map((cell, c) => {
                const isCurrentCell = currentWordCells.some(cell => cell.row === r && cell.col === c);
                const isCursorCell = cursorCell && cursorCell.row === r && cursorCell.col === c;
                const hasLetter = cell.letter !== '';
                return (
                  <div
                    key={c}
                    onClick={() => startEdit(r, c, defaultDirection)}
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: cell.isBlack ? colors.cellBlocked : isCursorCell ? colors.primary : isCurrentCell ? colors.cellHighlight : colors.cellEmpty,
                      border: `1px solid ${isCursorCell ? colors.onPrimary : isCurrentCell ? colors.primary : colors.outlineVariant}`,
                      outline: isCursorCell ? `2px solid ${colors.primary}` : 'none',
                      outlineOffset: '-2px',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: cell.isBlack ? colors.onPrimary : isCursorCell ? colors.onPrimary : colors.textPrimary,
                    }}
                  >
                    {hasLetter ? cell.letter : (isCursorCell && currentEdit ? '_' : '')}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 已添加的单词列表 */}
        {words.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: colors.onSurface }}>
              已添加的单词 ({words.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {words.map((word, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.outline}`,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{word.word}</div>
                    <div style={{ fontSize: 11, color: colors.onSurfaceVariant }}>{word.clue || '无提示'}</div>
                  </div>
                  <button
                    onClick={() => deleteWord(index)}
                    style={{
                      padding: '2px 6px',
                      backgroundColor: colors.error,
                      color: colors.onError,
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部输入区 */}
      <div style={{
        padding: 16,
        backgroundColor: colors.surface,
        borderTop: `1px solid ${colors.outlineVariant}`,
      }}>
        {currentEdit ? (
          <div>
            {conflictError && (
              <div style={{ color: colors.error, fontSize: 12, marginBottom: 8 }}>
                {conflictError}
              </div>
            )}
            <div style={{ fontSize: 14, marginBottom: 8, color: colors.primary }}>
              单词: {inputWord || '(输入中...)'} | 方向: {currentEdit.direction === 'across' ? '横向' : '纵向'}
            </div>
            <input
              type="text"
              value={inputClue}
              onChange={e => setInputClue(e.target.value)}
              placeholder="输入提示（可选）"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                border: `1px solid ${colors.outline}`,
                borderRadius: 8,
                boxSizing: 'border-box',
                marginBottom: 8,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmWord}
                disabled={!inputWord}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: inputWord ? colors.primary : colors.outline,
                  color: colors.onPrimary,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: inputWord ? 'pointer' : 'not-allowed',
                }}
              >
                确认 (Enter)
              </button>
              <button
                onClick={() => {
                  if (savedGrid) {
                    setGrid(savedGrid);
                    setSavedGrid(null);
                  }
                  setCurrentEdit(null);
                  setInputWord('');
                  setInputClue('');
                  setConflictError(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: colors.onSurfaceVariant,
                  border: `1px solid ${colors.outline}`,
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                取消 (Esc)
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: colors.onSurfaceVariant, fontSize: 14 }}>
            单击网格上的格子开始添加单词
          </div>
        )}
      </div>
    </div>
  );
};