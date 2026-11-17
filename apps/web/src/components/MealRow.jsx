import { Link } from "react-router-dom";
import { MiniTray } from "./Tray.jsx";
import { fmt, fmtTime, mealLabel } from "../lib/nutrition.js";

export default function MealRow({ meal }) {
  return (
    <li>
      <Link to={`/refeicao/${meal.id}`} className="flex min-h-[64px] items-center gap-3 px-3 py-2.5 hover:bg-ground">
        {meal.thumb_url ? (
          <img src={meal.thumb_url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-md object-cover" />
        ) : (
          <MiniTray totals={meal.totals} className="h-12 w-16 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-soft">
            {mealLabel(meal.meal_type)} · <span className="num">{fmtTime(meal.eaten_at)}</span>
          </p>
          <p className="truncate font-semibold">{meal.item_names.length ? meal.item_names.join(", ") : "Sem alimentos ainda"}</p>
        </div>
        <p className="num shrink-0 text-right leading-tight">
          <span className="text-xl font-semibold">{fmt(meal.totals.kcal)}</span>
          <span className="block text-[0.8125rem] text-soft">kcal</span>
        </p>
      </Link>
    </li>
  );
}
