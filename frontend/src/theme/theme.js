import { createTheme } from '@mui/material/styles';

// Design tokens from docs/specs/DESIGN_GUIDELINES.md — OKLCH palette, "Arbor Studio"
// visual language. Exported standalone (not just via theme.palette) because several
// components need exact tokens MUI's palette shape doesn't have slots for (chip
// active/inactive states, debug panel, stock-status colors, striped placeholders).
export const tokens = {
  bg: 'oklch(97% 0.012 85)',
  surface: 'oklch(99% 0.005 85)',
  surfaceMuted: 'oklch(96% 0.005 85)',
  border: 'oklch(91% 0.01 85)',
  borderStrong: 'oklch(88% 0.01 85)',
  borderChip: 'oklch(87% 0.01 85)',
  ink: 'oklch(18% 0.01 85)',
  inkSecondary: 'oklch(32% 0.01 85)',
  muted: 'oklch(50% 0.015 85)',
  mutedStrong: 'oklch(45% 0.015 85)',
  accent: 'oklch(58% 0.11 55)',
  accentHover: 'oklch(50% 0.11 55)',
  accentBg: 'oklch(58% 0.11 55 / 0.12)',
  accentFg: 'oklch(40% 0.11 55)',
  successBg: 'oklch(94% 0.06 145)',
  successBorder: 'oklch(80% 0.1 145)',
  successText: 'oklch(28% 0.08 145)',
  successLabel: 'oklch(40% 0.09 145)',
  danger: 'oklch(55% 0.15 25)',
  dangerBg: 'oklch(96% 0.03 25)',
  debugBg: 'oklch(16% 0.01 85)',
  debugHeaderBorder: 'oklch(28% 0.01 85)',
  debugText: 'oklch(88% 0.03 145)',
  debugLabel: 'oklch(85% 0.01 85)',
  debugMuted: 'oklch(70% 0.01 85)',
  placeholderA: 'oklch(93% 0.015 85)',
  placeholderB: 'oklch(95% 0.012 85)',
};

const serif = '"Playfair Display", serif';
const sans = '"Work Sans", sans-serif';

// MUI's internal color math (alpha(), decomposeColor(), getContrastText() — used e.g.
// by Alert's severity backgrounds, ripple/hover overlays, Chip variants) only parses
// #/rgb()/hsl()/color(), not oklch() — feeding it oklch() strings throws at runtime.
// So `palette.*` must use these sRGB hex equivalents of the tokens above; everywhere
// else (component `sx`, styleOverrides literals) keeps using `tokens` oklch strings
// directly as static CSS, which browsers render natively and MUI never touches.
const paletteHex = {
  bg: '#F9F5EC',
  surface: '#FDFCF8',
  ink: '#14110D',
  inkSecondary: '#35332D',
  muted: '#67635A',
  accent: '#AC6734',
  accentHover: '#925019',
  accentFg: '#733300',
  successBg: '#D3F7D3',
  successText: '#06320C',
  successLabel: '#245427',
  danger: '#B94642',
  dangerBg: '#FFEBE8',
  border: '#E4E1DA',
};

const theme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 768, md: 1024, lg: 1440, xl: 1920 },
  },
  palette: {
    mode: 'light',
    primary: {
      main: paletteHex.ink,
      dark: paletteHex.ink,
      light: paletteHex.inkSecondary,
      contrastText: paletteHex.surface,
    },
    secondary: {
      main: paletteHex.accent,
      dark: paletteHex.accentFg,
      light: paletteHex.accentHover,
      contrastText: paletteHex.surface,
    },
    error: {
      main: paletteHex.danger,
      light: paletteHex.dangerBg,
      contrastText: '#fff',
    },
    success: {
      main: paletteHex.successLabel,
      light: paletteHex.successBg,
      dark: paletteHex.successText,
      contrastText: paletteHex.successText,
    },
    background: {
      default: paletteHex.bg,
      paper: paletteHex.surface,
    },
    text: {
      primary: paletteHex.ink,
      secondary: paletteHex.muted,
    },
    divider: paletteHex.border,
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: sans,
    h1: { fontFamily: serif, fontSize: 34, fontWeight: 600, lineHeight: 1.2, color: tokens.ink },
    h2: { fontFamily: serif, fontSize: 30, fontWeight: 600, lineHeight: 1.25, color: tokens.ink },
    h3: { fontFamily: serif, fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: tokens.ink },
    h4: { fontFamily: serif, fontSize: 28, fontWeight: 600, lineHeight: 1.3, color: tokens.ink },
    h5: { fontFamily: serif, fontSize: 17, fontWeight: 600, lineHeight: 1.3, color: tokens.ink },
    h6: { fontFamily: sans, fontSize: 15, fontWeight: 600, color: tokens.ink },
    subtitle1: { fontFamily: sans, fontSize: 16, fontWeight: 600, color: tokens.ink },
    subtitle2: { fontFamily: sans, fontSize: 13, fontWeight: 500, color: tokens.inkSecondary },
    body1: { fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: tokens.inkSecondary },
    body2: { fontFamily: sans, fontSize: 14, color: tokens.inkSecondary },
    caption: { fontFamily: sans, fontSize: 12, color: tokens.muted },
    overline: {
      fontFamily: sans,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: tokens.muted,
      lineHeight: 1.6,
    },
    button: { fontFamily: sans, fontSize: 14, fontWeight: 500, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.bg, color: tokens.ink },
        a: { color: tokens.accent, textDecoration: 'none' },
        'a:hover': { color: tokens.accentHover },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-thumb': { background: tokens.borderStrong, borderRadius: 6 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: `color-mix(in oklch, ${tokens.surface} 92%, transparent)`,
          backdropFilter: 'blur(10px)',
          color: tokens.ink,
          borderBottom: `1px solid ${tokens.border}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '13px 26px',
          fontSize: 14,
          fontWeight: 500,
        },
        containedPrimary: {
          backgroundColor: tokens.ink,
          color: tokens.surface,
          boxShadow: 'none',
          '&:hover': { backgroundColor: tokens.inkSecondary, boxShadow: 'none' },
          '&.Mui-disabled': { backgroundColor: tokens.borderStrong, color: tokens.muted },
        },
        outlined: {
          backgroundColor: 'transparent',
          color: tokens.inkSecondary,
          borderColor: tokens.borderStrong,
          '&:hover': { borderColor: tokens.ink, backgroundColor: tokens.surfaceMuted },
        },
        text: {
          color: tokens.inkSecondary,
        },
        sizeSmall: {
          padding: '7px 14px',
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 500,
          fontSize: 13,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${tokens.border}`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: tokens.surface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.borderStrong },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.accent, borderWidth: 1 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: 13, fontWeight: 500, color: tokens.inkSecondary },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: tokens.borderStrong,
          '&.Mui-checked': { color: tokens.accent },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: tokens.border, fontSize: 14 },
        head: { fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: tokens.muted, fontWeight: 500 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});

export default theme;
