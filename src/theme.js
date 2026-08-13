import { extendTheme } from "@chakra-ui/react";
import { C } from "./theme/palette.js";

export const theme = extendTheme({
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  styles: {
    global: {
      body: {
        bg: C.bg,
        color: C.text,
        lineHeight: "tall",
      },
    },
  },
  components: {
    Button: {
      baseStyle: { fontWeight: 700, borderRadius: "lg" },
    },
    Input: {
      defaultProps: { focusBorderColor: C.borderFocus },
      baseStyle: { field: { borderRadius: "lg" } },
    },
    Select: {
      baseStyle: { field: { borderRadius: "lg" } },
    },
    Modal: {
      baseStyle: {
        dialog: { borderRadius: "xl" },
      },
    },
  },
});
