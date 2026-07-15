// @leafygreen-ui/emotion unconditionally imports @emotion/server/create-instance for
// SSR helpers (extractCritical/renderStylesToString/renderStylesToNodeStream) that this
// client-only Vite SPA never calls. @emotion/server pulls in Node-only deps (html-tokenize,
// buffer-from) that reference the `Buffer` global and crash in the browser, so this stub is
// aliased in vite.config.js in its place.
export default function createEmotionServer() {
  return {
    extractCritical: () => ({ html: '', css: '', ids: [] }),
    renderStylesToString: (html) => html,
    renderStylesToNodeStream: () => {
      throw new Error('renderStylesToNodeStream is not supported in the browser');
    },
  };
}
