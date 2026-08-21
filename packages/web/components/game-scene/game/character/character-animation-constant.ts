import characterAtlasMeta from "../../assets/character/sprite-sheets/character-atlas.json";
import characterAtlas from "../../assets/character/sprite-sheets/character-atlas.png";

export const CHARACTER_FRAME_SIZE = 128;

export const CHARACTER_ATLAS = {
  textureKey: "character-atlas",
  source: characterAtlas.src,
  meta: characterAtlasMeta,
} as const;

export const CHARACTER_ANIMATION = characterAtlasMeta.animations;

export const CHARACTER_WINK_ANIMATION_KEYS = [
  CHARACTER_ANIMATION.wink.key,
  CHARACTER_ANIMATION.wink1.key,
];
