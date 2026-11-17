import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // หน้าส่วนใหญ่โหลดข้อมูลจาก Supabase ใน useEffect แล้ว setState เมื่อได้ผล
      // ซึ่งเป็นรูปแบบปกติ — ให้เป็นคำเตือนแทน error เพื่อไม่บล็อก build
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
