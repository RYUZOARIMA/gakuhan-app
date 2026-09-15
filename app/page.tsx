import Link from "next/link";
import { listSchools } from "@/lib/schools";
import { SearchBox, SearchableItem } from "./search-filter";

export default async function Home() {
  const schools = await listSchools();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          学販オンライン注文
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          学校を選んで、制服・体操服のご注文にお進みください。
        </p>

        <div className="mt-6">
          <SearchBox placeholder="学校名で検索">
            <ul className="mt-3 flex flex-col gap-3">
              {schools.map((school) => (
                <SearchableItem key={school.id} matchText={school.name}>
                  <li>
                    <Link
                      href={`/${school.slug}`}
                      className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-5 py-4 font-medium text-zinc-900 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      {school.hasLogo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/${school.slug}/logo?v=${school.logoVersion}`}
                          alt={`${school.name} 校章`}
                          className="h-12 w-12 shrink-0 object-contain"
                        />
                      )}
                      {school.name}
                    </Link>
                  </li>
                </SearchableItem>
              ))}
            </ul>
          </SearchBox>
        </div>
      </div>
    </div>
  );
}
