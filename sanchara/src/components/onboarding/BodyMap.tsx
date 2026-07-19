/**
 * Tappable body map for the pain-areas step. A stylised silhouette with front
 * and back hotspots covering the full pain-region list. Each hotspot toggles a
 * region id; the screen maps ids -> labels (see REGION_LABELS) for display and
 * for the backend painAreas[]. Coordinates are in a 200×380 viewBox.
 *
 * Note: "Right/Left" are the person's own sides (anatomical) — the person's
 * right is on the viewer's left in the front view.
 */
import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

interface Hotspot {
  id: string;
  label: string;
  cx: number;
  cy: number;
}

const FRONT: Hotspot[] = [
  { id: 'head', label: 'Head', cx: 100, cy: 30 },
  { id: 'neck', label: 'Neck', cx: 100, cy: 52 },
  { id: 'right_shoulder', label: 'Right shoulder', cx: 72, cy: 72 },
  { id: 'left_shoulder', label: 'Left shoulder', cx: 128, cy: 72 },
  { id: 'right_elbow', label: 'Right elbow', cx: 52, cy: 116 },
  { id: 'left_elbow', label: 'Left elbow', cx: 148, cy: 116 },
  { id: 'right_wrist', label: 'Right wrist', cx: 47, cy: 150 },
  { id: 'left_wrist', label: 'Left wrist', cx: 153, cy: 150 },
  { id: 'right_hand', label: 'Right hand', cx: 45, cy: 170 },
  { id: 'left_hand', label: 'Left hand', cx: 155, cy: 170 },
  { id: 'pelvis', label: 'Pelvis', cx: 100, cy: 160 },
  { id: 'right_hip', label: 'Right hip', cx: 84, cy: 150 },
  { id: 'left_hip', label: 'Left hip', cx: 116, cy: 150 },
  { id: 'right_knee', label: 'Right knee', cx: 86, cy: 242 },
  { id: 'left_knee', label: 'Left knee', cx: 114, cy: 242 },
  { id: 'right_ankle', label: 'Right ankle', cx: 86, cy: 322 },
  { id: 'left_ankle', label: 'Left ankle', cx: 114, cy: 322 },
  { id: 'right_foot', label: 'Right sole / Foot', cx: 86, cy: 348 },
  { id: 'left_foot', label: 'Left sole / Foot', cx: 114, cy: 348 },
];

const BACK: Hotspot[] = [
  { id: 'upper_back', label: 'Upper back / Thoracic', cx: 100, cy: 92 },
  { id: 'lower_back', label: 'Lower back', cx: 100, cy: 140 },
  { id: 'right_calf', label: 'Right calf', cx: 86, cy: 292 },
  { id: 'left_calf', label: 'Left calf', cx: 114, cy: 292 },
];

/** id -> label for every anatomical region (front + back). */
export const REGION_LABELS: Record<string, string> = Object.fromEntries(
  [...FRONT, ...BACK].map((h) => [h.id, h.label]),
);

const VIEW_W = 200;
const VIEW_H = 380;
const DOT_R = 9;

function Silhouette() {
  const fill = colors.surface;
  return (
    <>
      <Circle cx={100} cy={30} r={18} fill={fill} />
      <Rect x={72} y={50} width={56} height={100} rx={22} fill={fill} />
      <Rect x={48} y={60} width={15} height={100} rx={7} fill={fill} />
      <Rect x={137} y={60} width={15} height={100} rx={7} fill={fill} />
      <Ellipse cx={100} cy={158} rx={30} ry={17} fill={fill} />
      <Rect x={78} y={172} width={18} height={182} rx={9} fill={fill} />
      <Rect x={104} y={172} width={18} height={182} rx={9} fill={fill} />
    </>
  );
}

interface BodyMapProps {
  selected: string[];
  onToggle: (regionId: string) => void;
}

export function BodyMap({ selected, onToggle }: BodyMapProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const hotspots = side === 'front' ? FRONT : BACK;

  return (
    <View className="items-center">
      {/* Front / Back toggle */}
      <View className="mb-4 flex-row rounded-pill border border-border bg-input-fill p-1">
        {(['front', 'back'] as const).map((s) => {
          const active = side === s;
          return (
            <Text
              key={s}
              onPress={() => setSide(s)}
              style={{ color: active ? colors.accentText : colors.textSecondary }}
              className={`rounded-pill px-7 py-2 font-sans-medium text-sm ${active ? 'bg-accent' : ''}`}
            >
              {s === 'front' ? 'Front' : 'Back'}
            </Text>
          );
        })}
      </View>

      <Svg width="100%" height={360} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Silhouette />
        {hotspots.map((h) => {
          const isSel = selected.includes(h.id);
          return (
            <Circle
              key={`${side}-${h.id}`}
              cx={h.cx}
              cy={h.cy}
              r={DOT_R}
              fill={isSel ? colors.accent : 'rgba(184,184,190,0.22)'}
              stroke={isSel ? colors.accent : colors.border}
              strokeWidth={1.5}
              onPress={() => onToggle(h.id)}
            />
          );
        })}
      </Svg>

      <Text className="mt-1 font-sans text-xs text-micro">
        Tap the areas that need attention · {side === 'front' ? 'Front view' : 'Back view'}
      </Text>
    </View>
  );
}
