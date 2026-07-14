/**
 * Tappable body map for the pain-areas step. A stylised silhouette (SVG shapes)
 * with front/back hotspots the user taps to toggle. Selected region ids are the
 * source of truth (stored as painAreas[] on the backend). Coordinates are in a
 * 200×360 viewBox scaled to the container width.
 */
import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export interface BodyRegion {
  id: string;
  label: string;
  cx: number;
  cy: number;
}

const FRONT: BodyRegion[] = [
  { id: 'neck', label: 'Neck', cx: 100, cy: 62 },
  { id: 'left_shoulder', label: 'Left shoulder', cx: 72, cy: 78 },
  { id: 'right_shoulder', label: 'Right shoulder', cx: 128, cy: 78 },
  { id: 'chest', label: 'Chest', cx: 100, cy: 96 },
  { id: 'left_elbow', label: 'Left elbow', cx: 52, cy: 128 },
  { id: 'right_elbow', label: 'Right elbow', cx: 148, cy: 128 },
  { id: 'abdomen', label: 'Abdomen', cx: 100, cy: 138 },
  { id: 'left_wrist', label: 'Left wrist', cx: 48, cy: 168 },
  { id: 'right_wrist', label: 'Right wrist', cx: 152, cy: 168 },
  { id: 'left_hip', label: 'Left hip', cx: 84, cy: 176 },
  { id: 'right_hip', label: 'Right hip', cx: 116, cy: 176 },
  { id: 'left_knee', label: 'Left knee', cx: 86, cy: 250 },
  { id: 'right_knee', label: 'Right knee', cx: 114, cy: 250 },
  { id: 'left_ankle', label: 'Left ankle', cx: 86, cy: 320 },
  { id: 'right_ankle', label: 'Right ankle', cx: 114, cy: 320 },
];

const BACK: BodyRegion[] = [
  { id: 'neck', label: 'Neck', cx: 100, cy: 62 },
  { id: 'upper_back', label: 'Upper back', cx: 100, cy: 96 },
  { id: 'left_shoulder_blade', label: 'Left shoulder blade', cx: 80, cy: 92 },
  { id: 'right_shoulder_blade', label: 'Right shoulder blade', cx: 120, cy: 92 },
  { id: 'lower_back', label: 'Lower back', cx: 100, cy: 145 },
  { id: 'glutes', label: 'Glutes', cx: 100, cy: 182 },
  { id: 'left_hamstring', label: 'Left hamstring', cx: 86, cy: 225 },
  { id: 'right_hamstring', label: 'Right hamstring', cx: 114, cy: 225 },
  { id: 'left_calf', label: 'Left calf', cx: 86, cy: 290 },
  { id: 'right_calf', label: 'Right calf', cx: 114, cy: 290 },
];

const VIEW_W = 200;
const VIEW_H = 360;
const HOTSPOT_R = 12;

function Silhouette() {
  const fill = colors.surface;
  return (
    <>
      {/* head */}
      <Circle cx={100} cy={34} r={20} fill={fill} />
      {/* torso */}
      <Rect x={70} y={58} width={60} height={110} rx={26} fill={fill} />
      {/* arms */}
      <Rect x={44} y={68} width={18} height={108} rx={9} fill={fill} />
      <Rect x={138} y={68} width={18} height={108} rx={9} fill={fill} />
      {/* hips */}
      <Ellipse cx={100} cy={178} rx={34} ry={20} fill={fill} />
      {/* legs */}
      <Rect x={76} y={186} width={20} height={158} rx={10} fill={fill} />
      <Rect x={104} y={186} width={20} height={158} rx={10} fill={fill} />
    </>
  );
}

interface BodyMapProps {
  selected: string[];
  onToggle: (regionId: string) => void;
}

export function BodyMap({ selected, onToggle }: BodyMapProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const regions = side === 'front' ? FRONT : BACK;

  return (
    <View className="items-center">
      {/* Front / Back toggle */}
      <View className="mb-5 flex-row rounded-pill border border-border bg-input-fill p-1">
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

      <Svg width="100%" height={380} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Silhouette />
        {regions.map((r) => {
          const isSel = selected.includes(r.id);
          return (
            <Circle
              key={`${side}-${r.id}`}
              cx={r.cx}
              cy={r.cy}
              r={HOTSPOT_R}
              fill={isSel ? colors.accent : 'rgba(184,184,190,0.18)'}
              stroke={isSel ? colors.accent : colors.border}
              strokeWidth={1.5}
              onPress={() => onToggle(r.id)}
            />
          );
        })}
      </Svg>

      <Text className="mt-2 font-sans text-xs text-micro">
        {selected.length > 0
          ? `${selected.length} area${selected.length > 1 ? 's' : ''} selected`
          : 'Tap the areas that need attention'}
      </Text>
    </View>
  );
}
