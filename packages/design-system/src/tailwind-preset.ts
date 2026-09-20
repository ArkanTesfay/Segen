import { colors, radii, shadows, fonts } from './tokens';

/** Tailwind v3 preset restricted to silk black / white / red */
export const segenTailwindPreset = {
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: colors.silk.black,
          surface: colors.silk.surface,
          elevated: colors.silk.elevated,
        },
        silk: {
          DEFAULT: colors.silk.white,
          muted: colors.silk.muted,
          faint: colors.silk.faint,
        },
        segen: {
          DEFAULT: colors.red.DEFAULT,
          hover: colors.red.hover,
          glow: colors.red.glow,
        },
      },
      borderRadius: radii,
      boxShadow: shadows,
      fontFamily: {
        sans: [fonts.sans],
        display: [fonts.display],
      },
    },
  },
} as const;
