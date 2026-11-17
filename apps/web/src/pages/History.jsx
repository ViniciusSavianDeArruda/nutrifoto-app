import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { api } from "../lib/api.js";
import { fmt, fmtDayLong, isoDay, MEAL_TYPES } from "../lib/nutrition.js";
import MealRow from "../components/MealRow.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { Empty, Header, Spinner } from "../components/ui.jsx";

const PAGE = 20;

export default function History() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useInfiniteQuery({
    queryKey: ["meals", "history", debounced, type, from, to],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.meals({ q: debounced, type, date_from: from, date_to: to, limit: PAGE, offset: pageParam }),
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length * PAGE : undefined),
  });

  const groups = useMemo(() => {
    const map = new Map();
    for (const m of query.data?.pages.flat() ?? []) {
      const key = isoDay(new Date(m.eaten_at));
      if (!map.has(key)) map.set(key, { key, iso: m.eaten_at, meals: [], kcal: 0 });
      const g = map.get(key);
      g.meals.push(m);
      g.kcal += m.totals.kcal;
    }
    return [...map.values()];
  }, [query.data]);

  const activeFilters = [type, from, to].filter(Boolean).length;

  return (
    <>
      <Header title="Histórico" subtitle="Tudo o que você já registrou." />

      <div className="mb-3 flex gap-2 lg:max-w-2xl">
        <div className="relative flex-1">
          <label htmlFor="q" className="sr-only">Buscar alimento</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input id="q" type="search" className="input pl-10" placeholder="Buscar alimento ou observação" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button
          className="btn-quiet relative !w-11 !px-0"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          aria-label={activeFilters ? `Filtros (${activeFilters} ativos)` : "Filtros"}
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          {activeFilters > 0 && <span className="num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-yolk px-1 text-xs font-bold text-yolk-ink">{activeFilters}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="card mb-3 grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <label htmlFor="type" className="label">Tipo</label>
            <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todos</option>
              {MEAL_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="from" className="label">De</label>
            <input id="from" type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="to" className="label">Até</label>
            <input id="to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          {activeFilters > 0 && (
            <button className="btn-quiet col-span-2 lg:col-span-1 lg:self-end" onClick={() => { setType(""); setFrom(""); setTo(""); }}>Limpar filtros</button>
          )}
        </div>
      )}

      {query.isLoading && <Spinner />}
      <ErrorNotice error={query.error} />

      {!query.isLoading && !query.error && groups.length === 0 && (
        <div className="card">
          <Empty icon={UtensilsCrossed} title={debounced || activeFilters ? "Nada encontrado" : "Seu histórico está vazio"}>
            {debounced || activeFilters ? "Tente outra busca ou limpe os filtros." : "As refeições que você salvar aparecem aqui."}
          </Empty>
        </div>
      )}

      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        {groups.map((g) => (
          <section key={g.key} aria-label={fmtDayLong(g.iso)}>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <h2 className="text-sm font-bold first-letter:uppercase">{fmtDayLong(g.iso)}</h2>
              <p className="num text-sm text-soft">{fmt(g.kcal)} kcal</p>
            </div>
            <ul className="card divide-y divide-line overflow-hidden">
              {g.meals.map((m) => <MealRow key={m.id} meal={m} />)}
            </ul>
          </section>
        ))}
      </div>

      {query.hasNextPage && (
        <button className="btn-quiet mt-5 w-full lg:mx-auto lg:flex lg:w-64" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          {query.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
        </button>
      )}
    </>
  );
}
