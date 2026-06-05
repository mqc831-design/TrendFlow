import { useState } from 'react';
import styles from './KeywordManager.module.css';

interface KeywordManagerProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

function KeywordManager({ keywords, onChange }: KeywordManagerProps) {
  const [input, setInput] = useState('');

  const addKeyword = () => {
    const trimmed = input.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
      setInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    onChange(keywords.filter((k) => k !== kw));
  };

  return (
    <fieldset className={styles['keyword-fieldset']}>
      <legend>关注关键字</legend>
      <div className={styles['keyword-input']}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
          placeholder="输入关键字后按回车添加"
        />
        <button type="button" onClick={addKeyword}>添加</button>
      </div>
      <div className={styles['keyword-tags']}>
        {keywords.map((kw) => (
          <span key={kw} className={styles['keyword-tag']}>
            {kw}
            <button type="button" onClick={() => removeKeyword(kw)}>×</button>
          </span>
        ))}
      </div>
      {keywords.length === 0 && <p className={styles['hint']}>未设置关键字，首页不做标记</p>}
    </fieldset>
  );
}

export { KeywordManager };
export type { KeywordManagerProps };
