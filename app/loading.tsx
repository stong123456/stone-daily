export default function RouteLoading() {
  return (
    <section aria-label="页面正在切换" aria-live="polite" className="route-loading">
      <div className="route-loading__heading"><span /><strong>正在打开页面…</strong></div>
      <div className="route-loading__hero" />
      <div className="route-loading__grid"><span /><span /><span /></div>
    </section>
  );
}
