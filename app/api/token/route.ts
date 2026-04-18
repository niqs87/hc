import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export const revalidate = 0;

function stringifyMetadata(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') return raw.length ? raw : undefined;
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function POST(req: Request) {
  // Hackathon: no separate auth layer on this route; LiveKit credentials stay server-side only.
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    const body = await req.json().catch(() => ({}));
    const roomConfig = body?.room_config
      ? RoomConfiguration.fromJson(body.room_config, { ignoreUnknownFields: true })
      : new RoomConfiguration();

    const participantMetadata = stringifyMetadata(body?.participant_metadata);
    const participantIdentity =
      typeof body?.participant_identity === 'string' && body.participant_identity.length > 0
        ? body.participant_identity
        : `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const participantName =
      typeof body?.participant_name === 'string' && body.participant_name.length > 0
        ? body.participant_name
        : 'user';
    const roomName =
      typeof body?.room_name === 'string' && body.room_name.length > 0
        ? body.room_name
        : `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    const userInfo: AccessTokenOptions = {
      identity: participantIdentity,
      name: participantName,
      ...(participantMetadata ? { metadata: participantMetadata } : {}),
    };

    const participantToken = await createParticipantToken(userInfo, roomName, roomConfig);

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName,
      participantToken,
    };
    const headers = new Headers({
      'Cache-Control': 'no-store',
    });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  roomConfig: RoomConfiguration | undefined
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (roomConfig) {
    at.roomConfig = roomConfig;
  }

  return at.toJwt();
}
