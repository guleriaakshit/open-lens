
import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  // Mouse parallax logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      // Normalize -1 to 1
      mouseX.set((clientX / innerWidth) * 2 - 1);
      mouseY.set((clientY / innerHeight) * 2 - 1);
  };
  
  // Smooth out the mouse movement
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Logo layer transforms
  const logoX = useTransform(smoothX, [-1, 1], [-15, 15]);
  const logoY = useTransform(smoothY, [-1, 1], [-15, 15]);
  
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    },
    exit: {
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    }
  };

  return (
    <motion.div 
        ref={ref}
        onMouseMove={handleMouseMove}
        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
        transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
        className="absolute inset-0 h-full w-full bg-transparent text-zinc-900 dark:text-zinc-100 font-light overflow-hidden flex flex-col items-center justify-center z-20"
    >
      {/* Background is now handled by App.tsx to avoid glitching during transition */}

      {/* --- HERO SECTION --- */}
      <section className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-8 md:py-12 w-full h-full">
        
        <motion.div 
          initial="initial"
          animate="animate"
          exit="exit"
          variants={staggerContainer}
          className="flex flex-col items-center w-full max-w-lg mx-auto"
        >
          {/* Logo/Icon with Parallax */}
          <motion.div variants={fadeInUp} className="mb-8 md:mb-12 relative preserve-3d">
              <motion.div 
                style={{ x: logoX, y: logoY }}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-zinc-300 dark:border-zinc-800 flex items-center justify-center bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-2xl relative z-10"
              >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-zinc-400 dark:border-zinc-700 flex items-center justify-center">
                     <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
                  </div>
              </motion.div>
          </motion.div>

          {/* Brand */}
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-9xl font-logo tracking-tight mb-6 md:mb-8 text-center text-zinc-900 dark:text-white leading-[0.9] select-none">
            Open<span className="italic font-display text-zinc-600 dark:text-zinc-400">Lens</span>
          </motion.h1>
          
          <motion.div variants={fadeInUp} className="flex items-center gap-4 mb-12 md:mb-16 opacity-80">
            <div className="h-px w-6 md:w-8 bg-zinc-400 dark:bg-zinc-600" />
            <p className="text-[10px] md:text-base font-mono uppercase tracking-[0.3em] md:tracking-[0.4em] text-zinc-500 dark:text-zinc-500 text-center whitespace-nowrap">
              The Archive of Open Source
            </p>
            <div className="h-px w-6 md:w-8 bg-zinc-400 dark:bg-zinc-600" />
          </motion.div>

          {/* Enter Button */}
          <motion.button 
            variants={fadeInUp}
            onClick={onEnter}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center gap-4 px-10 md:px-12 py-4 md:py-5 bg-zinc-900 dark:bg-white text-zinc-50 dark:text-zinc-900 font-medium tracking-widest uppercase text-[10px] md:text-xs transition-all duration-300 shadow-lg hover:shadow-2xl overflow-hidden rounded-sm"
          >
            <span className="relative z-10">Enter Archive</span>
            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
            <div className="absolute inset-0 bg-zinc-800 dark:bg-zinc-200 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
          </motion.button>
        </motion.div>
      </section>
    </motion.div>
  );
};

export default Landing;
