/**
 * VideoStage — the demonstration clip, and nothing else.
 *
 * Mounted with a `key` of the exercise id by the player, so each exercise gets a
 * FRESH player rather than the parent juggling `replaceAsync` and stale playback
 * state. `useVideoPlayer` then always receives a concrete source, and the hook
 * releases the old player on unmount.
 *
 * Two rules this component exists to enforce:
 *
 *  - `contentFit="contain"`, always. The clip's only job is to answer "am I
 *    doing this right?", and a patient cannot check her spine, neck and hip
 *    alignment against a body that has been cropped at the head. Letterbox
 *    instead — black bars are a smaller cost than an invisible neck.
 *  - No chrome. The old build painted its own play/pause/replay row over the
 *    bottom of the frame, which put controls at the top of the screen once the
 *    video moved up. Transport now lives with the rest of the controls in the
 *    thumb zone, and playback is driven from the parent via `paused`.
 */
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { View } from 'react-native';

interface VideoStageProps {
  uri: string;
  /** Parent-owned transport — the Pause control lives in the thumb zone. */
  paused?: boolean;
  /** Fired when the clip reaches its end. Only useful when `loop` is false. */
  onPlayToEnd?: () => void;
}

export function VideoStage({ uri, paused = false, onPlayToEnd }: VideoStageProps) {
  const player = useVideoPlayer(uri, (p) => {
    // Physio clips are short and demonstrative — looping lets the patient keep
    // checking her form for as long as she is working through her own reps.
    p.loop = true;
    p.muted = true; // no soundtrack, and no surprise audio at 6:40am
    p.play();
  });

  useEventListener(player, 'playToEnd', () => onPlayToEnd?.());

  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);

  return (
    <View className="h-full w-full" style={{ backgroundColor: '#000' }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="contain"
        nativeControls={false}
        allowsPictureInPicture={false}
        accessibilityLabel="Exercise demonstration"
      />
    </View>
  );
}
