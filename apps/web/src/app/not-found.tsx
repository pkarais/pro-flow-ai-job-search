import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state-page">
      <p className="eyebrow">Page not found</p>
      <h1>That workspace does not exist yet.</h1>
      <p>Return home to continue from your recommended next step.</p>
      <Link className="button button--primary" href="/">Return home</Link>
    </div>
  );
}
