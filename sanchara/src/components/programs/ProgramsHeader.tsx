/**
 * Header for the program list + detail screens.
 *
 * Thin wrapper over the shared ScreenHeader so the programs and profile
 * sections can't drift apart visually; kept as its own component because both
 * program screens default to the same title.
 */
import { ScreenHeader } from '@/components/ui';

export function ProgramsHeader({ title = 'Programs', onBack }: { title?: string; onBack?: () => void }) {
  return <ScreenHeader title={title} onBack={onBack} />;
}
