export function buildSatoriGroupSessionKey(platform: string, channelId: string): string {
  return `group:${platform}:${channelId}`;
}

export function buildSatoriPrivateSessionKey(platform: string, channelId: string): string {
  return `private:${platform}:${channelId}`;
}
