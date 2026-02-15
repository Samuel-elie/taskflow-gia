/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gia: {
          navy: "#0B274E",
          navy2: "#203881",
          cyan: "#0AACF3",
          bg: "#F3F6F9",
          bg2: "#EBF5FB",
          text: "#0A1E3A",
          orange: "#F59E0B",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(11, 39, 78, 0.10)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};
