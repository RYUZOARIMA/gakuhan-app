import fs from "node:fs";
import path from "node:path";

const LOGO_PUBLIC_PATH = "/company-logo.png";
const LOGO_FILE_PATH = path.join(process.cwd(), "public", "company-logo.png");

// 会社ロゴファイルがまだpublic/に置かれていない間も壊れた画像を出さないよう、
// 存在確認してから表示する(学校の校章と違い管理画面からのアップロードは
// 想定していない固定アセットのため、ファイルの有無だけを見ればよい)。
export function SiteHeader() {
  const hasLogo = fs.existsSync(LOGO_FILE_PATH);
  if (!hasLogo) return null;

  return (
    <header className="flex justify-center border-b border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_PUBLIC_PATH}
        alt="タダスポーツ"
        className="h-16 w-auto object-contain"
      />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white px-6 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <p className="font-medium text-zinc-800 dark:text-zinc-200">タダスポーツ</p>
      <p className="mt-1">〒880-0841 宮崎県宮崎市吉村町曽師前甲甲3169-4</p>
      <p className="mt-1">電話番号: 0985-24-2639</p>
    </footer>
  );
}
