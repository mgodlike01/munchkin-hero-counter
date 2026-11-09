import { Download, Share, Smartphone } from 'lucide-react'
import { Modal } from './Modal'

export function InstallModal({ canInstall, installed, offlineReady, onInstall, onClose }: {
  canInstall: boolean; installed: boolean; offlineReady: boolean; onInstall: () => Promise<void>; onClose: () => void
}) {
  return (
    <Modal title="Герой всегда под рукой" onClose={onClose} compact>
      <div className="install-hero"><Smartphone size={34} /><p>Добавь счётчик на главный экран.<br />После загрузки он работает без интернета.</p></div>
      {installed ? <p className="install-ready">Приложение уже запущено с главного экрана.</p> : <>
        {canInstall && <button className="primary-button w-full" onClick={() => void onInstall().catch(() => undefined)}><Download size={18} />Установить приложение</button>}
        <div className="install-instructions"><h3>iPhone · Safari</h3><p>Нажми «Поделиться» <Share size={15} className="inline-icon" />, затем «На экран Домой» → «Добавить».</p><h3>Android · Chrome</h3><p>Открой меню ⋮ → «Добавить на главный экран» → «Установить».</p></div>
      </>}
      <p className="offline-install-note">{offlineReady ? 'Всё готово: приложение доступно без интернета.' : 'Перед первым офлайн-запуском дождись отметки «Готово к офлайну» на главном экране. В режиме разработки офлайн-кеш отключён.'}</p>
    </Modal>
  )
}
