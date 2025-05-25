module.exports = {
  theme: {
    extend: {
      animation: {
        "spin-dots": "dots 1s steps(12, end) infinite",
        rain: "rain 1s linear infinite",
        wind: "wind 1s linear infinite",
        fog: "fog 2s ease-in-out infinite",
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
      },
    },
  },
};
