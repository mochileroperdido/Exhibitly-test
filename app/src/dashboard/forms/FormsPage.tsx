import { SectionEmpty } from '../shared/SectionEmpty';

export function FormsPage() {
  return (
    <SectionEmpty
      title="Forms"
      body="The default lead form asks for name, email, and area of interest. Build a form with up to 5 custom questions to use at specific events."
      cta={{ label: 'New form', hash: '#/forms/new' }}
    />
  );
}
