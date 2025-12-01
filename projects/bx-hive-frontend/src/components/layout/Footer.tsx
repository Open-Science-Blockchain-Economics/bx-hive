export default function Footer() {
  return (
    <footer className="border-t border-base-300 mt-8">
      <div className="max-w-5xl mx-auto p-4 flex items-center justify-between flex-wrap gap-2">
        <small>&copy; {new Date().getFullYear()} bx-hive</small>
      </div>
    </footer>
  );
}