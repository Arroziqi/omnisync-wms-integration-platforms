"use client";

import React, { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  slug?: string;
}

export default function MarkdownRenderer({ content, slug }: MarkdownRendererProps) {
  // Simple custom markdown block parser
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 1. Fenced Code Block Parser
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'text';
      let codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      
      const codeString = codeLines.join('\n');
      blocks.push(<CodeBlock key={`code-${i}`} code={codeString} lang={lang} />);
      continue;
    }

    // 2. Alert / Blockquote Parser
    if (line.trim().startsWith('>')) {
      let quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        // Strip out the leading >
        const quoteContent = lines[i].trim().slice(1).trim();
        quoteLines.push(quoteContent);
        i++;
      }

      let type: 'note' | 'tip' | 'important' | 'warning' | 'default' = 'default';
      let cleanLines = [...quoteLines];
      
      if (quoteLines.length > 0) {
        const firstLine = quoteLines[0].toUpperCase();
        if (firstLine.includes('[!NOTE]')) {
          type = 'note';
          cleanLines[0] = quoteLines[0].replace(/\[!NOTE\]/i, '').trim();
        } else if (firstLine.includes('[!TIP]')) {
          type = 'tip';
          cleanLines[0] = quoteLines[0].replace(/\[!TIP\]/i, '').trim();
        } else if (firstLine.includes('[!IMPORTANT]')) {
          type = 'important';
          cleanLines[0] = quoteLines[0].replace(/\[!IMPORTANT\]/i, '').trim();
        } else if (firstLine.includes('[!WARNING]')) {
          type = 'warning';
          cleanLines[0] = quoteLines[0].replace(/\[!WARNING\]/i, '').trim();
        }
      }

      blocks.push(
        <AlertCard key={`alert-${i}`} type={type} lines={cleanLines} />
      );
      continue;
    }

    // 3. Table Parser
    if (line.trim().startsWith('|')) {
      let tableRows: string[][] = [];
      let isHeader = true;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowLine = lines[i].trim();
        // Skip separator line | :--- | :--- |
        if (rowLine.includes('---')) {
          i++;
          continue;
        }
        
        const cells = rowLine
          .split('|')
          .slice(1, -1) // remove leading and trailing empty elements
          .map(cell => cell.trim());
          
        tableRows.push(cells);
        i++;
      }

      blocks.push(
        <div className="table-responsive" key={`table-${i}`}>
          <table className="custom-table">
            <thead>
              <tr>
                {tableRows[0]?.map((cell, idx) => (
                  <th key={idx}>{parseInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}>{parseInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 4. Bullet & Numbered List Parser
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || /^\d+\.\s/.test(line.trim())) {
      let listItems: { text: string; isNumbered: boolean; num?: string }[] = [];
      while (i < lines.length && (
        lines[i].trim().startsWith('* ') || 
        lines[i].trim().startsWith('- ') || 
        /^\d+\.\s/.test(lines[i].trim())
      )) {
        const itemLine = lines[i].trim();
        if (itemLine.startsWith('* ') || itemLine.startsWith('- ')) {
          listItems.push({ text: itemLine.slice(2), isNumbered: false });
        } else {
          const match = itemLine.match(/^(\d+)\.\s(.*)/);
          if (match) {
            listItems.push({ text: match[2], isNumbered: true, num: match[1] });
          }
        }
        i++;
      }

      const isNumberedList = listItems[0]?.isNumbered;
      if (isNumberedList) {
        blocks.push(
          <ol className="custom-list numbered" key={`ol-${i}`}>
            {listItems.map((item, idx) => (
              <li key={idx}>{parseInline(item.text)}</li>
            ))}
          </ol>
        );
      } else {
        blocks.push(
          <ul className="custom-list bullet" key={`ul-${i}`}>
            {listItems.map((item, idx) => (
              <li key={idx}>{parseInline(item.text)}</li>
            ))}
          </ul>
        );
      }
      continue;
    }

    // 5. Headings
    if (line.trim().startsWith('#')) {
      const match = line.match(/^(#{1,6})\s(.*)/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        const HeadingTag = `h${level + 1}` as keyof JSX.IntrinsicElements; // shift heading levels down
        
        blocks.push(
          <React.Fragment key={`heading-${i}`}>
            <HeadingTag className={`doc-heading heading-h${level}`}>
              {parseInline(headingText)}
            </HeadingTag>
            {level === 1 && <hr className="heading-separator" />}
          </React.Fragment>
        );
        i++;
        continue;
      }
    }

    // 6. Horizontal Rule
    if (line.trim() === '---') {
      blocks.push(<hr className="doc-divider" key={`hr-${i}`} />);
      i++;
      continue;
    }

    // 7. Regular Paragraph
    if (line.trim() !== '') {
      blocks.push(
        <p className="doc-paragraph" key={`p-${i}`}>
          {parseInline(line)}
        </p>
      );
    }
    
    i++;
  }

  return (
    <div className="doc-reader-container">
      {slug && (
        <div className="breadcrumb-nav">
          <a href="/docs">Docs Hub</a>
          {slug.split('/').map((part, index, arr) => {
            const pathAcc = arr.slice(0, index + 1).join('/');
            const isLast = index === arr.length - 1;
            const formattedPart = part.replace(/-/g, ' '); // replace dashes with spaces
            return (
              <React.Fragment key={index}>
                <span className="separator">/</span>
                {isLast ? (
                  <span className="current-slug" style={{ textTransform: 'capitalize' }}>{formattedPart}</span>
                ) : (
                  <a href={`/docs/${pathAcc}`} className="breadcrumb-link" style={{ textTransform: 'capitalize' }}>{formattedPart}</a>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      <div className="markdown-render-area">
        {blocks}
      </div>
      
      {/* Styles for rendered elements */}
      <style jsx global>{`
        .doc-reader-container {
          display: flex;
          flex-direction: column;
        }

        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding-bottom: 12px;
        }

        .breadcrumb-nav a {
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .breadcrumb-nav a:hover {
          color: #6366f1;
        }

        .separator {
          color: rgba(255, 255, 255, 0.1);
        }

        .current-slug {
          color: #06b6d4;
        }

        .markdown-render-area {
          font-family: var(--font-primary);
          line-height: 1.7;
          font-size: 1rem;
          color: var(--text-primary);
        }

        /* Headings */
        .doc-heading {
          font-weight: 700;
          color: #f8fafc;
          margin-top: 36px;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .heading-h1 { font-size: 1.8rem; margin-top: 10px; color: #6366f1; }
        .heading-h2 { font-size: 1.45rem; border-left: 3px solid #06b6d4; padding-left: 12px; }
        .heading-h3 { font-size: 1.2rem; color: #cbd5e1; }
        .heading-h4 { font-size: 1.05rem; color: #94a3b8; }

        .heading-separator {
          border: none;
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin-bottom: 24px;
        }

        .doc-divider {
          border: none;
          height: 1px;
          background: rgba(255, 255, 255, 0.05);
          margin: 32px 0;
        }

        /* Paragraphs */
        .doc-paragraph {
          margin-bottom: 20px;
          color: #cbd5e1;
          font-size: 0.98rem;
        }

        /* Inline formatting */
        .inline-code {
          background: rgba(9, 13, 22, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #06b6d4;
          font-family: monospace;
          font-size: 0.85rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .markdown-render-area a {
          color: #6366f1;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s ease;
        }

        .markdown-render-area a:hover {
          color: #06b6d4;
          text-decoration: underline;
        }

        /* Lists */
        .custom-list {
          margin-bottom: 24px;
          padding-left: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .custom-list.bullet {
          list-style-type: square;
        }

        .custom-list.bullet li::marker {
          color: #6366f1;
        }

        .custom-list.numbered {
          list-style-type: decimal;
        }

        .custom-list.numbered li::marker {
          color: #06b6d4;
          font-weight: 700;
        }

        .custom-list li {
          color: #cbd5e1;
          font-size: 0.96rem;
          padding-left: 4px;
        }

        /* Code Blocks */
        .code-block-container {
          background: rgba(9, 13, 22, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          margin-bottom: 24px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        .code-block-header {
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding: 10px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .code-lang-badge {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }

        .copy-code-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 4px;
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .copy-code-btn:hover {
          background: rgba(255,255,255,0.07);
          color: #f8fafc;
          border-color: rgba(99, 102, 241, 0.3);
        }

        .code-block-body {
          padding: 18px;
          overflow-x: auto;
          margin: 0;
        }

        .code-block-body pre {
          margin: 0;
          padding: 0;
        }

        .code-block-body code {
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 0.85rem;
          color: #e2e8f0;
          line-height: 1.5;
        }

        /* Alert Cards */
        .alert-card-container {
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          border: 1px solid transparent;
        }

        .alert-card-container.tip {
          background: rgba(16, 185, 129, 0.06);
          border-color: rgba(16, 185, 129, 0.15);
        }

        .alert-card-container.note {
          background: rgba(99, 102, 241, 0.06);
          border-color: rgba(99, 102, 241, 0.15);
        }

        .alert-card-container.important {
          background: rgba(6, 182, 212, 0.06);
          border-color: rgba(6, 182, 212, 0.15);
        }

        .alert-card-container.warning {
          background: rgba(245, 158, 11, 0.06);
          border-color: rgba(245, 158, 11, 0.15);
        }

        .alert-card-container.default {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.06);
        }

        .alert-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .alert-card-container.tip .alert-badge { background: rgba(16, 185, 129, 0.12); color: #10b981; }
        .alert-card-container.note .alert-badge { background: rgba(99, 102, 241, 0.12); color: #6366f1; }
        .alert-card-container.important .alert-badge { background: rgba(6, 182, 212, 0.12); color: #06b6d4; }
        .alert-card-container.warning .alert-badge { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
        .alert-card-container.default .alert-badge { background: rgba(255, 255, 255, 0.05); color: #94a3b8; }

        .alert-body {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .alert-line {
          font-size: 0.92rem;
          line-height: 1.6;
          color: #cbd5e1;
        }

        /* Custom tables */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
          margin-bottom: 28px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
          text-align: left;
          background: rgba(9, 13, 22, 0.4);
        }

        .custom-table th {
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding: 14px 18px;
          font-weight: 600;
          color: #f8fafc;
        }

        .custom-table td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding: 14px 18px;
          color: #cbd5e1;
        }

        .custom-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }
      `}</style>
    </div>
  );
}

// Inline helper to parse bold, links and inline code strings
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];
  
  // Format bold (**text**), inline code (`code`), and links ([text](url))
  // A simple tokenizer using split
  const tokens: React.ReactNode[] = [];
  let index = 0;
  
  // Regex to match bold, code, links
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);
  
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code className="inline-code" key={idx}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return <a href={match[2]} key={idx}>{match[1]}</a>;
      }
    }
    return <span key={idx}>{part}</span>;
  });
}

// Sub-component for code blocks with copy actions
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-lang-badge">{lang}</span>
        <button className="copy-code-btn" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      <pre className="code-block-body">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Sub-component for custom glowing alert cards
function AlertCard({ type, lines }: { type: 'note' | 'tip' | 'important' | 'warning' | 'default'; lines: string[] }) {
  const iconsMap = {
    note: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
    tip: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
        <path d="M9.663 17h4.673M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 00-7 7c0 2.902 2.26 5.345 5.16 5.86V19h3.68v-1.14c2.9-.515 5.16-2.958 5.16-5.86a7 7 0 00-7-7z"/>
      </svg>
    ),
    important: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    default: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  };

  return (
    <div className={`alert-card-container ${type}`}>
      <span className="alert-badge">
        {iconsMap[type]}
        <span>{type}</span>
      </span>
      <div className="alert-body">
        {lines.map((line, idx) => (
          <div className="alert-line" key={idx}>
            {parseInline(line)}
          </div>
        ))}
      </div>
    </div>
  );
}
