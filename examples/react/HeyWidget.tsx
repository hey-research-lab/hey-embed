// React (Vite, CRA, Remix…): npm i @hey-research-lab/embed
import { HeyProject } from '@hey-research-lab/embed/react';

export function BuilderEvidence({ slug }: { slug: string }) {
  return (
    <section>
      <h2>What this project has shipped</h2>
      {/* Renders <hey-project>, which draws one sandboxed frame served by heyresearch.xyz. */}
      <HeyProject project={slug} variant="builder" theme="auto" />
    </section>
  );
}

export function TokenEvidence({ contract }: { contract: string }) {
  // A Robinhood Chain contract, 0x… or 4663:0x…. Any other chain is refused (unsupported_chain),
  // and the fallback link is shown instead.
  return <HeyProject contract={contract} variant="compact" theme="dark" height={92} />;
}
