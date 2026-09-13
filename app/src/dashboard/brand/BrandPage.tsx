import { SectionEmpty } from '../shared/SectionEmpty';

export function BrandPage() {
  return (
    <SectionEmpty
      title="Brand"
      body="Upload your logo and pick one accent color. Kiosks running your events will use them everywhere the current orange appears."
      cta={{ label: 'Set brand', hash: '#/brand/edit' }}
    />
  );
}
