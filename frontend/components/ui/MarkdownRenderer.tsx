import React from 'react';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("markdown-content prose dark:prose-invert max-w-none text-sm break-words", className)}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="relative mt-4 mb-4 overflow-hidden rounded-xl border border-border bg-[#1E1E1E]">
                <div className="flex h-8 items-center px-4 bg-black/40 border-b border-white/10">
                  <span className="text-[10px] text-white/50 font-mono uppercase tracking-widest">{match[1]}</span>
                </div>
                <SyntaxHighlighter
                  {...props}
                  style={vscDarkPlus as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '13px' }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={cn("px-1.5 py-0.5 rounded-md bg-muted text-foreground text-[0.9em] font-mono", className)} {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mt-4 mb-2">{children}</h3>,
          a: ({ children, href }) => <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-left border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-border p-2 font-semibold bg-muted/50">{children}</th>,
          td: ({ children }) => <td className="border-b border-border/50 p-2">{children}</td>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-4 italic text-muted-foreground bg-muted/20 rounded-r-lg">{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
