export default function Badge({ tone = 'neu', children }) {
  return <span className={`b ${tone}`}>{children}</span>;
}
