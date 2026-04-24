import { NavLink } from 'react-router-dom'
import { FaBars } from 'react-icons/fa'
import HeaderStatus from '../HeaderStatus'
import ThemeToggle from '../ThemeToggle'
import { useActiveUser } from '../../hooks/useActiveUser'

export default function HeaderBar() {
  const { activeUser } = useActiveUser()

  const dashboardPath = activeUser ? `/dashboard/${activeUser.role}` : '/dashboard/subject'

  const navLinks = (
    <>
      <li>
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active font-bold' : '')}>
          Home
        </NavLink>
      </li>
      {activeUser && (
        <li>
          <NavLink to={dashboardPath} className={({ isActive }) => (isActive ? 'active font-bold' : '')}>
            Dashboard
          </NavLink>
        </li>
      )}
      {activeUser && (
        <li>
          <a
            href="https://open-science-blockchain-economics.github.io/bx-hive/getting-started/overview/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
        </li>
      )}
    </>
  )

  return (
    <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-10 shadow-sm">
      <div className="navbar-start">
        {/* Mobile hamburger menu */}
        <div className="dropdown lg:hidden">
          <label tabIndex={0} className="btn btn-ghost btn-sm">
            <FaBars className="h-5 w-5" />
          </label>
          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-200 rounded-box w-52 z-50">
            {navLinks}
            <div className="divider my-1" />
            <li className="flex items-center px-3 py-1">
              <ThemeToggle />
            </li>
          </ul>
        </div>

        <NavLink to="/" className="text-xl font-bold px-2">
          bx-hive
        </NavLink>

        {/* Desktop horizontal menu */}
        <nav className="hidden lg:flex">
          <ul className="menu menu-horizontal px-1">{navLinks}</ul>
        </nav>
      </div>

      <div className="navbar-end">
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <HeaderStatus />
      </div>
    </header>
  )
}
