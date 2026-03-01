import { Link } from 'react-router-dom'

interface ErrorMessageProps {
  message: string
  backTo?: string
  backLabel?: string
}

export default function ErrorMessage({ message, backTo = '/dashboard/experimenter', backLabel = 'Back to Dashboard' }: ErrorMessageProps) {
  return (
    <div className="text-center py-12">
      <p className="text-error mb-4">{message}</p>
      <Link to={backTo} className="btn btn-primary">
        {backLabel}
      </Link>
    </div>
  )
}
