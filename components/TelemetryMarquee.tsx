'use client';

import React from 'react';
import { Cloud, Award, Users, Trophy, GitBranch, Cpu, Zap } from 'lucide-react';

export default function TelemetryMarquee({ activeEventTitle }: { activeEventTitle?: string }) {
  const featuredTitle = activeEventTitle || "SYNORA '26";
  const items = [
    { text: `${featuredTitle} · Featured event`, icon: Trophy },
    { text: 'Azure & Cloud Computing', icon: Cloud },
    { text: 'Applied AI & Cognitive Services', icon: Cpu },
    { text: '1,200+ Student members', icon: Users },
    { text: 'Hackathons & technical workshops', icon: Zap },
    { text: 'Open-source contributions', icon: GitBranch },
    { text: 'Microsoft Learn Student Ambassadors', icon: Award },
  ];

  return (
    <div
      style={{
        overflow: 'hidden',
        background: 'var(--bg-soft)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        color: 'var(--text-body)',
        padding: '10px 0',
        whiteSpace: 'nowrap',
        position: 'relative',
      }}
    >
      <div
        className="marquee-track"
        style={{
          display: 'inline-flex',
          gap: '32px',
          animation: 'marquee 35s linear infinite',
        }}
      >
        {/* Render items twice for seamless infinite scroll */}
        {[...items, ...items].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontFamily: 'var(--font-family)',
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}
            >
              <Icon size={13} color="var(--brand)" />
              <span style={{ color: 'var(--text-body)' }}>{item.text}</span>
              <span style={{ color: 'var(--border)', marginLeft: '16px' }}>&bull;</span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
