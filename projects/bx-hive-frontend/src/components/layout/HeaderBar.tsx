import { NavLink } from 'react-router-dom';

export default function HeaderBar() {
  return (
    <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-10 shadow-sm">
      <div className="navbar-start">
        <NavLink to="/" className="btn btn-ghost text-xl font-bold">
          bx-hive
        </NavLink>
        <nav className="hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => (isActive ? 'active font-bold' : '')}
              >
                Home
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}