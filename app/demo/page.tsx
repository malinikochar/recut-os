import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import {
  DemoInteractiveClient,
  type DemoPreset,
} from '@/components/optimizer/demo-interactive-client';
import { evaluateOptimization, parseWorkshopFixture } from '@/lib/optimizer';

export const metadata: Metadata = {
  title: 'Interactive Public Demo',
  description:
    'Run the deterministic ReCut OS 2D guillotine cutting optimizer and baseline comparison without signing in.',
};

export default function PublicDemoPage() {
  const root = process.cwd();
  const primaryRaw = JSON.parse(
    readFileSync(path.join(root, 'fixtures/sample-workshop.json'), 'utf8')
  );
  const suiteRaw = JSON.parse(
    readFileSync(path.join(root, 'fixtures/benchmark-suite.json'), 'utf8')
  ) as unknown[];

  const presets: DemoPreset[] = [primaryRaw, ...suiteRaw].map((item) =>
    parseWorkshopFixture(item)
  );

  const initialEvaluation = evaluateOptimization(presets[0]!.problem);

  return (
    <DemoInteractiveClient
      presets={presets}
      initialEvaluation={initialEvaluation}
    />
  );
}
