export function createMatchTransitionController({ app, show, hide, onError }) {
  let current = null;
  return {
    cancel() {
      current?.abort(); current = null;
      app.building = false; hide();
    },
    async prepare(build) {
      current?.abort();
      const controller = new AbortController();
      current = controller; app.building = true;
      app.session?.input.cancel();
      show();
      try {
        const stage = await build(controller.signal);
        if (controller.signal.aborted || current !== controller) { stage.dispose(); return null; }
        return stage;
      } catch (error) {
        if (error.name !== 'AbortError' && current === controller) onError(error);
        return null;
      } finally {
        if (current === controller) { current = null; app.building = false; hide(); }
      }
    },
  };
}
