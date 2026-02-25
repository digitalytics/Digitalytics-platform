'use client';

import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Bot, User } from 'lucide-react';

interface Segment {
  role: string;
  content: string;
  timestamp?: number;
}

interface TranscriptViewerProps {
  transcriptObject: Segment[] | null | undefined;
  transcriptText?: string | null;
}

export function TranscriptViewer({ transcriptObject, transcriptText }: TranscriptViewerProps) {
  if (transcriptObject && transcriptObject.length > 0) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Transcript</h2>
        <motion.div
          className="space-y-3 max-h-[500px] overflow-y-auto pr-1"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {transcriptObject.map((segment, idx) => {
            const isAgent = segment.role === 'agent';
            return (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className={cn('flex gap-3', isAgent ? 'flex-row' : 'flex-row-reverse')}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                    isAgent
                      ? 'bg-[#004D3E] text-white'
                      : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {isAgent ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                    isAgent
                      ? 'bg-[#004D3E]/8 text-gray-800 rounded-tl-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tr-sm'
                  )}
                >
                  <p className="leading-relaxed">{segment.content}</p>
                  {segment.timestamp && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(segment.timestamp * 1000).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </Card>
    );
  }

  if (transcriptText) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Transcript</h2>
        <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
          {transcriptText}
        </pre>
      </Card>
    );
  }

  return null;
}
