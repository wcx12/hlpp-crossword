import React, { useState } from 'react';
import { GameScreen } from './ui/game/GameScreen';
import { WordListScreen } from './ui/game/WordListScreen';
import { useGameViewModel } from './ui/game/GameViewModel';
import { WORD_LISTS, WordListInfo } from './data/model/WordListInfo';

type Screen = 'game' | 'wordList';

function App() {
  const [screen, setScreen] = useState<Screen>('game');
  const [currentWordListId, setCurrentWordListId] = useState<string>('python_xword');
  const [wordListInfos, setWordListInfos] = useState<WordListInfo[]>(WORD_LISTS);
  const [customWordEntries, setCustomWordEntries] = useState<{ word: string; clue: string }[]>([]);

  const {
    state,
    newGame,
    switchWordList,
    setCustomWords,
    selectCell,
    toggleDirection,
    setDirection,
    inputLetter,
    deleteLetter,
    showSolution,
    hideSolution,
  } = useGameViewModel();

  // 当选择词表时，加载该词表并开始新游戏
  const handleSelectWordList = (id: string) => {
    setCurrentWordListId(id);

    // 如果是自定义词表
    if (id === 'custom') {
      if (customWordEntries.length >= 2) {
        setScreen('game');
        setCustomWords(customWordEntries, state.gridRows, state.gridCols);
      }
      return;
    }

    const wordList = WORD_LISTS.find(w => w.id === id);
    if (wordList) {
      setScreen('game');
      switchWordList(wordList.filePath, state.gridRows, state.gridCols);

      // 更新词表信息中的数量（异步更新）
      fetch(wordList.filePath)
        .then(response => response.text())
        .then(text => {
          const count = text.split('\n').filter(line => line.trim().length > 0).length;
          setWordListInfos(prev => prev.map(w =>
            w.id === id ? { ...w, wordCount: count } : w
          ));
        });
    }
  };

  // 当添加自定义词表时
  const handleAddCustomWordList = (entries: { word: string; clue: string }[]) => {
    setCustomWordEntries(entries);

    // 更新词表列表
    setWordListInfos(prev => {
      const existing = prev.find(w => w.id === 'custom');
      if (existing) {
        return prev.map(w => w.id === 'custom' ? { ...w, wordCount: entries.length } : w);
      } else {
        return [...prev, {
          id: 'custom',
          name: '自定义词表',
          filePath: '',
          wordCount: entries.length,
        }];
      }
    });

    // 自动开始游戏
    setScreen('game');
    setCurrentWordListId('custom');
    setCustomWords(entries, state.gridRows, state.gridCols);
  };

  // 点击"选择词表"按钮
  const handleShowWordList = () => {
    setScreen('wordList');
  };

  // 返回游戏
  const handleBackToGame = () => {
    setScreen('game');
  };

  if (screen === 'wordList') {
    return (
      <WordListScreen
        wordLists={wordListInfos}
        currentWordListId={currentWordListId}
        onSelectWordList={handleSelectWordList}
        onBackToGame={handleBackToGame}
        onAddCustomWordList={handleAddCustomWordList}
      />
    );
  }

  return (
    <GameScreen
      state={state}
      onCellClick={selectCell}
      onToggleDirection={toggleDirection}
      onSetDirection={setDirection}
      onLetterInput={inputLetter}
      onDelete={deleteLetter}
      onShowSolution={showSolution}
      onHideSolution={hideSolution}
      onNewGame={(rows, cols) => newGame(rows ?? state.gridRows, cols ?? state.gridCols)}
      onShowWordList={handleShowWordList}
    />
  );
}

export default App;