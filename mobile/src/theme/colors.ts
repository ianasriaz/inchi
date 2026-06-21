export const colors = {
  primary: '#00e482', // The main green color
  primaryLight: '#E8FDF3', // Light green used for active backgrounds
  primaryDark: '#00c770', // Darker green for pressed states
  text: '#161D26', // Charcoal black for main text
  textOpacity: (opacity: number) => `rgba(22, 29, 38, ${opacity})`,
  background: '#FFFFFF', // Main white background
  surface: '#F7F8FA', // Light gray for cards and inputs
  border: '#F0F0F0', // Very light gray for borders
  borderDark: '#E0E0E0',
  error: '#FF3B30', // Red for errors or destructive actions
  errorLight: '#FFE5E5',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent'
};
