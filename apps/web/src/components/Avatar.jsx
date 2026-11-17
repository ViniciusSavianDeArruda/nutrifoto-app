/** Foto de perfil, ou a inicial do nome quando não há foto. */
export default function Avatar({ user, className = "h-10 w-10", text = "text-base" }) {
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" className={`${className} shrink-0 rounded-full object-cover`} />;
  return (
    <span className={`${className} ${text} flex shrink-0 items-center justify-center rounded-full bg-night font-bold text-white`} aria-hidden="true">
      {initial}
    </span>
  );
}
