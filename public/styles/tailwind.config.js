module.exports = {
  theme: {
    screens: {
      xs: "475px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-top": "env(safe-area-inset-top)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      animation: {
        "spin-dots": "dots 1s steps(12, end) infinite",
        rain: "rain 1s linear infinite",
        wind: "wind 1s linear infinite",
        fog: "fog 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        dots: {
          "0%": { content: '"⠋"' },
          "8.3%": { content: '"⠙"' },
          "16.6%": { content: '"⠹"' },
          "25%": { content: '"⠸"' },
          "33.3%": { content: '"⠼"' },
          "41.6%": { content: '"⠴"' },
          "50%": { content: '"⠦"' },
          "58.3%": { content: '"⠧"' },
          "66.6%": { content: '"⠇"' },
          "75%": { content: '"⠏"' },
          "83.3%": { content: '"⠋"' },
          "91.6%": { content: '"⠙"' },
          "100%": { content: '"⠹"' },
        },
        rain: {
          "0%": { opacity: "0", transform: "translateY(-100%)" },
          "100%": { opacity: "1", transform: "translateY(100%)" },
        },
        wind: {
          "0%": { opacity: "0", transform: "translateX(-100%)" },
          "100%": { opacity: "1", transform: "translateX(100%)" },
        },
        fog: {
          "0%": { opacity: "0" },
          "50%": { opacity: "0.5" },
          "100%": { opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
};
