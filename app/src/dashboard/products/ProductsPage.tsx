import { SectionEmpty } from '../shared/SectionEmpty';

export function ProductsPage() {
  return (
    <SectionEmpty
      title="Products"
      body="Upload your 3D models, set titles, hotspots, and specs. Products you add here become reusable across every event."
      cta={{ label: 'Add your first product', hash: '#/products/new' }}
      note="Don't have a 3D model yet? We can build one for you — reply to your onboarding email."
    />
  );
}
