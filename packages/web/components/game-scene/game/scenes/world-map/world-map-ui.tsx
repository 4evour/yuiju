import type Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetchHomeSummary, HOME_SUMMARY_ENDPOINT } from "@/lib/api/home";
import {
  WORLD_MAP_CHARACTER_LOCATION_CHANGE_EVENT,
  WORLD_MAP_MESSAGE_EVENT,
  WORLD_MAP_UNAVAILABLE_MESSAGE,
} from "./world-map-constant";
import styles from "./world-map-ui.module.css";

const UNAVAILABLE_MESSAGE_DURATION = 2500;

interface WorldMapUiProps {
  game: Phaser.Game;
}

export function WorldMapUi({ game }: WorldMapUiProps) {
  const [unavailableMessageVisible, setUnavailableMessageVisible] = useState(false);
  const unavailableMessageTimeoutRef = useRef<number | undefined>(undefined);
  const { data: homeData } = useSWR(HOME_SUMMARY_ENDPOINT, fetchHomeSummary, {
    refreshInterval: 30 * 1000,
  });

  useEffect(() => {
    if (!homeData?.status?.location) {
      return;
    }

    game.events.emit(WORLD_MAP_CHARACTER_LOCATION_CHANGE_EVENT, homeData.status.location);
  }, [homeData, game]);

  useEffect(() => {
    const showUnavailableMessage = () => {
      setUnavailableMessageVisible(true);
      if (unavailableMessageTimeoutRef.current !== undefined) {
        window.clearTimeout(unavailableMessageTimeoutRef.current);
      }
      unavailableMessageTimeoutRef.current = window.setTimeout(() => {
        setUnavailableMessageVisible(false);
        unavailableMessageTimeoutRef.current = undefined;
      }, UNAVAILABLE_MESSAGE_DURATION);
    };

    game.events.on(WORLD_MAP_MESSAGE_EVENT, showUnavailableMessage);
    return () => {
      game.events.off(WORLD_MAP_MESSAGE_EVENT, showUnavailableMessage);
      if (unavailableMessageTimeoutRef.current !== undefined) {
        window.clearTimeout(unavailableMessageTimeoutRef.current);
      }
    };
  }, [game]);

  return unavailableMessageVisible ? (
    <output className={styles.unavailableMessage}>{WORLD_MAP_UNAVAILABLE_MESSAGE}</output>
  ) : null;
}
