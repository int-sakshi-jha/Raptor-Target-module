import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const SW_DIR = "public/firebase-messaging-sw";
const SW_OUTPUT = "public/firebase-messaging-sw.js";

function firebaseMessagingServiceWorkerPlugin(): Plugin {
  return {
    name: "firebase-messaging-sw",
    configResolved(config) {
      const root = config.root ?? process.cwd();
      const env = loadEnv(config.mode, root, "");
      const outPath = path.join(root, SW_OUTPUT);
      const noopSource = path.join(root, SW_DIR, "noop.js");
      const fcmTemplatePath = path.join(root, SW_DIR, "fcm.template.js");

      fs.mkdirSync(path.dirname(outPath), { recursive: true });

      if (!env.VITE_FIREBASE_API_KEY) {
        const noop = fs.readFileSync(noopSource, "utf8");
        fs.writeFileSync(outPath, noop, "utf8");
        return;
      }

      let version = "12.12.0";
      try {
        const pkgPath = path.join(root, "node_modules/firebase/package.json");
        const raw = fs.readFileSync(pkgPath, "utf8");
        const ver = JSON.parse(raw).version as string;
        version = ver.split("-")[0] ?? version;
      } catch {
        /* keep default */
      }

      const cfg: Record<string, string> = {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
      };
      if (env.VITE_FIREBASE_MEASUREMENT_ID) {
        cfg.measurementId = env.VITE_FIREBASE_MEASUREMENT_ID;
      }

      let template = fs.readFileSync(fcmTemplatePath, "utf8");
      template = template
        .replaceAll("__FIREBASE_JS_VERSION__", version)
        .replace("__FIREBASE_CONFIG__", JSON.stringify(cfg));
      fs.writeFileSync(outPath, template, "utf8");
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    "process.env": {},
    // react-draggable / react-grid-layout reference process.env in the browser bundle
    "process.env.NODE_ENV": JSON.stringify(mode),
    "process.env.DRAGGABLE_DEBUG": JSON.stringify(""),
  },
  plugins: [react(), firebaseMessagingServiceWorkerPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://192.168.2.95:5000",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: {
          "192.168.2.95": "localhost",
        },
        cookiePathRewrite: {
          "/": "/",
        },
      },
    },    
  },
}));
