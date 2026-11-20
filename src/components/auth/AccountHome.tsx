import { Navigate } from 'react-router-dom'
import useUserStore from '../../store/user'
import { isSuperAdmin } from '../../utils/upms'

export default function AccountHome() {
  const session = useUserStore((state) => state.session)
  if (!session) return <Navigate to="/auth/login" replace />
  return <Navigate to={isSuperAdmin(session) ? '/users' : '/account/security'} replace />
}
