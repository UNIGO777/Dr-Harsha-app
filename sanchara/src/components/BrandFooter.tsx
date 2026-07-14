/**
 * Shared footer: "medically supervised" line + clinic name + Terms/Privacy links.
 * Two layouts so both auth screens stay on-brand and consistent:
 *   - "stacked" (phone-entry): micro label over the clinic name, links below.
 *   - "inline"  (otp): one muted "Medically supervised · <clinic>" line, links below.
 * Legal order (Terms → Privacy Policy) comes from LEGAL_LINKS so it can't drift.
 */
import * as WebBrowser from 'expo-web-browser';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BRAND, LEGAL_LINKS } from '@/lib/brand';

function LegalLinks() {
  return (
    <View className="mt-2 flex-row items-center justify-center">
      {LEGAL_LINKS.map((link, i) => (
        <Fragment key={link.label}>
          {i > 0 ? <Text className="px-2 text-micro">·</Text> : null}
          <Pressable onPress={() => WebBrowser.openBrowserAsync(link.href)} hitSlop={8}>
            <Text className="font-sans text-xs text-secondary">{link.label}</Text>
          </Pressable>
        </Fragment>
      ))}
    </View>
  );
}

export function BrandFooter({ variant = 'stacked' }: { variant?: 'stacked' | 'inline' }) {
  return (
    <View className="items-center">
      {variant === 'stacked' ? (
        <>
          <Text className="font-sans text-[11px] uppercase tracking-[2px] text-micro">
            Medically supervised
          </Text>
          <Text className="mt-1 text-center font-sans-semibold text-sm text-secondary">
            {BRAND.centre}
          </Text>
        </>
      ) : (
        <Text className="text-center font-sans text-xs text-micro">
          Medically supervised · {BRAND.centre}
        </Text>
      )}
      <LegalLinks />
    </View>
  );
}
