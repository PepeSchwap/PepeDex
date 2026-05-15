// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useMemo } from 'react'
import styled, {
  ThemeProvider as StyledComponentsThemeProvider,
  createGlobalStyle,
  css,
  DefaultTheme
} from 'styled-components'
import { useIsDarkMode } from '../state/user/hooks'
import { Text, TextProps } from 'rebass'
import { Colors } from './styled'
import pepeBackgroundGif from '../assets/images/pepsbacker.gif'

export * from './components'

const MEDIA_WIDTHS = {
  upToExtraSmall: 500,
  upToSmall: 600,
  upToMedium: 960,
  upToLarge: 1280
}

const mediaWidthTemplates: { [width in keyof typeof MEDIA_WIDTHS]: typeof css } = Object.keys(MEDIA_WIDTHS).reduce(
  (accumulator, size) => {
    ;(accumulator as any)[size] = (a: any, b: any, c: any) => css`
      @media (max-width: ${(MEDIA_WIDTHS as any)[size]}px) {
        ${css(a, b, c)}
      }
    `
    return accumulator
  },
  {}
) as any

const white = '#FFFFFF'
const black = '#000000'

export function colors(darkMode: boolean): Colors {
  return {
    // base
    white,
    black,

    // text
    text1: darkMode ? '#FFFFFF' : '#111111', // Darken light mode
    text2: darkMode ? '#C3C5CB' : '#4A4E57', // Darken light mode
    text3: darkMode ? '#6C7284' : '#777B87', // Darken light mode
    text4: darkMode ? '#565A69' : '#B3B6C1', // Darken light mode
    text5: darkMode ? '#2C2F36' : '#DADCE3', // Darken light mode

    // backgrounds / greys
    bg1: darkMode ? '#121416' : '#ECEEEF', // Darken light mode
    bg2: darkMode ? '#262B33' : '#E1E2E5', // Slightly lighter in dark mode for clearer borders
    bg3: darkMode ? '#353C48' : '#D4D5D8', // Slightly lighter in dark mode for better border contrast
    bg4: darkMode ? '#434B58' : '#BEC0C8', // Keep tonal steps aligned after bg3 adjustment
    bg5: darkMode ? '#4B4F5A' : '#70747F', // Darken light mode

    // specialty colors
    modalBG: darkMode ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,0.4)', // Darken light mode transparency
    advancedBG: darkMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)', // Darken light mode transparency

    // primary colors
    primary1: darkMode ? '#2E7D32' : '#2E7D32',
    primary2: darkMode ? '#81C784' : '#43A047',
    primary3: darkMode ? '#A5D6A7' : '#66BB6A',
    primary4: darkMode ? 'rgba(46, 125, 50, 0.45)' : '#A5D6A7',
    primary5: darkMode ? 'rgba(46, 125, 50, 0.35)' : '#C8E6C9',

    // color text
    primaryText1: darkMode ? '#9BE7A0' : '#1B5E20',

    // secondary colors
    secondary1: darkMode ? '#43A047' : '#2E7D32',
    secondary2: darkMode ? 'rgba(67, 160, 71, 0.22)' : '#B8D8BC',
    secondary3: darkMode ? 'rgba(67, 160, 71, 0.3)' : '#CFE7D2',

    // other colors
    red1: '#FF6871', // Unchanged
    red2: '#F82D3A', // Unchanged
    green1: '#27AE60', // Unchanged
    yellow1: '#FFE270', // Unchanged
    yellow2: '#F3841E' // Unchanged
  }
}

export function theme(darkMode: boolean): DefaultTheme {
  return {
    ...colors(darkMode),

    grids: {
      sm: 8,
      md: 12,
      lg: 24
    },

    //shadows
    shadow1: darkMode ? '#000' : '#2E7D32',

    // media queries
    mediaWidth: mediaWidthTemplates,

    // css snippets
    flexColumnNoWrap: css`
      display: flex;
      flex-flow: column nowrap;
    `,
    flexRowNoWrap: css`
      display: flex;
      flex-flow: row nowrap;
    `
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useIsDarkMode()

  const themeObject = useMemo(() => theme(darkMode), [darkMode])

  return <StyledComponentsThemeProvider theme={themeObject}>{children}</StyledComponentsThemeProvider>
}

const TextWrapper = styled(Text)<{ color: keyof Colors }>`
  color: ${({ color, theme }) => (theme as any)[color]};
`

export const TYPE = {
  main(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'text2'} {...props} />
  },
  link(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'primaryText1'} {...props} />
  },
  black(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'text1'} {...props} />
  },
  body(props: TextProps) {
    return <TextWrapper fontWeight={400} fontSize={16} color={'text1'} {...props} />
  },
  largeHeader(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={24} {...props} />
  },
  mediumHeader(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={20} {...props} />
  },
  subHeader(props: TextProps) {
    return <TextWrapper fontWeight={400} fontSize={14} {...props} />
  },
  blue(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'primaryText1'} {...props} />
  },
  yellow(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'yellow1'} {...props} />
  },
  darkGray(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'text3'} {...props} />
  },
  gray(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'bg3'} {...props} />
  },
  italic(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={12} fontStyle={'italic'} color={'text2'} {...props} />
  },
  error({ error, ...props }: { error: boolean } & TextProps) {
    return <TextWrapper fontWeight={500} color={error ? 'red1' : 'text2'} {...props} />
  }
}

export const FixedGlobalStyle = createGlobalStyle`
html, body, input, textarea, button, select, option {
  font-family: 'Londrina Solid', sans-serif !important;
  letter-spacing: 0.05em;
  font-display: fallback;
}

html,
body {

  
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  border-radius: 0 !important;
}

button {
  user-select: none;
}


html {
  font-size: .9em;
  font-variant: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}
`

export const ThemedGlobalStyle = createGlobalStyle`
html {

  color: ${({ theme }) => theme.text1};
  background-color: black;
}

body {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.bg1};
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: -2;
  background: radial-gradient(
    circle at center,
    ${({ theme }) => (theme.text1 === '#FFFFFF' ? 'rgba(16, 52, 20, 0.84)' : 'rgba(120, 138, 122, 0.62)')} 0%,
    ${({ theme }) => (theme.text1 === '#FFFFFF' ? 'rgba(8, 26, 10, 0.66)' : 'rgba(158, 170, 160, 0.44)')} 48%,
    rgba(0, 0, 0, 0) 86%
  );
}

body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: -1;
  background-image: url(${pepeBackgroundGif});
  background-position: right bottom;
  background-repeat: no-repeat;
  background-size: 50% auto;
}
`
