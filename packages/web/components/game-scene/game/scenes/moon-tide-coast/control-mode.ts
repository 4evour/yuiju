export type GameControlMode = "map" | "character";

export const GAME_CONTROL_MODE_REGISTRY_KEY = "game-control-mode";
export const INITIAL_GAME_CONTROL_MODE: GameControlMode = "character";
export const CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY = "camera-follow-character";
export const CAMERA_FOLLOW_CHARACTER_REGISTRY_EVENT = `changedata-${CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY}`;
export const INITIAL_CAMERA_FOLLOW_CHARACTER = true;
