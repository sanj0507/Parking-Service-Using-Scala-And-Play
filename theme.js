import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  fonts: {
    heading: "'Syne', sans-serif",
    body: "'Syne', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  styles: {
    global: {
      body: {
        bg: "#f5f6fa",
        color: "#111827",
      },
    },
  },
  components: {
    Button: {
      baseStyle: { fontWeight: 700, borderRadius: "10px" },
    },
    Input: {
      defaultProps: { focusBorderColor: "#c8ccd8" },
    },
  },
});