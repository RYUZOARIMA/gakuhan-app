"use client";

import { createContext, useContext, useState } from "react";

const SearchQueryContext = createContext("");

// サーバーコンポーネント側で描画済みの一覧(学校一覧など)を、クライアント側の
// テキスト入力だけで絞り込むための軽量なラッパー。SearchableItemに一致しない
// 項目はDOMごと非表示にする(サーバーの再取得は発生しない)。
export function SearchBox({
  children,
  placeholder,
}: {
  children: React.ReactNode;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      <SearchQueryContext.Provider value={query.trim().toLowerCase()}>
        {children}
      </SearchQueryContext.Provider>
    </div>
  );
}

export function SearchableItem({
  matchText,
  children,
}: {
  matchText: string;
  children: React.ReactNode;
}) {
  const query = useContext(SearchQueryContext);
  const matches = query === "" || matchText.toLowerCase().includes(query);
  if (!matches) return null;
  return <>{children}</>;
}
