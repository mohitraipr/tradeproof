"use client";

import { useEffect, useState } from "react";

const loadingSteps = [
  "Connecting to data sources...",
  "Fetching product details from Myntra...",
  "Extracting bestseller signals...",
  "Running AI analysis...",
  "Generating rankings...",
];

export function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % loadingSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card p-8">
      <div className="flex flex-col items-center justify-center py-8">
        {/* Animated neural network */}
        <div className="relative mb-8">
          <svg width="160" height="120" viewBox="0 0 160 120" className="overflow-visible">
            {/* Connection lines with animation */}
            <g className="opacity-30">
              <line x1="80" y1="20" x2="40" y2="60" stroke="var(--accent-cyan)" strokeWidth="1">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />
              </line>
              <line x1="80" y1="20" x2="120" y2="60" stroke="var(--accent-cyan)" strokeWidth="1">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" begin="0.3s" />
              </line>
              <line x1="40" y1="60" x2="60" y2="100" stroke="var(--accent-violet)" strokeWidth="1">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" begin="0.6s" />
              </line>
              <line x1="40" y1="60" x2="100" y2="100" stroke="var(--accent-violet)" strokeWidth="1">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" begin="0.9s" />
              </line>
              <line x1="120" y1="60" x2="60" y2="100" stroke="var(--accent-violet)" strokeWidth="1">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" begin="1.2s" />
              </line>
              <line x1="120" y1="60" x2="100" y2="100" stroke="var(--accent-violet)" strokeWidth="1">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" begin="1.5s" />
              </line>
            </g>

            {/* Nodes */}
            <g>
              {/* Input layer */}
              <circle cx="80" cy="20" r="12" fill="var(--bg-elevated)" stroke="var(--accent-cyan)" strokeWidth="2">
                <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="80" cy="20" r="4" fill="var(--accent-cyan)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Hidden layer */}
              <circle cx="40" cy="60" r="10" fill="var(--bg-elevated)" stroke="var(--accent-violet)" strokeWidth="2">
                <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" begin="0.3s" />
              </circle>
              <circle cx="40" cy="60" r="3" fill="var(--accent-violet)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin="0.3s" />
              </circle>

              <circle cx="120" cy="60" r="10" fill="var(--bg-elevated)" stroke="var(--accent-violet)" strokeWidth="2">
                <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" begin="0.6s" />
              </circle>
              <circle cx="120" cy="60" r="3" fill="var(--accent-violet)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin="0.6s" />
              </circle>

              {/* Output layer */}
              <circle cx="60" cy="100" r="10" fill="var(--bg-elevated)" stroke="var(--accent-rose)" strokeWidth="2">
                <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" begin="0.9s" />
              </circle>
              <circle cx="60" cy="100" r="3" fill="var(--accent-rose)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin="0.9s" />
              </circle>

              <circle cx="100" cy="100" r="10" fill="var(--bg-elevated)" stroke="var(--accent-rose)" strokeWidth="2">
                <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" begin="1.2s" />
              </circle>
              <circle cx="100" cy="100" r="3" fill="var(--accent-rose)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin="1.2s" />
              </circle>
            </g>

            {/* Data particles flowing */}
            <circle r="3" fill="var(--accent-cyan)">
              <animateMotion dur="2s" repeatCount="indefinite" path="M80,20 Q60,40 40,60 Q50,80 60,100" />
              <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="var(--accent-cyan)">
              <animateMotion dur="2s" repeatCount="indefinite" begin="0.5s" path="M80,20 Q100,40 120,60 Q110,80 100,100" />
              <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" begin="0.5s" />
            </circle>
          </svg>
        </div>

        <h3 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-2">
          AI Agent Working
        </h3>

        {/* Current step */}
        <div className="h-6 flex items-center">
          <p className="text-[var(--accent-cyan)] text-sm font-medium animate-pulse">
            {loadingSteps[currentStep]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mt-6">
          {loadingSteps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "bg-[var(--accent-cyan)] scale-125"
                  : i < currentStep
                  ? "bg-[var(--accent-violet)]"
                  : "bg-[var(--border-subtle)]"
              }`}
            />
          ))}
        </div>

        {/* Shimmer cards preview */}
        <div className="w-full max-w-md mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="shimmer h-20 rounded-xl"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
