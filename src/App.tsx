import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { marked } from 'marked';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Note } from './types';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // 滚动同步相关的 ref
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    const savedNotes = localStorage.getItem('markdown-notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('markdown-notes', JSON.stringify(notes));
    }
  }, [notes]);

  useEffect(() => {
    if (currentNote) {
      setEditorContent(currentNote.content);
    }
  }, [currentNote]);

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditorContent(newContent);
    
    if (currentNote) {
      const updatedNotes = notes.map(note => {
        if (note.id === currentNote.id) {
          const updatedNote = {
            ...note,
            content: newContent,
            updatedAt: new Date().toISOString(),
            wordCount: newContent.trim().length
          };
          return updatedNote;
        }
        return note;
      });
      setNotes(updatedNotes);
      setCurrentNote(updatedNotes.find(note => note.id === currentNote.id) || null);
    }
  };

  const createNewNote = () => {
    const content = '';
    const newNote: Note = {
      id: Date.now().toString(),
      title: '新笔记',
      content: content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setCurrentNote(newNote);
    setEditorContent('');
  };

  const deleteCurrentNote = () => {
    if (currentNote) {
      const updatedNotes = notes.filter(note => note.id !== currentNote.id);
      setNotes(updatedNotes);
      setCurrentNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateReadingTime = (content: string): string => {
    const words = content.trim().length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} 分钟`;
  };

  // 滚动同步处理函数
  const handleEditorScroll = () => {
    if (isSyncing.current) return;
    
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    if (editor && preview) {
      isSyncing.current = true;
      
      const editorHeight = editor.scrollHeight - editor.clientHeight;
      const previewHeight = preview.scrollHeight - preview.clientHeight;
      const scrollRatio = editor.scrollTop / editorHeight;
      
      preview.scrollTop = scrollRatio * previewHeight;
      
      setTimeout(() => {
        isSyncing.current = false;
      }, 10);
    }
  };

  const handlePreviewScroll = () => {
    if (isSyncing.current) return;
    
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    if (editor && preview) {
      isSyncing.current = true;
      
      const editorHeight = editor.scrollHeight - editor.clientHeight;
      const previewHeight = preview.scrollHeight - preview.clientHeight;
      const scrollRatio = preview.scrollTop / previewHeight;
      
      editor.scrollTop = scrollRatio * editorHeight;
      
      setTimeout(() => {
        isSyncing.current = false;
      }, 10);
    }
  };

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 特别处理 Alt+N，确保阻止浏览器默认行为
    if (e.altKey && !e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      createNewNote();
      return;
    }

    // 特别处理 Ctrl+Delete，确保阻止浏览器默认行为
    if (e.ctrlKey && e.key === 'Delete') {
      e.preventDefault();
      deleteCurrentNote();
      return;
    }

    // 处理需要编辑器的快捷键
    const editor = editorRef.current;
    if (!editor) return;

    // 获取选中的文本和光标位置
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editorContent.substring(start, end);
    const beforeSelection = editorContent.substring(0, start);
    const afterSelection = editorContent.substring(end);

    // 处理编辑器相关快捷键
    if (e.ctrlKey && !e.altKey && !e.metaKey) {
      if (e.shiftKey) {
        // Ctrl + Shift 组合键
        switch (e.key) {
          // 代码块
          case 'c':
          case 'C':
            e.preventDefault();
            if (selectedText) {
              insertMarkdown(beforeSelection, afterSelection, '```javascript\n', '\n```', selectedText);
            } else {
              insertMarkdown(beforeSelection, afterSelection, '```javascript\n', '\n```', '');
            }
            break;
          // 列表
          case 'l':
          case 'L':
            e.preventDefault();
            insertMarkdown(beforeSelection, afterSelection, '- ', '', selectedText);
            break;
          // 引用
          case 'q':
          case 'Q':
            e.preventDefault();
            insertMarkdown(beforeSelection, afterSelection, '> ', '', selectedText);
            break;
          default:
            break;
        }
      } else {
        // 只有 Ctrl 键
        switch (e.key) {
          // 标题 1-3
          case '1':
            e.preventDefault();
            insertMarkdown(beforeSelection, afterSelection, '# ', ' ', selectedText);
            break;
          case '2':
            e.preventDefault();
            insertMarkdown(beforeSelection, afterSelection, '## ', ' ', selectedText);
            break;
          case '3':
            e.preventDefault();
            insertMarkdown(beforeSelection, afterSelection, '### ', ' ', selectedText);
            break;
          // 粗体
          case 'b':
          case 'B':
            e.preventDefault();
            insertMarkdown(beforeSelection, afterSelection, '**', '**', selectedText);
            break;
          // 斜体
          case 'i':
          case 'I':
            e.preventDefault();
            insertMarkdown(beforeSelection, afterSelection, '*', '*', selectedText);
            break;
          // 链接
          case 'k':
          case 'K':
            e.preventDefault();
            if (selectedText) {
              insertMarkdown(beforeSelection, afterSelection, '[', '](url)', selectedText);
            } else {
              insertMarkdown(beforeSelection, afterSelection, '[链接文本](', ')', '');
            }
            break;
          default:
            break;
        }
      }
    }
  };

  // 在组件挂载时添加全局键盘事件监听器
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 特别处理 Alt+N，确保阻止浏览器默认行为
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        createNewNote();
        return;
      }
      // 特别处理 Ctrl+Delete，确保阻止浏览器默认行为
      if (e.ctrlKey && e.key === 'Delete') {
        e.preventDefault();
        deleteCurrentNote();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [createNewNote, deleteCurrentNote]);

  // 插入 Markdown 标记
  const insertMarkdown = (before: string, after: string, prefix: string, suffix: string, text: string) => {
    const newContent = before + prefix + text + suffix + after;
    setEditorContent(newContent);

    // 更新笔记
    if (currentNote) {
      const updatedNotes = notes.map(note => {
        if (note.id === currentNote.id) {
          return {
            ...note,
            content: newContent,
            updatedAt: new Date().toISOString(),
            wordCount: newContent.trim().length
          };
        }
        return note;
      });
      setNotes(updatedNotes);
      setCurrentNote(updatedNotes.find(note => note.id === currentNote.id) || null);
    }

    // 聚焦编辑器并设置光标位置
    setTimeout(() => {
      const editor = editorRef.current;
      if (editor) {
        const cursorPosition = before.length + prefix.length + text.length + suffix.length;
        editor.focus();
        editor.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // 导出 MD 文件
  const handleExportMD = () => {
    if (!currentNote) return;

    const content = currentNote.content;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNote.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导出 PDF 文件
  const handleExportPDF = () => {
    if (!currentNote) return;

    // 使用 marked 将 Markdown 转换为 HTML
    const htmlContent = marked(currentNote.content || '无内容');

    // 创建一个临时的 HTML 元素用于生成 PDF
    const element = document.createElement('div');
    // 设置元素样式，确保文本颜色为黑色
    element.style.cssText = `
      font-family: Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      color: #000000 !important;
    `;
    element.innerHTML = `
      <h1 style="text-align: center; margin-bottom: 40px; color: #000000 !important;">${currentNote.title}</h1>
      <div style="line-height: 1.6; color: #000000 !important;">${htmlContent}</div>
    `;
    document.body.appendChild(element);

    // 配置 html2pdf 选项
    const opt = {
      margin: 10,
      filename: `${currentNote.title}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    // 生成并下载 PDF
    html2pdf().set(opt).from(element).save().then(() => {
      // 清理临时元素
      document.body.removeChild(element);
    });
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw',
      backgroundColor: '#121212', 
      color: 'white', 
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box'
    }}>
      {/* 左侧边栏 - 笔记列表 */}
      <div style={{ width: '250px', borderRight: '1px solid #333', backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50', marginBottom: '12px' }}>MARKDOWN NOTES</h1>
          <input
            type="text"
            placeholder="搜索笔记..."
            style={{ width: '100%', padding: '6px 10px', backgroundColor: '#333', border: '1px solid #444', borderRadius: '4px', color: 'white', outline: 'none', boxSizing: 'border-box' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '10px',
                marginBottom: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: currentNote?.id === note.id ? '#333' : 'transparent',
                borderLeft: currentNote?.id === note.id ? '3px solid #4caf50' : '3px solid transparent'
              }}
              onClick={() => setCurrentNote(note)}
            >
              <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: currentNote?.id === note.id ? '#4caf50' : 'white' }}>{note.title}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                {note.wordCount} 字 · {calculateReadingTime(note.content)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px', borderTop: '1px solid #333' }}>
          <button
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4caf50'}
            onClick={createNewNote}
          >
            <span style={{ marginRight: '6px' }}>+</span> 新建笔记
          </button>
        </div>
      </div>

      {/* 右侧内容区域 - 包含标题栏、编辑器和预览 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 顶部标题栏 - 只在中间和右侧区域之上 */}
        {currentNote && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', backgroundColor: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <input
              type="text"
              value={currentNote.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                const updatedNotes = notes.map(note => {
                  if (note.id === currentNote.id) {
                    return {
                      ...note,
                      title: newTitle,
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return note;
                });
                setNotes(updatedNotes);
                setCurrentNote(updatedNotes.find(note => note.id === currentNote.id) || null);
              }}
              style={{
                flex: 1,
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                marginRight: '16px'
              }}
              placeholder="笔记标题"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button style={{
                padding: '4px 8px',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #444',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'} onClick={() => setShowShortcuts(!showShortcuts)} title="快捷键">
                ⌨️ 快捷键
              </button>
              <button style={{
                padding: '4px 8px',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #444',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'} onClick={handleExportMD}>
                导出 MD
              </button>
              <button style={{
                padding: '4px 8px',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #444',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'} onClick={handleExportPDF}>
                导出 PDF
              </button>
              <button style={{
                padding: '4px 8px',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: '1px solid #d32f2f',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c62828'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'} onClick={deleteCurrentNote}>
                删除
              </button>
            </div>
          </div>
        )}

        {/* 编辑器和预览区域 */}
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* 中间 - 编辑器 */}
            <div style={{ flex: 1, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: '#121212' }}>
              {currentNote ? (
                <textarea
                  ref={editorRef}
                  style={{
                    flex: 1,
                    padding: '16px',
                    backgroundColor: '#121212',
                    color: 'white',
                    border: 'none',
                    outline: 'none',
                    fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    resize: 'none',
                    overflowY: 'auto'
                  }}
                  value={editorContent}
                  onChange={handleEditorChange}
                  onKeyDown={handleKeyDown}
                  onScroll={handleEditorScroll}
                  placeholder="开始编写 Markdown..."
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                  选择或创建一个笔记
                </div>
              )}
            </div>

            {/* 右侧 - 预览 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: '#121212' }}>
              {currentNote ? (
                <div 
                  ref={previewRef}
                  style={{ flex: 1, padding: '16px', overflowY: 'auto', color: 'white' }}
                  onScroll={handlePreviewScroll}
                >
                  <ReactMarkdown 
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        if (!inline && match) {
                          return (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          );
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {editorContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                  预览将显示在这里
                </div>
              )}
            </div>
          </div>
          
          {/* 底部合并状态栏 */}
          {currentNote && (
            <div style={{ padding: '6px 16px', borderTop: '1px solid #333', backgroundColor: '#1e1e1e', fontSize: '11px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
              <span>行 {editorContent.split('\n').length}, 列 {editorContent.split('\n').pop()?.length || 0}</span>
              <span>字: {currentNote.wordCount} | UTF-8 · Markdown</span>
              <span>已保存</span>
            </div>
          )}
        </div>
      </div>

      {/* 快捷键模态框 */}
      {showShortcuts && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowShortcuts(false)}>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            maxHeight: '80%',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #333',
              paddingBottom: '12px'
            }}>
              <h2 style={{ color: '#4caf50', margin: 0, fontSize: '18px' }}>Markdown 快捷键</h2>
              <button style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }} onClick={() => setShowShortcuts(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>标题 1</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + 1</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>标题 2</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + 2</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>标题 3</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + 3</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>粗体</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + B</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>斜体</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + I</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>代码块</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + Shift + C</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>链接</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + K</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>列表</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + Shift + L</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>引用</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + Shift + Q</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>新建笔记</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Alt + N</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>删除笔记</span>
                <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Ctrl + Delete</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;