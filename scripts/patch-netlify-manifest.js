// Remove /_middleware from functions-config-manifest.json so that
// @netlify/plugin-nextjs does not try to bundle it as an edge function.
// Next.js 16 Proxy defaults to Node.js runtime, which the plugin's Deno
// edge bundler cannot handle yet. Auth is handled by netlify/edge-functions/auth.ts.
const fs = require('fs')
const path = require('path')

const manifestPath = path.join(__dirname, '..', '.next', 'server', 'functions-config-manifest.json')

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (manifest.functions?.['/_middleware']) {
    delete manifest.functions['/_middleware']
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log('[patch-netlify-manifest] Removed /_middleware — auth handled by Netlify edge function')
  } else {
    console.log('[patch-netlify-manifest] No /_middleware entry found, nothing to patch')
  }
} catch (err) {
  console.error('[patch-netlify-manifest] Failed:', err.message)
  process.exit(1)
}
