/**
 * VideoStage — the exercise video itself.
 *
 * Mounted with a `key` of the exercise id by the player, so each exercise gets a
 * FRESH player rather than the parent juggling `replaceAsync` and stale
 * playback state. `useVideoPlayer` then always receives a concrete source, and
 * the hook releases the old player on unmount.
 *
 * `playToEnd` is the natural cue that the set is finished, so it surfaces the
 * rating step without the patient having to reach for the phone.
 */
import { useEvent, useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Pause, Play, RotateCcw } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { onImage } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface VideoStageProps {
  uri: string;
  /** Fired when the clip reaches its end. */
  onPlayToEnd: () => void;
}

export function VideoStage({ uri, onPlayToEnd }: VideoStageProps) {
  const colors = useThemeColors();

  const player = useVideoPlayer(uri, (p) => {
    // Physio clips are short and demonstrative — looping lets the patient keep
    // watching the form while they work through their own reps.
    p.loop = true;
    p.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  useEventListener(player, 'playToEnd', onPlayToEnd);

  return (
    <View className="w-full flex-1 overflow-hidden rounded-card" style={{ backgroundColor: '#000' }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="contain"
        nativeControls={false}
        allowsPictureInPicture={false}
      />

      {/* Custom transport: the native controls' scrubber invites seeking around
          a demo clip, which isn't what we want mid-exercise. */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-3 px-4 py-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
          onPress={() => (isPlaying ? player.pause() : player.play())}
          className="h-12 w-12 items-center justify-center rounded-pill active:opacity-80"
          style={{ backgroundColor: colors.accent }}
        >
          {isPlaying ? (
            <Pause color={colors.accentText} size={20} fill={colors.accentText} />
          ) : (
            <Play color={colors.accentText} size={20} fill={colors.accentText} />
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restart video"
          onPress={() => player.replay()}
          className="h-12 w-12 items-center justify-center rounded-pill active:opacity-80"
          style={{ backgroundColor: onImage.chipFill }}
        >
          <RotateCcw color={onImage.textPrimary} size={18} />
        </Pressable>

        <Text
          className="ml-auto font-sans-semibold text-[11px]"
          style={{ color: onImage.textSecondary, letterSpacing: 1.2 }}
        >
          LOOPING
        </Text>
      </View>
    </View>
  );
}
