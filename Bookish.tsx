"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, List, LayoutGrid, Upload, LogIn, User, BookOpen, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Bookmark, Highlighter, Moon, Sun, X } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

// PDF.js worker (you'll swap this URL to your hosted worker in real app)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.js`;

// ---- Types ----
interface Book {
  id: string;
  title: string;
  author?: string;
  tags: string[];
  pages?: number;
  progress?: number; // 0..1
  cover?: string; // data URL or CDN path
  src?: string; // PDF URL
  addedAt: string;
}

interface BookmarkItem { id: string; page: number; note?: string; createdAt: string }
interface HighlightItem { id: string; page: number; rect: {x:number;y:number;width:number;height:number}; color?: string; note?: string }

// Mock data
const SAMPLE_BOOKS: Book[] = [
  {
    id: "b1",
    title: "The Art of Focus",
    author: "A. Sharma",
    tags: ["productivity", "non-fiction"],
    progress: 0.32,
    cover: "",
    src: "https://ar5iv.org/html/1407.3561.pdf", // public pdf for preview; replace later
    addedAt: new Date().toISOString(),
  },
  {
    id: "b2",
    title: "Designing for Readers",
    author: "M. Harper",
    tags: ["design"],
    progress: 0.66,
    cover: "",
    src: "https://ar5iv.org/html/1707.08567.pdf",
    addedAt: new Date().toISOString(),
  },
];

export default function BookishApp() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dark, setDark] = useState(true);
  const [books, setBooks] = useState<Book[]>(SAMPLE_BOOKS);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [current, setCurrent] = useState<Book | null>(null);

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    books.forEach(b => b.tags.forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [books]);

  const results = useMemo(() => {
    return books.filter(b => {
      const matchesQuery = [b.title, b.author, b.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesTags = activeTags.length === 0 || activeTags.every(t => b.tags.includes(t));
      return matchesQuery && matchesTags;
    });
  }, [books, query, activeTags]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <BookOpen className="w-6 h-6"/>
          <div className="font-semibold tracking-tight">Bookish</div>
          <div className="flex-1" />
          <div className="relative w-full max-w-lg">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your library..."
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-60"/>
          </div>
          <button
            onClick={() => setDark(d => !d)}
            className="ml-3 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
          </button>
          <button className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <LogIn className="w-4 h-4"/>
            <span>Login</span>
          </button>
          <button className="ml-2 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <User className="w-5 h-5"/>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tag filter row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {allTags.map(t => (
            <button
              key={t}
              onClick={() => setActiveTags(prev => prev.includes(t) ? prev.filter(x => x!==t) : [...prev, t])}
              className={`px-3 py-1 rounded-full border text-sm ${activeTags.includes(t) ? "bg-blue-600 text-white border-blue-600" : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
            >{t}</button>
          ))}
          <div className="flex-1"/>
          <div className="inline-flex rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <button onClick={() => setView("grid")} className={`px-3 py-2 ${view==="grid"?"bg-neutral-100 dark:bg-neutral-800":""}`}><LayoutGrid className="w-4 h-4"/></button>
            <button onClick={() => setView("list")} className={`px-3 py-2 ${view==="list"?"bg-neutral-100 dark:bg-neutral-800":""}`}><List className="w-4 h-4"/></button>
          </div>
          <button onClick={() => setShowUpload(true)} className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white hover:brightness-110">
            <Upload className="w-4 h-4"/> Upload PDFs
          </button>
        </div>

        {/* Library */}
        {results.length === 0 && (
          <div className="text-neutral-500 text-sm">No books yet. Click <b>Upload PDFs</b> to add your first book.</div>
        )}

        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(b => (
              <CardBook key={b.id} book={b} onOpen={() => { setCurrent(b); setReaderOpen(true); }}/>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {results.map(b => (
              <RowBook key={b.id} book={b} onOpen={() => { setCurrent(b); setReaderOpen(true); }}/>
            ))}
          </div>
        )}
      </main>

      {/* Upload Drawer (simple) */}
      {showUpload && (
        <Drawer onClose={() => setShowUpload(false)} title="Upload to your library">
          <div className="p-4">
            <div className="border-2 border-dashed rounded-2xl p-10 text-center bg-neutral-50 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700">
              <Upload className="w-6 h-6 mx-auto mb-2"/>
              <div className="font-medium mb-1">Drag and drop PDFs here</div>
              <div className="text-sm text-neutral-500">or click to select files</div>
            </div>
            <p className="text-xs text-neutral-500 mt-3">Tip: we’ll extract text for fast in-book search and generate a crisp cover thumbnail.</p>
          </div>
        </Drawer>
      )}

      {/* Reader */}
      {readerOpen && current && (
        <ReaderModal book={current} onClose={() => setReaderOpen(false)} />
      )}
    </div>
  );
}

// ---- Components ----
function CardBook({ book, onOpen }: { book: Book; onOpen: () => void }) {
  return (
    <div className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-neutral-900">
      <div className="aspect-[3/4] bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 relative">
        {/* cover placeholder */}
        <div className="absolute inset-0 grid place-items-center text-neutral-500"><BookOpen className="w-10 h-10"/></div>
      </div>
      <div className="p-4">
        <div className="font-semibold truncate" title={book.title}>{book.title}</div>
        <div className="text-sm text-neutral-500 truncate">{book.author || "Unknown"}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {book.tags.map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">{t}</span>
          ))}
        </div>
        {typeof book.progress === "number" && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${Math.round(book.progress * 100)}%` }} />
            </div>
            <div className="text-xs text-neutral-500 mt-1">{Math.round(book.progress * 100)}% read</div>
          </div>
        )}
        <button onClick={onOpen} className="mt-3 w-full py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90">Open</button>
      </div>
    </div>
  );
}

function RowBook({ book, onOpen }: { book: Book; onOpen: () => void }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/40 dark:bg-neutral-900/40">
      <div className="w-12 h-16 rounded-md bg-neutral-200 dark:bg-neutral-800 grid place-items-center"><BookOpen className="w-5 h-5 opacity-70"/></div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{book.title}</div>
        <div className="text-sm text-neutral-500 truncate">{book.author || "Unknown"}</div>
      </div>
      <div className="hidden sm:flex gap-1 flex-wrap">
        {book.tags.map(t => (<span key={t} className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">{t}</span>))}
      </div>
      <div className="w-32 hidden md:block">
        <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full bg-blue-600" style={{ width: `${Math.round((book.progress||0) * 100)}%` }} />
        </div>
      </div>
      <button onClick={onOpen} className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">Open</button>
    </div>
  );
}

function Drawer({ title, onClose, children }:{title:string; onClose:()=>void; children: React.ReactNode}){
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="w-4 h-4"/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ReaderModal({ book, onClose }:{book: Book; onClose:()=>void}){
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [findText, setFindText] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  const onDocLoad = ({ numPages }: { numPages: number }) => setNumPages(numPages);

  const addBookmark = () => {
    setBookmarks(b => [{ id: crypto.randomUUID(), page, createdAt: new Date().toISOString() }, ...b]);
  };

  // Simple highlight by drawing a rectangle (drag on page)
  const [dragStart, setDragStart] = useState<{x:number;y:number}|null>(null);
  const [draftRect, setDraftRect] = useState<{x:number;y:number;width:number;height:number}|null>(null);

  const onPageMouseDown = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onPageMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return;
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const r = { x: Math.min(dragStart.x, x), y: Math.min(dragStart.y, y), width: Math.abs(x - dragStart.x), height: Math.abs(y - dragStart.y) };
    setDraftRect(r);
  };
  const onPageMouseUp = () => {
    if (draftRect && draftRect.width > 8 && draftRect.height > 8) {
      setHighlights(h => [{ id: crypto.randomUUID(), page, rect: draftRect, color: "#fde68a" }, ...h]);
    }
    setDragStart(null);
    setDraftRect(null);
  };

  const go = (delta:number) => setPage(p => Math.min(Math.max(1, p + delta), numPages || 1));

  // Basic in-page "jump" using naive page number lookup from typed digits like "12" or text search placeholder
  const onFindSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(findText, 10);
    if (!isNaN(n)) setPage(Math.min(Math.max(1, n), numPages || 1));
    // Later: if text, query server-side index to jump to the best page
  };

  // Compute highlights per page
  const pageHighlights = useMemo(() => highlights.filter(h => h.page === page), [highlights, page]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="flex items-center gap-2 p-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur">
        <button onClick={onClose} className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"><ChevronLeft className="w-4 h-4"/></button>
        <div className="font-medium truncate">{book.title}</div>
        <div className="text-sm text-neutral-500">{page}/{numPages || "-"}</div>
        <div className="flex-1"/>
        <form onSubmit={onFindSubmit} className="relative">
          <input value={findText} onChange={e=>setFindText(e.target.value)} placeholder="Go to page… (e.g. 12)" className="pl-3 pr-3 py-2 w-48 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"/>
        </form>
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-2"/>
        <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Zoom in"><ZoomIn className="w-4 h-4"/></button>
        <button onClick={() => setScale(s => Math.max(0.6, s - 0.1))} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Zoom out"><ZoomOut className="w-4 h-4"/></button>
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-2"/>
        <button onClick={() => go(-1)} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Prev page"><ChevronLeft className="w-4 h-4"/></button>
        <button onClick={() => go(1)} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Next page"><ChevronRight className="w-4 h-4"/></button>
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-2"/>
        <button onClick={addBookmark} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Bookmark page"><Bookmark className="w-4 h-4"/></button>
        <button className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Highlight mode (drag)"><Highlighter className="w-4 h-4"/></button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto grid place-items-center p-6">
        <div className="relative">
          {/* PDF */}
          <Document file={book.src} onLoadSuccess={onDocLoad} loading={<div className="text-neutral-500 text-sm">Loading PDF…</div>}>
            <div className="relative select-none" onMouseDown={onPageMouseDown} onMouseMove={onPageMouseMove} onMouseUp={onPageMouseUp}>
              <Page pageNumber={page} scale={scale} renderTextLayer renderAnnotationLayer className="shadow-2xl rounded-xl overflow-hidden bg-white"/>
              {/* Highlights overlay for current page */}
              <div className="absolute inset-0 pointer-events-none">
                {pageHighlights.map(h => (
                  <div key={h.id} style={{ left: h.rect.x, top: h.rect.y, width: h.rect.width, height: h.rect.height }} className="absolute rounded-sm bg-yellow-300/40 outline outline-1 outline-yellow-400/60" />
                ))}
                {draftRect && (
                  <div style={{ left: draftRect.x, top: draftRect.y, width: draftRect.width, height: draftRect.height }} className="absolute rounded-sm bg-yellow-300/30 outline outline-1 outline-yellow-400/50" />
                )}
              </div>
            </div>
          </Document>
        </div>
      </div>

      {/* Side panel */}
      <div className="w-full border-t border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
        <div className="max-w-7xl mx-auto p-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Panel title="Bookmarks" empty="No bookmarks yet.">
            {bookmarks.map(b => (
              <div key={b.id} className="flex items-center justify-between py-1.5">
                <div className="text-sm">Page <b>{b.page}</b></div>
                <button onClick={()=>setPage(b.page)} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">Go</button>
              </div>
            ))}
          </Panel>
          <Panel title="Highlights" empty="No highlights yet. Drag on the page to add one.">
            {highlights.map(h => (
              <div key={h.id} className="text-sm py-1.5 flex items-center justify-between">
                <div>Page <b>{h.page}</b></div>
                <button onClick={()=>setPage(h.page)} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">Jump</button>
              </div>
            ))}
          </Panel>
          <Panel title="Notes" empty="No notes yet.">
            <div className="text-sm text-neutral-500">(Coming soon) Attach notes to pages, export markdown, and sync across devices.</div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, empty, children }:{title:string; empty:string; children: React.ReactNode}){
  const has = React.Children.count(children) > 0;
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-3">
      <div className="font-medium mb-2">{title}</div>
      {has ? children : <div className="text-sm text-neutral-500">{empty}</div>}
    </div>
  );
}
