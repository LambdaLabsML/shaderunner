import { defineConfig } from "plasmo";
import sassDts from "vite-plugin-sass-dts";

export default defineConfig({
  vite: {
    plugins: [sassDts()]
  }
});