import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="font-display text-3xl">Page not found</h1>
      <Link to="/" className="mt-4 inline-block underline">Go to the upload page</Link>
    </div>
  )
}