
export function FooterFun() {
  return (
    <footer className="py-4 bg-gray-100 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        {/* <div className="flex flex-col md:flex-row justify-between items-center"> */}
        <div className="flex flex-col md:flex-row justify-center items-center">
          <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
            &copy; {new Date().getFullYear()} Reactives.fun. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            {/* Commented out links */}
            {/* <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">
              Twitter
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">
              GitHub
            </a>
            <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">
              LinkedIn
            </a> */}
          </div>
        </div>
      </div>
    </footer>
  );
}