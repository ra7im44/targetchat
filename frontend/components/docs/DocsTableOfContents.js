import React, { useEffect, useState } from 'react';

export default function DocsTableOfContents() {
    const [headings, setHeadings] = useState([]);
    const [activeId, setActiveId] = useState('');

    useEffect(() => {
        // Extract all h2 and h3 headings from the page
        const elements = Array.from(document.querySelectorAll('h2, h3'));
        const headingData = elements.map((elem) => ({
            id: elem.id,
            text: elem.textContent,
            level: parseInt(elem.tagName.substring(1))
        }));
        setHeadings(headingData);

        // Scroll spy - highlight current section
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-100px 0px -66%' }
        );

        elements.forEach((elem) => observer.observe(elem));

        return () => observer.disconnect();
    }, []);

    if (headings.length === 0) {
        return null;
    }

    return (
        <div className="p-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">On This Page</h4>
            <nav className="space-y-2">
                {headings.map((heading) => (
                    <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={`block text-sm transition-colors ${heading.level === 3 ? 'pl-4' : ''
                            } ${activeId === heading.id
                                ? 'text-blue-600 dark:text-blue-400 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(heading.id)?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }}
                    >
                        {heading.text}
                    </a>
                ))}
            </nav>
        </div>
    );
}
