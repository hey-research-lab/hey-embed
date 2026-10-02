// Next.js App Router. The wrapper is marked as a client component, so a server component can
// render it directly: the server sends <hey-project> with its fallback link, and the browser
// registers the element after hydration. No provider call, no data fetching on your side.
import { HeyProject } from '@hey-research-lab/embed/react';

export default function Page() {
  return (
    <main>
      <h1>Builders on Robinhood Chain we follow</h1>
      <HeyProject project="hoodlock" variant="changes" />
      <HeyProject project="agentos" variant="full" theme="light" />
    </main>
  );
}
