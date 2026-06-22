import React, { useMemo } from 'react';
import { Text, TextProps, StyleSheet, Platform } from 'react-native';

// Regex to capture blocks of Arabic/Urdu characters
const URDU_PATTERN = '[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+';
const URDU_REGEX_SPLIT = new RegExp(`(${URDU_PATTERN})`, 'g');
const URDU_REGEX_TEST = new RegExp(`^${URDU_PATTERN}$`);

interface AppTextProps extends TextProps {
  children: React.ReactNode;
}

export default function AppText({ children, style, ...props }: AppTextProps) {
  const parsedContent = useMemo(() => {
    // Only parse if children is a plain string.
    if (typeof children !== 'string') {
      return children;
    }

    const flatStyle = StyleSheet.flatten(style) || {};
    const baseFontSize = flatStyle.fontSize || 14;
    
    // Determine if we should use the bold variant
    const isBold = 
      flatStyle.fontWeight === 'bold' || 
      ['700', '800', '900'].includes(String(flatStyle.fontWeight)) ||
      (flatStyle.fontFamily && flatStyle.fontFamily.includes('Bold'));
      
    const urduFontFamily = isBold ? 'NotoNastaliqUrduBold' : 'NotoNastaliqUrdu';

    // Scale Nastaliq font slightly so its perceived height matches English fonts
    const urduFontSize = baseFontSize * 1.1; 

    // Split string keeping the delimiters (Urdu text) in the array
    const parts = children.split(URDU_REGEX_SPLIT);
    let containsUrdu = false;

    const elements = parts.map((part, index) => {
      if (!part) return null;

      if (URDU_REGEX_TEST.test(part)) {
        containsUrdu = true;
        return (
          <Text
            key={index}
            style={{
              fontFamily: urduFontFamily,
              fontWeight: 'normal',
              fontSize: urduFontSize,
              // Explicitly NOT setting includeFontPadding: false so Android uses the font's native generous bounding box
              ...Platform.select({
                ios: { top: 2 },
                android: { marginTop: 2 }
              })
            }}
          >
            {part}
          </Text>
        );
      }

      return <Text key={index}>{part}</Text>;
    });

    return { elements, containsUrdu, baseFontSize };
  }, [children, style]);

  if (typeof children !== 'string') {
    return <Text style={style} {...props}>{children}</Text>;
  }

  const { elements, containsUrdu, baseFontSize } = parsedContent as any;

  return (
    <Text 
      style={[
        style, 
        containsUrdu && { 
          // Do not restrict lineHeight as it causes cropping in Nastaliq
          overflow: 'visible'
        }
      ]} 
      {...props}
    >
      {elements}
    </Text>
  );
}
