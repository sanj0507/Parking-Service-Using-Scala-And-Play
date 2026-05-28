import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  fonts: {
    heading: "Space Grotesk, Inter, ui-sans-serif, system-ui, sans-serif",
    body: "Inter, ui-sans-serif, system-ui, sans-serif"
  },
  styles: {
    global: {
      body: {
        bg: "#f3efe8",
        color: "gray.900"
      }
    }
  },
  radii: {
    xl: "16px",
    "2xl": "22px"
  },
  colors: {
    slateInk: {
      950: "#0f172a",
      900: "#111c2e",
      700: "#334155"
    },
    asphalt: {
      900: "#1f2937"
    },
    ocean: {
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#1d4ed8"
    },
    mint: {
      300: "#6ee7d8",
      400: "#2dd4bf",
      500: "#14b8a6"
    },
    amber: {
      300: "#fcd34d",
      400: "#f59e0b"
    },
    ember: {
      400: "#fb7185"
    }
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 700,
        borderRadius: "12px"
      },
      defaultProps: {
        colorScheme: "blue"
      }
    },
    Input: {
      defaultProps: {
        focusBorderColor: "ocean.500"
      }
    },
    Select: {
      defaultProps: {
        focusBorderColor: "ocean.500"
      }
    }
  }
});
