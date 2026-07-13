/**
 * Raised surface container with the standard 20px radius. The base building block
 * for content panels on the dark background.
 */
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <View className={`rounded-card border border-border bg-surface p-5 ${className}`} {...rest}>
      {children}
    </View>
  );
}
