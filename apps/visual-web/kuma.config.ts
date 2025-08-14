import { createTheme } from '@kuma-ui/core';

const theme = createTheme({
  colors: {
    dark: {
      '000': '#ffffff',
      100: '#e5e5e5',
      200: '#cacaca',
      300: '#b0b0b0',
      400: '#959595',
      500: '#7b7b7b',
      600: '#606060',
      700: '#464646',
      800: '#2b2b2b',
      900: '#111111',
      1000: '#000000',
    },
    brown: {
      100: '#f9ece1',
      200: '#f2dac2',
      300: '#ecc7a4',
      400: '#e6b586',
      500: '#E0A268',
      600: '#D99049',
      700: '#D37D2C',
      800: '#B46B25',
      900: '#96591F',
    },
    yellow: {
      100: '#FCF6DF',
      200: '#F9ECBF',
      300: '#F6E39F',
      400: '#F4DA7E',
      500: '#F1D05E',
      600: '#EEC73E',
      700: '#EBBE1E',
      800: '#D3A913',
      900: '#B38F10',
    },
    leaf: {
      100: '#E7F0EC',
      200: '#CFE1D9',
      300: '#B7D3C6',
      400: '#A0C4B3',
      500: '#88B5A0',
      600: '#70A68C',
      700: '#5C9479',
      800: '#4D7C66',
      900: '#3E6452',
    },
    cherry: {
      100: '#F3E4E6',
      200: '#E8CACD',
      300: '#DCAFB4',
      400: '#D0949C',
      500: '#C47983',
      600: '#B95F6A',
      700: '#A74955',
      800: '#8D3E48',
      900: '#72323A',
    },
  },
  breakpoints: {
    sm: '576px',
    md: '768px',
    lg: '1100px',
    xl: '1280px',
  },
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
});

type UserTheme = typeof theme;

declare module '@kuma-ui/core' {
  export interface Theme extends UserTheme {}
}

export default theme;
