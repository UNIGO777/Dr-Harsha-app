/**
 * LevelSegments — the slim bar under the ring. One segment per level in the
 * program: completed levels are solid mint, the current level is part-filled
 * with a node marking where you are, locked levels stay dim.
 *
 * Gives the whole Program → Level journey in a single glance.
 */
import { View } from 'react-native';

import { useThemeColors } from '@/theme/useTheme';

interface LevelSegmentsProps {
  totalLevels: number;
  currentLevel: number;
  /** 0–1 progress through the current level. */
  currentProgress: number;
}

export function LevelSegments({
  totalLevels,
  currentLevel,
  currentProgress,
}: LevelSegmentsProps) {
  const colors = useThemeColors();
  return (
    <View
      className="w-full flex-row items-center"
      accessibilityRole="progressbar"
      accessibilityLabel={`Level ${currentLevel} of ${totalLevels}`}
    >
      {Array.from({ length: totalLevels }, (_, i) => {
        const levelNumber = i + 1;
        const isDone = levelNumber < currentLevel;
        const isCurrent = levelNumber === currentLevel;

        return (
          <View
            key={levelNumber}
            className="h-[5px] flex-1 justify-center rounded-pill"
            style={{
              backgroundColor: isDone ? colors.accent : colors.border,
              marginRight: levelNumber === totalLevels ? 0 : 8,
            }}
          >
            {isCurrent ? (
              <>
                <View
                  className="h-[5px] rounded-pill"
                  style={{
                    width: `${Math.max(6, Math.min(100, currentProgress * 100))}%`,
                    backgroundColor: colors.accent,
                  }}
                />
                {/* Position node — "you are here" */}
                <View
                  className="absolute h-3.5 w-3.5 rounded-pill border-2"
                  style={{
                    left: `${Math.max(0, Math.min(94, currentProgress * 100 - 3))}%`,
                    backgroundColor: colors.accent,
                    borderColor: colors.base,
                  }}
                />
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
