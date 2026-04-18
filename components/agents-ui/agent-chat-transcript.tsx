'use client';

import { type ComponentProps } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Streamdown } from 'streamdown';
import { type AgentState, type ReceivedMessage } from '@livekit/components-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { cn } from '@/lib/shadcn/utils';

export interface AgentChatTranscriptProps extends ComponentProps<'div'> {
  agentState?: AgentState;
  messages?: ReceivedMessage[];
  className?: string;
}

function SpeakerTag({ from }: { from: 'agent' | 'user' }) {
  const label = from === 'agent' ? '[JUTRO]' : '[TY]';
  const color = from === 'agent' ? 'var(--color-mint)' : 'var(--color-coral)';

  return (
    <span
      className="w-[72px] shrink-0 font-mono text-[16px] leading-6 tracking-[0.12em] uppercase"
      style={{ color }}
    >
      {label}
    </span>
  );
}

function TerminalMessage({
  from,
  message,
  time,
  isLast,
}: {
  from: 'agent' | 'user';
  message: string;
  time: string;
  isLast: boolean;
}) {
  const textColor = from === 'agent' ? 'var(--foreground)' : 'var(--color-light-mint)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group flex w-full items-start gap-3 py-2"
      title={time}
    >
      <SpeakerTag from={from} />
      <div
        className="flex-1 font-mono text-[18px] leading-[1.55] tracking-[0.01em]"
        style={{ color: from === 'user' ? 'var(--color-coral)' : textColor }}
      >
        <Streamdown className="[&_p]:my-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {message}
        </Streamdown>
        {isLast && from === 'agent' && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[18px] w-[10px] align-[-3px]"
            style={{
              background: 'var(--color-mint)',
              animation: 'cursorBlink 1s steps(1) infinite',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-3 py-2"
    >
      <SpeakerTag from="agent" />
      <div className="flex items-center gap-1 pt-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block size-[6px]"
            style={{
              background: 'var(--color-mint)',
              animation: `portalPulse 1.1s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function AgentChatTranscript({
  agentState,
  messages = [],
  className,
  ...props
}: AgentChatTranscriptProps) {
  const lastAgentIndex = messages.reduce(
    (acc, msg, i) => (msg.from?.isLocal === false ? i : acc),
    -1
  );

  return (
    <Conversation className={className} {...props}>
      <ConversationContent className="px-6 md:px-8">
        <div className="mx-auto max-w-2xl">
          <div
            className="mb-3 font-mono text-[11px] tracking-[0.3em] uppercase opacity-60"
            style={{ color: 'var(--color-mint)' }}
          >
            {'> PORTAL CZASU · LOG ROZMOWY'}
          </div>
          {messages.map((m, i) => {
            const locale = typeof navigator !== 'undefined' ? navigator.language : 'pl-PL';
            const time = new Date(m.timestamp).toLocaleTimeString(locale, { timeStyle: 'full' });
            const from: 'agent' | 'user' = m.from?.isLocal ? 'user' : 'agent';
            return (
              <TerminalMessage
                key={m.id}
                from={from}
                message={m.message}
                time={time}
                isLast={i === lastAgentIndex && from === 'agent'}
              />
            );
          })}
          <AnimatePresence>{agentState === 'thinking' && <ThinkingIndicator />}</AnimatePresence>
        </div>
      </ConversationContent>
      <ConversationScrollButton
        className={cn(
          'border border-[color:var(--color-mint)]/40 bg-[color:var(--color-soft-purple)] text-[color:var(--color-mint)] hover:bg-[color:var(--color-purple)]'
        )}
      />
    </Conversation>
  );
}
