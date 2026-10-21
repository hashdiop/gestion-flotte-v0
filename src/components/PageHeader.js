export default function PageHeader({ title, sub, children }) {
  return (
    <div className="top">
      <div className="t">
        <h1>{title}</h1>
        {sub && <span className="sub">{sub}</span>}
      </div>
      {children}
    </div>
  );
}
