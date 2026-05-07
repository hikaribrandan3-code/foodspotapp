import { useLanguage } from '../../../contexts/LanguageContext';
import MenuInventoryView from '../../../components/owner/MenuInventoryView';

export default function InventoryTab() {
  const { lang } = useLanguage();

  return (
    <div className="py-12">
      <MenuInventoryView lang={lang} />
    </div>
  );
}
