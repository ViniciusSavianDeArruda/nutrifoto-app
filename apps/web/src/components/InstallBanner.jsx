import { useState, useEffect } from "react";

const INSTALL_KEY = "nutrifoto.install_dismissed";

export default function InstallBanner() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => { try { return Boolean(localStorage.getItem(INSTALL_KEY)); } catch { return false; } },
  );

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) return;
    if (dismissed) return;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|Chrome/.test(navigator.userAgent);
    if (isIOS) { setShowIOSTip(true); return; }
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  const dismiss = () => {
    try { localStorage.setItem(INSTALL_KEY, "1"); } catch {}
    setDismissed(true);
    setInstallPrompt(null);
    setShowIOSTip(false);
  };

  if (dismissed || (!installPrompt && !showIOSTip)) return null;

  return (
    <div className="relative mb-2 rounded-md border border-line bg-ground px-4 py-3 text-sm">
      <button type="button" className="absolute right-2 top-2 p-1 text-soft" aria-label="Dispensar aviso de instalação" onClick={dismiss}>✕</button>
      {installPrompt ? (
        <button type="button" className="btn-quiet w-full" onClick={handleInstall}>Instalar app</button>
      ) : (
        <p className="pr-6 text-soft">Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>
      )}
    </div>
  );
}
