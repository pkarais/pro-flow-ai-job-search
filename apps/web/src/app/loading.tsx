export default function Loading() {
  return (
    <div className="dashboard" aria-busy="true" aria-label="Loading your career workspace">
      <div className="loading-block loading-block--hero" />
      <div className="stats-grid">
        {[0, 1, 2, 3].map((item) => <div className="loading-block" key={item} />)}
      </div>
      <div className="loading-block loading-block--panel" />
    </div>
  );
}
