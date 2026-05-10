'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EXAMPLES = [
  "find startups needing leads",
  "extract emails from Reddit",
  "get SaaS customers fast",
  "AI lead generation tool",
  "find buyers in my niche"
];

const SUGGESTIONS = [
  "find real estate agents looking for CRM",
  "extract emails from r/Entrepreneur",
  "find Shopify store owners complaining about costs"
];

export default function AnimatedSearchBar() {
  const router = useRouter();
  const [placeholder, setPlaceholder] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (isFocused) return; // Stop animation when focused

    let typingTimer;
    const currentExample = EXAMPLES[exampleIndex];
    
    if (isDeleting) {
      if (placeholder === "") {
        setIsDeleting(false);
        setExampleIndex((prev) => (prev + 1) % EXAMPLES.length);
        typingTimer = setTimeout(() => {}, 500); // pause before typing next
      } else {
        typingTimer = setTimeout(() => {
          setPlaceholder(currentExample.substring(0, placeholder.length - 1));
        }, 40); // delete speed
      }
    } else {
      if (placeholder === currentExample) {
        typingTimer = setTimeout(() => setIsDeleting(true), 2500); // pause when full
      } else {
        typingTimer = setTimeout(() => {
          setPlaceholder(currentExample.substring(0, placeholder.length + 1));
        }, 80); // typing speed
      }
    }

    return () => clearTimeout(typingTimer);
  }, [placeholder, isDeleting, exampleIndex, isFocused]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    router.push(`/dashboard?q=${encodeURIComponent(inputValue)}`);
  };

  return (
    <div className="w-full max-w-2xl relative mb-10 mt-4 z-20">
      <form onSubmit={handleSubmit} className="relative group">
        <div className={`absolute inset-0 bg-primary/20 rounded-full blur-xl transition-all duration-500 ${isFocused ? 'opacity-100 scale-105' : 'opacity-0 group-hover:opacity-50'}`}></div>
        <div className={`relative flex items-center bg-white border ${isFocused ? 'border-primary ring-2 ring-primary/20 shadow-xl shadow-primary/10' : 'border-gray-200 shadow-md'} rounded-full p-2 pl-6 transition-all duration-300`}>
          <span className="material-symbols-outlined text-gray-400 mr-2 text-2xl transition-colors">search</span>
          <div className="relative flex-1 h-10 flex items-center">
            {/* We overlay the input on top of the placeholder to handle the blinking cursor cleanly if we want, but standard placeholder is fine */}
            <input
              type="text"
              className="w-full h-full bg-transparent border-none outline-none text-gray-900 text-lg placeholder-gray-400"
              placeholder={isFocused ? "Try 'find buyers in my niche'..." : placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            />
            {/* Custom blinking cursor if we want, but native input is safer. Using placeholder gives native blink. */}
            {!isFocused && placeholder !== EXAMPLES[exampleIndex] && !isDeleting && (
              <span className="absolute left-0 pointer-events-none text-transparent" style={{ left: `${placeholder.length}ch` }}>|</span>
            )}
          </div>
          <button 
            type="submit"
            className="bg-black text-white px-6 py-3.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors ml-2 flex items-center gap-2 shrink-0"
          >
            Generate Leads
            <span className="material-symbols-outlined text-sm hidden sm:inline">auto_awesome</span>
          </button>
        </div>
      </form>

      {/* Suggestion Dropdown */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top duration-200">
          <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Try searching for...</span>
          </div>
          <ul className="p-2">
            {SUGGESTIONS.map((sug, i) => (
              <li key={i}>
                <button 
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-xl text-gray-700 text-sm font-medium transition-colors flex items-center gap-3 group"
                  onClick={() => {
                    setInputValue(sug);
                    router.push(`/dashboard?q=${encodeURIComponent(sug)}`);
                  }}
                >
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors text-[20px]">search</span>
                  {sug}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
