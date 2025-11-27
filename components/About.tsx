
import React from 'react';
import { ArrowLeft, Database, Search, Shield, Zap, Palette, Globe } from 'lucide-react';

interface AboutProps {
  onReturn: () => void;
}

const About: React.FC<AboutProps> = ({ onReturn }) => {
  return (
    <div className="w-full min-h-[calc(100vh-96px)] bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-start pt-12 md:pt-20 pb-20 px-6 overflow-y-auto">
      <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Navigation */}
        <button 
          onClick={onReturn}
          className="group flex items-center gap-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all duration-300 mb-12"
        >
            <div className="p-2 rounded-full border border-transparent group-hover:border-zinc-300 dark:group-hover:border-white/10 group-hover:bg-zinc-200 dark:group-hover:bg-white/5 transition-all">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Return to Explorer</span>
        </button>

        {/* Header */}
        <div className="mb-20">
          <h1 className="text-5xl md:text-7xl font-display italic text-zinc-900 dark:text-white mb-8 tracking-tight">
            About OpenLens
          </h1>
          <p className="text-xl md:text-2xl font-light text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl border-l-2 border-zinc-200 dark:border-zinc-800 pl-6">
            A museum-quality interface for the open source ecosystem, designed to make exploring GitHub repositories a refined, aesthetic experience.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 mb-2">
              <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif tracking-wide uppercase">Real Trending Data</h3>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
              Unlike standard API consumers, OpenLens utilizes a specialized proxy to fetch the exact "Trending" feed from GitHub, ensuring a 1-to-1 match with the official website's daily trends.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 mb-2">
              <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif tracking-wide uppercase">IndexedDB Caching</h3>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
              Built for speed and resilience. The application implements a robust local database strategy, caching thousands of artifacts to minimize API rate limits and enable instant navigation for previously visited queries.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 mb-2">
              <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif tracking-wide uppercase">Museum Aesthetic</h3>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
              Every pixel is calibrated for high-contrast legibility and visual hierarchy. We strictly adhere to a monochromatic palette using Zinc scales, custom serif typography, and glassmorphism to elevate code to art.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 mb-2">
              <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif tracking-wide uppercase">Deep Inspection</h3>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
              Preview README documentation directly within the card interface. The HTML is sanitized and restyled in real-time to match the application's dark mode or light mode theme seamlessly.
            </p>
          </div>

        </div>

        <div className="mt-24 pt-12 border-t border-zinc-200 dark:border-zinc-800 text-center md:text-left">
           <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
             OpenLens v1.2.0 &mdash; Crafted with React, Tailwind, and Passion.
           </p>
        </div>

      </div>
    </div>
  );
};

export default About;
