import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Clock } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';

interface Program {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  category?: string;
}

interface EPGGuideProps {
  channels: Channel[];
  currentChannel?: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  onClose: () => void;
}

// Simple seeded random for stable program generation
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

const programTitles = [
  'Morning News', 'Breakfast Show', 'Talk Show', 'Documentary',
  'Movie: Action', 'Series Episode', 'Sports Highlights', 'Evening News',
  'Prime Time Movie', 'Late Night Show', 'Music Hour', 'Weather Report',
  'Kids Show', 'Drama Series', 'Comedy Hour', 'News Update'
];

const categories = ['News', 'Entertainment', 'Sports', 'Documentary'];

const generateMockPrograms = (channel: Channel, date: Date): Program[] => {
  const rand = seededRandom(hashString(channel.id + date.toDateString()));
  const programs: Program[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  let currentStart = new Date(startOfDay);
  let programIndex = 0;

  while (currentStart < endOfDay) {
    const duration = (Math.floor(rand() * 4 + 1) * 30) * 60 * 1000; // 30, 60, 90, or 120 mins
    const end = new Date(Math.min(currentStart.getTime() + duration, endOfDay.getTime()));
    const titleIdx = Math.floor(rand() * programTitles.length);
    const catIdx = Math.floor(rand() * categories.length);

    programs.push({
      id: `${channel.id}-${programIndex}`,
      title: programTitles[titleIdx],
      start: new Date(currentStart),
      end,
      description: `${programTitles[titleIdx]} on ${channel.name}`,
      category: categories[catIdx],
    });

    currentStart = end;
    programIndex++;
  }

  return programs;
};

const SLOT_WIDTH = 120; // px per 30 min

export const EPGGuide = ({
  channels,
  currentChannel,
  onChannelSelect,
  onClose,
}: EPGGuideProps) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [now, setNow] = useState(new Date());
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoveredProgram, setHoveredProgram] = useState<Program | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const visibleChannels = useMemo(() => channels.slice(0, 20), [channels]);

  const channelPrograms = useMemo(() => {
    const programs = new Map<string, Program[]>();
    visibleChannels.forEach((channel) => {
      programs.set(channel.id, generateMockPrograms(channel, selectedDate));
    });
    return programs;
  }, [visibleChannels, selectedDate]);

  const timeSlots = useMemo(() => {
    const slots: Date[] = [];
    const start = new Date(selectedDate);
    for (let i = 0; i < 48; i++) {
      slots.push(new Date(start.getTime() + i * 30 * 60 * 1000));
    }
    return slots;
  }, [selectedDate]);

  // Scroll to current time on mount
  useEffect(() => {
    if (timelineRef.current) {
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const scrollPos = (nowMins / 30) * SLOT_WIDTH - 200;
      timelineRef.current.scrollLeft = Math.max(0, scrollPos);
    }
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getProgramStyle = (program: Program) => {
    const startOfDay = new Date(selectedDate);
    const offsetMs = program.start.getTime() - startOfDay.getTime();
    const durationMs = program.end.getTime() - program.start.getTime();
    const offsetMins = offsetMs / 60000;
    const durationMins = durationMs / 60000;
    const left = (offsetMins / 30) * SLOT_WIDTH;
    const width = Math.max((durationMins / 30) * SLOT_WIDTH - 4, 40);
    return { left, width };
  };

  const isCurrentProgram = (program: Program) =>
    now >= program.start && now < program.end;

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const getCurrentTimeLeft = () => {
    if (!isToday) return -999;
    const startOfDay = new Date(selectedDate);
    const offsetMins = (now.getTime() - startOfDay.getTime()) / 60000;
    return (offsetMins / 30) * SLOT_WIDTH;
  };

  const totalWidth = 48 * SLOT_WIDTH;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-background border-t border-border/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-card flex items-center justify-center hover:bg-card/80"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Program Guide</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
            className="w-8 h-8 rounded-full bg-card flex items-center justify-center hover:bg-card/80"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-foreground font-medium min-w-[120px] text-center">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
            className="w-8 h-8 rounded-full bg-card flex items-center justify-center hover:bg-card/80"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{formatTime(now)}</span>
        </div>
      </div>

      {/* EPG Grid */}
      <div className="flex max-h-[400px]">
        {/* Channel Column */}
        <div className="w-48 flex-shrink-0 border-r border-border/30 overflow-hidden">
          <div className="h-10 border-b border-border/30 bg-card/50" />
          {visibleChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel)}
              className={`w-full flex items-center gap-3 px-3 py-2 h-16 border-b border-border/20 hover:bg-card/50 transition-colors ${
                currentChannel?.id === channel.id ? 'bg-card border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {channel.logo ? (
                  <img src={channel.logo} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{channel.name.charAt(0)}</span>
                )}
              </div>
              <span className="text-sm text-foreground truncate">{channel.name}</span>
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="flex-1 overflow-x-auto overflow-y-hidden mi-scrollbar">
          <div className="relative" style={{ width: totalWidth }}>
            {/* Time slots header */}
            <div className="flex h-10 border-b border-border/30 bg-card/50 sticky top-0 z-20">
              {timeSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 px-2 flex items-center border-r border-border/20 text-xs text-muted-foreground"
                  style={{ width: SLOT_WIDTH }}
                >
                  {formatTime(slot)}
                </div>
              ))}
            </div>

            {/* Current time indicator */}
            {isToday && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                style={{ left: getCurrentTimeLeft() }}
              >
                <div className="w-3 h-3 rounded-full bg-primary -ml-[5px] -mt-0.5" />
              </div>
            )}

            {/* Program rows */}
            {visibleChannels.map((channel) => {
              const programs = channelPrograms.get(channel.id) || [];
              return (
                <div key={channel.id} className="relative h-16 border-b border-border/20">
                  {programs.map((program) => {
                    const { left, width } = getProgramStyle(program);
                    const isCurrent = isCurrentProgram(program);

                    return (
                      <button
                        key={program.id}
                        onClick={() => onChannelSelect(channel)}
                        onMouseEnter={() => setHoveredProgram(program)}
                        onMouseLeave={() => setHoveredProgram(null)}
                        className={`absolute top-1 bottom-1 rounded-lg px-2 py-1 text-left transition-all overflow-hidden ${
                          isCurrent
                            ? 'bg-primary/20 border border-primary/40 hover:bg-primary/30'
                            : 'bg-card/80 border border-border/30 hover:bg-card'
                        }`}
                        style={{ left, width }}
                      >
                        <p className={`text-xs font-medium truncate ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                          {program.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {formatTime(program.start)} - {formatTime(program.end)}
                        </p>
                        {isCurrent && (
                          <div className="absolute top-1 right-1">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hovered Program Info */}
      {hoveredProgram && (
        <div className="px-4 py-3 bg-card/50 border-t border-border/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-semibold">{hoveredProgram.title}</h3>
              <p className="text-muted-foreground text-sm">
                {formatTime(hoveredProgram.start)} - {formatTime(hoveredProgram.end)}
                {hoveredProgram.category && ` • ${hoveredProgram.category}`}
              </p>
              {hoveredProgram.description && (
                <p className="text-muted-foreground text-sm mt-1">{hoveredProgram.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
