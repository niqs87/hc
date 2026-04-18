'use client';

import { type ComponentProps, useEffect, useMemo, useRef, useState } from 'react';
import { Track } from 'livekit-client';
import {
  ChevronUpIcon,
  Loader,
  LoaderIcon,
  MessageSquareTextIcon,
  MicIcon,
  MicOffIcon,
  MonitorOffIcon,
  MonitorUpIcon,
  SendHorizontal,
  VideoIcon,
  VideoOffIcon,
} from 'lucide-react';
import { type MotionProps, motion } from 'motion/react';
import { Select as SelectPrimitive } from 'radix-ui';
import { useChat, useMaybeRoomContext, useMediaDeviceSelect } from '@livekit/components-react';
import { AgentDisconnectButton } from '@/components/agents-ui/agent-disconnect-button';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
  type UseInputControlsProps,
  useInputControls,
  usePublishPermissions,
} from '@/hooks/agents-ui/use-agent-control-bar';
import { cn } from '@/lib/shadcn/utils';

type TileTone = 'mint' | 'coral' | 'soft';

interface JutraControlTileProps {
  icon: React.ReactNode;
  label: string;
  pressed: boolean;
  pending?: boolean;
  disabled?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /**
   * What color to show when the tile is in its "on" state.
   * - mint:  active / broadcasting (mic, camera, screen)
   * - coral: active alarm/accent (chat open)
   * - soft:  secondary neutral
   */
  activeTone?: TileTone;
  ariaLabel: string;
  title?: string;
}

function JutraControlTile({
  icon,
  label,
  pressed,
  pending = false,
  disabled = false,
  onPressedChange,
  activeTone = 'mint',
  ariaLabel,
  title,
}: JutraControlTileProps) {
  const active = pressed && !pending;

  // Filled (active) palette
  const activeBg = activeTone === 'coral' ? 'var(--color-coral)' : 'var(--color-mint)';
  const activeShadow =
    activeTone === 'coral' ? 'var(--color-dark-coral)' : 'var(--color-dark-mint)';

  // Outline (inactive / muted) palette — always coral per design system §2
  const inactiveBorder = 'var(--color-coral)';
  const inactiveShadow = 'var(--color-dark-coral)';

  const tileStyle: React.CSSProperties = active
    ? {
        background: activeBg,
        borderColor: activeBg,
        color: 'var(--color-midnight)',
        ['--tile-shadow' as string]: activeShadow,
      }
    : {
        background: 'transparent',
        borderColor: inactiveBorder,
        color: inactiveBorder,
        ['--tile-shadow' as string]: inactiveShadow,
      };

  return (
    <Toggle
      pressed={pressed}
      disabled={disabled || pending}
      onPressedChange={onPressedChange}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      data-active={active ? 'true' : 'false'}
      className={cn(
        'pixel-tile clip-pixel-4 relative h-16 min-w-[86px] flex-col gap-1 px-3 py-2',
        'border-2 select-none'
      )}
      style={tileStyle}
    >
      <span className="flex items-center justify-center [&_svg]:size-5">
        {pending ? <LoaderIcon className="animate-spin" /> : icon}
      </span>
      <span className="font-mono text-[11px] leading-none tracking-[0.22em] uppercase">
        {label}
      </span>
    </Toggle>
  );
}

interface JutraDeviceSelectProps {
  kind: MediaDeviceKind;
  tone: 'mint' | 'coral';
  ariaLabel: string;
  onActiveDeviceChange?: (deviceId: string) => void;
  onMediaDeviceError?: (error: Error) => void;
}

function JutraDeviceSelect({
  kind,
  tone,
  ariaLabel,
  onActiveDeviceChange,
  onMediaDeviceError,
}: JutraDeviceSelectProps) {
  const room = useMaybeRoomContext();
  const [open, setOpen] = useState(false);
  const [requestPermissions, setRequestPermissions] = useState(false);
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    room,
    kind,
    requestPermissions,
    onError: onMediaDeviceError,
  });

  const filteredDevices = useMemo(() => devices.filter((d) => d.deviceId !== ''), [devices]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setRequestPermissions(true);
  };

  const handleValueChange = (deviceId: string) => {
    setActiveMediaDevice(deviceId);
    onActiveDeviceChange?.(deviceId);
  };

  if (filteredDevices.length < 2) return null;

  const accent = tone === 'mint' ? 'var(--color-mint)' : 'var(--color-coral)';
  const accentShadow = tone === 'mint' ? 'var(--color-dark-mint)' : 'var(--color-dark-coral)';

  return (
    <SelectPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      value={activeDeviceId}
      onValueChange={handleValueChange}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          'pixel-tile clip-pixel-4 flex h-16 w-11 items-center justify-center border-2'
        )}
        style={{
          background: 'transparent',
          borderColor: accent,
          color: accent,
          ['--tile-shadow' as string]: accentShadow,
        }}
      >
        <ChevronUpIcon className="size-4" />
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          side="top"
          align="start"
          sideOffset={10}
          className={cn(
            'jutra-glass clip-pixel-8 z-50 max-h-[260px] min-w-[260px] overflow-hidden',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
          )}
          style={{
            boxShadow: '0 0 0 2px rgba(114,255,169,0.25), 0 20px 60px -20px rgba(13,10,31,0.8)',
          }}
        >
          <div
            className="px-3 pt-1 pb-2 font-mono text-[10px] tracking-[0.3em] uppercase"
            style={{ color: 'var(--color-mint)', opacity: 0.7 }}
          >
            {'> źródło sygnału'}
          </div>
          <SelectPrimitive.Viewport className="max-h-[220px] overflow-y-auto px-1 pb-2">
            {filteredDevices.map((device) => (
              <SelectPrimitive.Item
                key={device.deviceId}
                value={device.deviceId}
                className={cn(
                  'relative flex cursor-pointer items-center gap-2 px-3 py-2 select-none',
                  'font-mono text-[13px] tracking-[0.02em] text-[color:var(--color-light-mint)]',
                  'outline-none',
                  'data-[highlighted]:bg-[color:var(--color-mint)]/12 data-[highlighted]:text-[color:var(--color-mint)]',
                  'data-[state=checked]:text-[color:var(--color-mint)]'
                )}
              >
                <span
                  aria-hidden
                  className="inline-flex size-3 shrink-0 items-center justify-center"
                >
                  <SelectPrimitive.ItemIndicator>
                    <span
                      className="block size-2"
                      style={{
                        background: 'var(--color-mint)',
                        boxShadow: '0 0 6px var(--color-mint)',
                      }}
                    />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>
                  {device.label || 'Urządzenie bez nazwy'}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

const MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      height: 0,
      opacity: 0,
      marginBottom: 0,
    },
    visible: {
      height: 'auto',
      opacity: 1,
      marginBottom: 12,
    },
  },
  initial: 'hidden',
  transition: {
    duration: 0.3,
    ease: 'easeOut',
  },
};

interface AgentChatInputProps {
  chatOpen: boolean;
  onSend?: (message: string) => void;
  className?: string;
}

function AgentChatInput({ chatOpen, onSend = async () => {}, className }: AgentChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string>('');
  const isDisabled = isSending || message.trim().length === 0;

  const handleSend = async () => {
    if (isDisabled) {
      return;
    }

    try {
      setIsSending(true);
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleButtonClick = async () => {
    if (isDisabled) return;
    await handleSend();
  };

  useEffect(() => {
    if (chatOpen) return;
    // when not disabled refocus on input
    inputRef.current?.focus();
  }, [chatOpen]);

  return (
    <div className={cn('mb-3 flex grow items-end gap-2 rounded-md pl-1 text-sm', className)}>
      <textarea
        autoFocus
        ref={inputRef}
        value={message}
        disabled={!chatOpen || isSending}
        placeholder="> napisz co czujesz…"
        onKeyDown={handleKeyDown}
        onChange={(e) => setMessage(e.target.value)}
        className="field-sizing-content max-h-16 min-h-8 flex-1 resize-none py-2 font-mono text-[18px] tracking-[0.02em] text-[color:var(--color-light-mint)] [scrollbar-width:thin] placeholder:text-[color:var(--color-mint)]/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        size="icon"
        type="button"
        disabled={isDisabled}
        variant={isDisabled ? 'secondary' : 'default'}
        title={isSending ? 'Sending...' : 'Send'}
        onClick={handleButtonClick}
        className="self-end disabled:cursor-not-allowed"
      >
        {isSending ? <Loader className="animate-spin" /> : <SendHorizontal />}
      </Button>
    </div>
  );
}

/** Configuration for which controls to display in the AgentControlBar. */
export interface AgentControlBarControls {
  /**
   * Whether to show the leave/disconnect button.
   *
   * @defaultValue true
   */
  leave?: boolean;
  /**
   * Whether to show the camera toggle control.
   *
   * @defaultValue true (if camera publish permission is granted)
   */
  camera?: boolean;
  /**
   * Whether to show the microphone toggle control.
   *
   * @defaultValue true (if microphone publish permission is granted)
   */
  microphone?: boolean;
  /**
   * Whether to show the screen share toggle control.
   *
   * @defaultValue true (if screen share publish permission is granted)
   */
  screenShare?: boolean;
  /**
   * Whether to show the chat toggle control.
   *
   * @defaultValue true (if data publish permission is granted)
   */
  chat?: boolean;
}

export interface AgentControlBarProps extends UseInputControlsProps {
  /**
   * The visual style of the control bar.
   *
   * @default 'default'
   */
  variant?: 'default' | 'outline' | 'livekit';
  /**
   * This takes an object with the following keys: `leave`, `microphone`, `screenShare`, `camera`,
   * `chat`. Each key maps to a boolean value that determines whether the control is displayed.
   *
   * @default
   * {
   *   leave: true,
   *   microphone: true,
   *   screenShare: true,
   *   camera: true,
   *   chat: true,
   * }
   */
  controls?: AgentControlBarControls;
  /**
   * Whether to save user choices.
   *
   * @default true
   */
  saveUserChoices?: boolean;
  /**
   * Whether the agent is connected to a session.
   *
   * @default false
   */
  isConnected?: boolean;
  /**
   * Whether the chat input interface is open.
   *
   * @default false
   */
  isChatOpen?: boolean;
  /** The callback for when the user disconnects. */
  onDisconnect?: () => void;
  /** The callback for when the chat is opened or closed. */
  onIsChatOpenChange?: (open: boolean) => void;
  /** The callback for when a device error occurs. */
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

/**
 * A control bar specifically designed for voice assistant interfaces. Provides controls for
 * microphone, camera, screen share, chat, and disconnect. Includes an expandable chat input for
 * text-based interaction with the agent.
 *
 * @example
 *
 * ```tsx
 * <AgentControlBar
 *   variant="livekit"
 *   isConnected={true}
 *   onDisconnect={() => handleDisconnect()}
 *   controls={{
 *     microphone: true,
 *     camera: true,
 *     screenShare: false,
 *     chat: true,
 *     leave: true,
 *   }}
 * />;
 * ```
 *
 * @extends ComponentProps<'div'>
 */
export function AgentControlBar({
  variant = 'default',
  controls,
  isChatOpen = false,
  isConnected = false,
  saveUserChoices = true,
  onDisconnect,
  onDeviceError,
  onIsChatOpenChange,
  className,
  ...props
}: AgentControlBarProps & ComponentProps<'div'>) {
  const { send } = useChat();
  const publishPermissions = usePublishPermissions();
  const [isChatOpenUncontrolled, setIsChatOpenUncontrolled] = useState(isChatOpen);
  const {
    cameraToggle,
    microphoneToggle,
    screenShareToggle,
    handleAudioDeviceChange,
    handleVideoDeviceChange,
    handleMicrophoneDeviceSelectError,
    handleCameraDeviceSelectError,
  } = useInputControls({
    onDeviceError,
    saveUserChoices,
  });

  const handleSendMessage = async (message: string) => {
    await send(message);
  };

  const visibleControls = {
    leave: controls?.leave ?? true,
    microphone: controls?.microphone ?? publishPermissions.microphone,
    screenShare: controls?.screenShare ?? publishPermissions.screenShare,
    camera: controls?.camera ?? publishPermissions.camera,
    chat: controls?.chat ?? publishPermissions.data,
  };

  const isEmpty = Object.values(visibleControls).every((value) => !value);

  if (isEmpty) {
    console.warn('AgentControlBar: `visibleControls` contains only false values.');
    return null;
  }

  return (
    <div
      aria-label="Voice assistant controls"
      className={cn('jutra-glass clip-pixel-8 flex flex-col px-5 pt-4 pb-5', className)}
      style={{
        boxShadow: '0 0 0 2px rgba(114,255,169,0.25), 0 20px 60px -20px rgba(13,10,31,0.8)',
      }}
      {...props}
    >
      <motion.div
        {...MOTION_PROPS}
        inert={!(isChatOpen || isChatOpenUncontrolled)}
        animate={isChatOpen || isChatOpenUncontrolled ? 'visible' : 'hidden'}
        className="border-input/50 flex w-full items-start overflow-hidden border-b"
      >
        <AgentChatInput
          chatOpen={isChatOpen || isChatOpenUncontrolled}
          onSend={handleSendMessage}
          className={cn(variant === 'livekit' && '[&_button]:rounded-full')}
        />
      </motion.div>

      <div className="flex items-stretch gap-2">
        <div className="flex grow flex-wrap items-stretch gap-2">
          {/* Microphone + device picker */}
          {visibleControls.microphone && (
            <div className="flex items-stretch gap-1">
              <JutraControlTile
                ariaLabel="Przełącz mikrofon"
                title={microphoneToggle.enabled ? 'Wycisz mikrofon' : 'Włącz mikrofon'}
                label={microphoneToggle.enabled ? 'mikrofon' : 'wycisz.'}
                icon={microphoneToggle.enabled ? <MicIcon /> : <MicOffIcon />}
                pressed={microphoneToggle.enabled}
                pending={microphoneToggle.pending}
                disabled={microphoneToggle.pending}
                onPressedChange={microphoneToggle.toggle}
                activeTone="mint"
              />
              <JutraDeviceSelect
                kind="audioinput"
                tone={microphoneToggle.enabled ? 'mint' : 'coral'}
                ariaLabel="Wybierz mikrofon"
                onActiveDeviceChange={handleAudioDeviceChange}
                onMediaDeviceError={handleMicrophoneDeviceSelectError}
              />
            </div>
          )}

          {/* Camera + device picker */}
          {visibleControls.camera && (
            <div className="flex items-stretch gap-1">
              <JutraControlTile
                ariaLabel="Przełącz kamerę"
                title={cameraToggle.enabled ? 'Wyłącz kamerę' : 'Włącz kamerę'}
                label={cameraToggle.enabled ? 'kamera' : 'kam. off'}
                icon={cameraToggle.enabled ? <VideoIcon /> : <VideoOffIcon />}
                pressed={cameraToggle.enabled}
                pending={cameraToggle.pending}
                disabled={cameraToggle.pending}
                onPressedChange={cameraToggle.toggle}
                activeTone="mint"
              />
              <JutraDeviceSelect
                kind="videoinput"
                tone={cameraToggle.enabled ? 'mint' : 'coral'}
                ariaLabel="Wybierz kamerę"
                onActiveDeviceChange={handleVideoDeviceChange}
                onMediaDeviceError={handleCameraDeviceSelectError}
              />
            </div>
          )}

          {/* Screen Share */}
          {visibleControls.screenShare && (
            <JutraControlTile
              ariaLabel="Udostępnij ekran"
              title={screenShareToggle.enabled ? 'Zatrzymaj udostępnianie' : 'Udostępnij ekran'}
              label={screenShareToggle.enabled ? 'ekran' : 'ekran'}
              icon={screenShareToggle.enabled ? <MonitorUpIcon /> : <MonitorOffIcon />}
              pressed={screenShareToggle.enabled}
              pending={screenShareToggle.pending}
              disabled={screenShareToggle.pending}
              onPressedChange={screenShareToggle.toggle}
              activeTone="mint"
            />
          )}

          {/* Transcript */}
          {visibleControls.chat && (
            <JutraControlTile
              ariaLabel="Przełącz transkrypt"
              title={isChatOpen || isChatOpenUncontrolled ? 'Ukryj transkrypt' : 'Pokaż transkrypt'}
              label={isChatOpen || isChatOpenUncontrolled ? 'log on' : 'log'}
              icon={<MessageSquareTextIcon />}
              pressed={isChatOpen || isChatOpenUncontrolled}
              onPressedChange={(state) => {
                if (!onIsChatOpenChange) setIsChatOpenUncontrolled(state);
                else onIsChatOpenChange(state);
              }}
              activeTone="coral"
            />
          )}
        </div>

        {/* Disconnect */}
        {visibleControls.leave && (
          <AgentDisconnectButton
            onClick={onDisconnect}
            disabled={!isConnected}
            className={cn(
              'pixel-tile clip-pixel-4 h-16 min-w-[108px] border-2 px-3 py-2',
              'flex flex-col gap-1 [&_svg]:size-5',
              'font-mono text-[11px] tracking-[0.22em] uppercase'
            )}
            style={{
              background: 'var(--color-coral)',
              borderColor: 'var(--color-coral)',
              color: 'var(--color-midnight)',
              ['--tile-shadow' as string]: 'var(--color-dark-coral)',
            }}
          >
            <span className="hidden md:inline">Zamknij</span>
            <span className="inline md:hidden">Wyjdź</span>
          </AgentDisconnectButton>
        )}
      </div>
    </div>
  );
}
