import { SectionEmpty } from '../shared/SectionEmpty';

export function MediaPage() {
  return (
    <SectionEmpty
      title="Media"
      body="Upload short how-to videos and product images, then assign them to any product."
      cta={{ label: 'Upload media', hash: '#/media/new' }}
    />
  );
}
