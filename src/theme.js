import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  fonts: {
    heading: "'DM Mono', 'Courier New', monospace",
    body: "'DM Mono', 'Courier New', monospace"
  },
  styles: {
    global: {
      "@import": "url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap')",
      body: {
        bg: "#f8f7f4",
        color: "gray.900"
      }
    }
  },
  radii: {
    lg: "10px",
    xl: "14px",
    "2xl": "18px"
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 700,
        borderRadius: "10px",
        letterSpacing: "0.05em"
      }
    },
    Input: {
      defaultProps: {
        focusBorderColor: "gray.400"
      },
      variants: {
        outline: {
          field: {
            borderRadius: "10px",
            _focus: { boxShadow: "none" }
          }
        }
      }
    }
  }
});